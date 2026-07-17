// frontend/src/components/UploadCard.jsx
import React, { useState, useRef, useEffect } from "react";
import { predictImage } from "../api";
import { saveAs } from "file-saver";

// Interactive curtainCompare slider component using clip-path
function SliderCompare({ original, overlay }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let pct = (x / rect.width) * 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    setPosition(pct);
  };

  const handleMouseMove = (e) => {
    if (e.buttons === 1) { // Left mouse drag
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="slider-container"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseDown={(e) => handleMove(e.clientX)}
    >
      <img src={original} alt="True Color Satellite" className="slider-img underlay" />
      <img 
        src={overlay} 
        alt="Grad-CAM Overlay" 
        className="slider-img overlay" 
        style={{ clipPath: `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)` }}
      />
      <div className="slider-handle" style={{ left: `${position}%` }}>
        <div className="slider-handle-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "-2px" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "-2px" }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function UploadCard({ onPredictionSuccess, activeHistoryItem, clearActiveHistoryItem }) {
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSlider, setShowSlider] = useState(true);
  const [error, setError] = useState(null);
  const [imageSize, setImageSize] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef();

  // Manual Coordinate Input state if no GPS coordinates found
  const [manualGps, setManualGps] = useState({ lat: "", lon: "" });
  const [gpsUsed, setGpsUsed] = useState(null);
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e) => {
    const selected = e.target.files[0] ?? null;
    processSelectedFile(selected);
  };

  const processSelectedFile = (selectedFile) => {
    if (clearActiveHistoryItem) clearActiveHistoryItem();
    setFile(selectedFile);
    setRes(null);
    setGpsUsed(null);
    setManualGps({ lat: "", lon: "" });
    setError(null);
    
    if (selectedFile) {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(selectedFile);
    } else {
      setImageSize(null);
    }
  };

  const submit = async (fileToSubmit = null) => {
    const targetFile = fileToSubmit || file;
    if (!targetFile) return setError("Please select or drop an image first.");
    setLoading(true);
    setRes(null);
    setGpsUsed(null);
    setManualGps({ lat: "", lon: "" });
    setError(null);
    try {
      if (typeof targetFile === "string") {
        setLoading(false);
        return;
      }
      const data = await predictImage(targetFile);
      setRes(data);
      if (data.gps) {
        setGpsUsed(data.gps);
      }
      if (onPredictionSuccess) {
        onPredictionSuccess(targetFile.name, data, targetFile);
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data || err.message || "Model execution failed");
    }
    setLoading(false);
  };

  // Watch for active history item selected from App sidebar or map click
  useEffect(() => {
    if (activeHistoryItem) {
      if (activeHistoryItem.res === null && activeHistoryItem.fileObject) {
        // Map Selection Trigger (needs fresh model run)
        setFile(activeHistoryItem.fileObject);
        setRes(null);
        setGpsUsed(activeHistoryItem.gps || null);
        // Execute prediction immediately using the passed fileObject to bypass state updates
        submit(activeHistoryItem.fileObject);
      } else {
        // Sidebar History Reload (already has predictions)
        setFile(activeHistoryItem.fileUrl || null);
        setRes(activeHistoryItem.res);
        setGpsUsed(activeHistoryItem.res.gps || null);
      }
      setError(null);
      
      // Calculate image size
      const currentSrc = activeHistoryItem.fileObject 
        ? URL.createObjectURL(activeHistoryItem.fileObject) 
        : activeHistoryItem.fileUrl;
        
      if (currentSrc) {
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: img.width, height: img.height });
        };
        img.src = currentSrc;
      } else {
        setImageSize(null);
      }
    }
  }, [activeHistoryItem]);

  const downloadGradcam = () => {
    if (!res?.gradcam_base64) return;
    const content = atob(res.gradcam_base64);
    const byteNumbers = new Array(content.length);
    for (let i = 0; i < content.length; i++) byteNumbers[i] = content.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/jpeg" });
    saveAs(blob, `gradcam_${Date.now()}.jpg`);
  };

  const setPresetCoordinates = (lat, lon) => {
    const coords = { lat, lon };
    setManualGps(coords);
    setGpsUsed(coords);
    if (res) {
      res.gps = coords;
    }
  };

  const handleManualGpsSubmit = (e) => {
    e.preventDefault();
    if (!manualGps.lat || !manualGps.lon) return;
    const coords = { lat: parseFloat(manualGps.lat), lon: parseFloat(manualGps.lon) };
    setGpsUsed(coords);
    if (res) {
      res.gps = coords;
    }
  };

  const generatePDFReport = () => {
    if (!res) return;
    const printWindow = window.open("", "_blank");
    
    const imageSrc = file 
      ? (typeof file === "string" ? file : URL.createObjectURL(file))
      : null;

    const gpsString = gpsUsed ? `${gpsUsed.lat}, ${gpsUsed.lon}` : "Not mapped / unavailable";

    // Format index values for report
    const vari = res.spectral_indices?.vari != null ? res.spectral_indices.vari.toFixed(4) : "—";
    const gli = res.spectral_indices?.gli != null ? res.spectral_indices.gli.toFixed(4) : "—";
    const ngrdi = res.spectral_indices?.ngrdi != null ? res.spectral_indices.ngrdi.toFixed(4) : "—";

    printWindow.document.write(`
      <html>
        <head>
          <title>EarthSense AI - V2.0 Environmental Diagnostic Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1f2937; line-height: 1.6; background-color: #fafafa; }
            .report-card { background: #fff; max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 40px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 26px; font-weight: 800; margin: 0; color: #111827; }
            .subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
            .badge { font-size: 14px; text-transform: uppercase; font-weight: 700; padding: 6px 16px; border-radius: 20px; display: inline-block; }
            .badge.deforested { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; }
            .badge.healthy { background: #d1fae5; color: #10b981; border: 1px solid #6ee7b7; }
            .value-block { margin: 20px 0; background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #f3f4f6; }
            .label { font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.5px; }
            .classification { font-size: 24px; font-weight: 800; color: #111827; margin: 6px 0; }
            .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
            .metric { background: #fff; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; }
            .metric-title { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
            .metric-value { font-size: 18px; font-weight: 700; color: #111827; margin-top: 4px; }
            .spectral-suite { margin-top: 20px; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .images-container { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-top: 30px; }
            .img-box { text-align: center; }
            .img-box img { max-width: 100%; border-radius: 8px; border: 1px solid #e5e7eb; max-height: 250px; object-fit: cover; }
            .img-box h4 { margin: 0 0 10px 0; font-size: 14px; color: #374151; }
            .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 11px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>
          <div class="report-card">
            <div class="header">
              <div>
                <h1 class="title">EarthSense V2.0 Environmental Report</h1>
                <p class="subtitle">Spectral Remote Sensing & Deep Diagnostic Documentation</p>
              </div>
              <div class="badge ${res.label === 'Deforested' ? 'deforested' : 'healthy'}">
                ${res.label}
              </div>
            </div>
            
            <div class="value-block">
              <div class="label">Detection Diagnostic</div>
              <div class="classification">${res.label} (${res.confidence}%)</div>
              
              <div class="metrics-grid">
                <div class="metric">
                  <div class="metric-title">Biomass Canopy Cover Heuristic</div>
                  <div class="metric-value">${res.veg_fraction != null ? (res.veg_fraction * 100).toFixed(1) + '%' : '—'}</div>
                </div>
                <div class="metric">
                  <div class="metric-title">Coordinates (GIS Coordinate System)</div>
                  <div class="metric-value" style="font-size:14px; word-break:break-all;">${gpsString}</div>
                </div>
              </div>
            </div>

            <div class="spectral-suite">
              <div class="label" style="margin-bottom:12px;">RGB Vegetation Indices Suite</div>
              <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align:center;">
                <div>
                  <div style="font-size:11px; color:#6b7280;">VARI</div>
                  <div style="font-size:18px; font-weight:700; margin-top:4px;">${vari}</div>
                  <div style="font-size:9px; color:#9ca3af;">Canopy Fraction</div>
                </div>
                <div>
                  <div style="font-size:11px; color:#6b7280;">GLI</div>
                  <div style="font-size:18px; font-weight:700; margin-top:4px;">${gli}</div>
                  <div style="font-size:9px; color:#9ca3af;">Chlorophyll Cover</div>
                </div>
                <div>
                  <div style="font-size:11px; color:#6b7280;">NGRDI</div>
                  <div style="font-size:18px; font-weight:700; margin-top:4px;">${ngrdi}</div>
                  <div style="font-size:9px; color:#9ca3af;">Greenness Contrast</div>
                </div>
              </div>
            </div>

            <div class="images-container">
              <div class="img-box">
                <h4>True-Color Satellite Capture</h4>
                ${imageSrc ? `<img src="${imageSrc}" />` : '<div style="height:200px; line-height:200px; background:#f3f4f6; border:1px dashed #d1d5db; border-radius:8px; color:#9ca3af;">Image expired (past session)</div>'}
              </div>
              <div class="img-box">
                <h4>Explainable Grad-CAM Output</h4>
                ${res.gradcam_base64 ? `<img src="data:image/jpeg;base64,${res.gradcam_base64}" />` : '<div style="height:200px; line-height:200px; background:#f3f4f6; border:1px dashed #d1d5db; border-radius:8px; color:#9ca3af;">Not Available</div>'}
              </div>
            </div>

            <div class="footer">
              Generated automatically on ${new Date().toLocaleString()} by EarthSense deep-inference engine • Page 1 of 1
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleReset = () => {
    setFile(null);
    setRes(null);
    setError(null);
    setImageSize(null);
    setGpsUsed(null);
    setManualGps({ lat: "", lon: "" });
    if (fileInputRef.current) fileInputRef.current.value = null;
    if (clearActiveHistoryItem) clearActiveHistoryItem();
  };

  // Convert raw value to color index fill percentage for UI slider bars
  const getIndexPercentage = (val) => {
    // Indices range from -1.0 to 1.0. Shift to 0..100
    const pct = ((val + 1) / 2) * 100;
    return Math.min(100, Math.max(0, pct));
  };

  const getIndexColor = (val) => {
    if (val > 0.1) return "var(--accent)"; // Good health (green)
    if (val > -0.05) return "var(--accent-yellow)"; // Warning (yellow)
    return "var(--danger)"; // Severe forest loss (red)
  };

  return (
    <div className="glass-panel">
      <h2 className="panel-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        Single Image Analyzer
      </h2>

      {/* Drag & Drop File Container */}
      {!file ? (
        <div 
          className={`dropzone ${dragActive ? "active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <div className="dropzone-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="dropzone-text">Drag and drop your satellite image here</div>
          <div className="dropzone-subtext">Supports PNG, JPG, JPEG up to 10MB</div>
          <button className="btn btn-secondary" style={{ marginTop: "10px" }} onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>
            Select File
          </button>
        </div>
      ) : (
        <div className="upload-preview-container">
          <img
            src={typeof file === "string" ? file : URL.createObjectURL(file)}
            alt="uploaded"
            className="upload-preview-img"
          />
          <div className="upload-preview-overlay">
            <button className="btn btn-danger btn-icon-only" title="Remove image" onClick={handleReset}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        style={{ display: "none" }}
      />

      {/* Image details */}
      {imageSize && !res && (
        <div style={{ marginTop: 12, padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", fontSize: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
          <strong style={{ color: "#fff" }}>Resolution:</strong> {imageSize.width} × {imageSize.height} px
        </div>
      )}

      {/* Action panel */}
      <div style={{ marginTop: 16, display: "flex", gap: "10px" }}>
        <button 
          className="btn" 
          onClick={submit} 
          disabled={loading || !file || (typeof file === "string" && res)}
        >
          {loading ? (
            <>
              <svg className="animate-spin" style={{ animation: "spin 1s linear infinite", width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ opacity: 0.75 }}></path>
              </svg>
              Analyzing Satellite Frame...
            </>
          ) : (
            "Run Diagnostics"
          )}
        </button>
        {file && (
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {String(error)}
        </div>
      )}

      {/* Model inference status (Skeleton loader) */}
      {loading && (
        <div style={{ marginTop: 20 }}>
          <div className="skeleton skeleton-text" style={{ width: "30%" }} />
          <div className="skeleton skeleton-text" style={{ width: "60%" }} />
          <div className="skeleton skeleton-img" style={{ height: "150px", marginTop: "15px" }} />
        </div>
      )}

      {/* Results panel */}
      {res && !loading && (
        <div style={{ marginTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="smallLabel">CLASSIFICATION ENGINE RESULT</div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                <span className={`prediction-badge ${res.label === 'Deforested' ? 'deforested' : 'healthy'}`}>
                  {res.label}
                </span>
                <span style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: "500" }}>
                  ({res.confidence}%)
                </span>
              </div>
            </div>
          </div>

          {/* Confidence Slider Indicator */}
          <div className="progress-container">
            <div className="progress-label-row">
              <span>Confidence Level</span>
              <span>{Math.round(res.confidence)}%</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className={`progress-bar-fill ${res.label === 'Deforested' ? 'deforested' : 'healthy'}`}
                style={{ width: `${Math.round(res.confidence)}%` }}
              />
            </div>
          </div>

          {/* Dynamic GIS Mapping Coordinates card */}
          <div className="gps-panel">
            <div className="gps-left">
              <div className="gps-icon-indicator">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <div className="smallLabel">GIS Coordinates Mapping</div>
                <div className="gps-coords-display">
                  {gpsUsed ? (
                    <a 
                      href={`https://www.openstreetmap.org/?mlat=${gpsUsed.lat}&mlon=${gpsUsed.lon}#map=15/${gpsUsed.lat}/${gpsUsed.lon}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: "var(--accent-blue)", textDecoration: "underline" }}
                    >
                      {gpsUsed.lat.toFixed(6)}, {gpsUsed.lon.toFixed(6)} ↗
                    </a>
                  ) : (
                    "No metadata coordinates found"
                  )}
                </div>
              </div>
            </div>

            {!gpsUsed && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" style={{ fontSize: "10px", padding: "4px 8px" }} onClick={() => setPresetCoordinates(-3.4653, -62.2159)}>
                  Amazon Forest Preset
                </button>
                <button className="btn btn-secondary" style={{ fontSize: "10px", padding: "4px 8px" }} onClick={() => setPresetCoordinates(1.2054, 114.1205)}>
                  Borneo Logging Preset
                </button>
              </div>
            )}
          </div>

          {/* Form for manual mapping inputs if no EXIF is present */}
          {!gpsUsed && (
            <form onSubmit={handleManualGpsSubmit} style={{ marginTop: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
              <input 
                type="number" 
                step="any" 
                placeholder="Lat (e.g. -3.465)" 
                value={manualGps.lat} 
                onChange={(e) => setManualGps(prev => ({ ...prev, lat: e.target.value }))}
                style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "6px", color: "#fff", fontSize: "11px", flex: 1 }}
              />
              <input 
                type="number" 
                step="any" 
                placeholder="Lon (e.g. -62.215)" 
                value={manualGps.lon} 
                onChange={(e) => setManualGps(prev => ({ ...prev, lon: e.target.value }))}
                style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "6px", color: "#fff", fontSize: "11px", flex: 1 }}
              />
              <button type="submit" className="btn btn-secondary" style={{ fontSize: "11px", padding: "6px 12px" }}>
                Map Location
              </button>
            </form>
          )}

          {/* Interactive Split-Screen compare slider (V2.0) vs traditional displays */}
          <div style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="smallLabel">INTERACTIVE GRAD-CAM COMPARE (SLIDE TO REVEAL)</span>
              <button className="btn btn-secondary btn-icon-only" style={{ width: "24px", height: "24px" }} title="Toggle View Mode" onClick={() => setShowSlider(s => !s)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M2 12h20" />
                </svg>
              </button>
            </div>

            {showSlider && res.gradcam_base64 && file ? (
              <SliderCompare 
                original={typeof file === "string" ? file : URL.createObjectURL(file)} 
                overlay={`data:image/jpeg;base64,${res.gradcam_base64}`} 
              />
            ) : (
              <div className="result-display-grid">
                <div className="result-image-wrapper">
                  <span className="image-label-tag">Satellite RGB</span>
                  {file ? (
                    <img
                      src={typeof file === "string" ? file : URL.createObjectURL(file)}
                      alt="satellite capture"
                    />
                  ) : (
                    <div style={{ color: "var(--text-muted)" }}>Cleared from session</div>
                  )}
                </div>
                <div className="result-image-wrapper">
                  <span className="image-label-tag">Grad-CAM Overlay</span>
                  {res.gradcam_base64 ? (
                    <img
                      src={`data:image/jpeg;base64,${res.gradcam_base64}`}
                      alt="gradcam mask"
                    />
                  ) : (
                    <div style={{ color: "var(--text-muted)" }}>Not Available</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Vegetation Canopy Index Suite */}
          <div style={{ marginTop: "24px" }}>
            <span className="smallLabel">SPECTRAL VEGETATION INDICATORS (RGB REMOTE SENSING)</span>
            <div className="spectral-grid">
              
              {/* VARI */}
              <div className="spectral-card">
                <div className="spectral-title" title="Visible Atmospherically Resistant Index. Normal bounds: -1.0 to 1.0. Shifts over 0.1 indicate dense healthy green canopies.">
                  VARI Index
                </div>
                <div className="spectral-value">
                  {res.spectral_indices?.vari != null ? res.spectral_indices.vari.toFixed(3) : "—"}
                </div>
                <div className="spectral-bar-bg">
                  <div 
                    className="spectral-bar-fill" 
                    style={{ 
                      width: `${res.spectral_indices?.vari != null ? getIndexPercentage(res.spectral_indices.vari) : 0}%`,
                      backgroundColor: res.spectral_indices?.vari != null ? getIndexColor(res.spectral_indices.vari) : "transparent"
                    }}
                  />
                </div>
              </div>

              {/* GLI */}
              <div className="spectral-card">
                <div className="spectral-title" title="Green Leaf Index. Highlights active photosynthetic leaf chlorophyll content. Values above 0 indicate active green cover.">
                  GLI Index
                </div>
                <div className="spectral-value">
                  {res.spectral_indices?.gli != null ? res.spectral_indices.gli.toFixed(3) : "—"}
                </div>
                <div className="spectral-bar-bg">
                  <div 
                    className="spectral-bar-fill" 
                    style={{ 
                      width: `${res.spectral_indices?.gli != null ? getIndexPercentage(res.spectral_indices.gli) : 0}%`,
                      backgroundColor: res.spectral_indices?.gli != null ? getIndexColor(res.spectral_indices.gli) : "transparent"
                    }}
                  />
                </div>
              </div>

              {/* NGRDI */}
              <div className="spectral-card">
                <div className="spectral-title" title="Normalized Green Red Difference Index. Evaluates canopy green/red channel contrast. Values above 0 indicate healthy vegetation.">
                  NGRDI Index
                </div>
                <div className="spectral-value">
                  {res.spectral_indices?.ngrdi != null ? res.spectral_indices.ngrdi.toFixed(3) : "—"}
                </div>
                <div className="spectral-bar-bg">
                  <div 
                    className="spectral-bar-fill" 
                    style={{ 
                      width: `${res.spectral_indices?.ngrdi != null ? getIndexPercentage(res.spectral_indices.ngrdi) : 0}%`,
                      backgroundColor: res.spectral_indices?.ngrdi != null ? getIndexColor(res.spectral_indices.ngrdi) : "transparent"
                    }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Action Buttons Row */}
          <div style={{ marginTop: 20, display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {res.gradcam_base64 && (
              <button className="btn btn-secondary" onClick={downloadGradcam}>
                Download Heatmap
              </button>
            )}
            <button className="btn btn-secondary" onClick={generatePDFReport}>
              Download Diagnostic Report
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                const coordStr = gpsUsed ? `Coords: ${gpsUsed.lat.toFixed(4)}, ${gpsUsed.lon.toFixed(4)}` : "No GPS coords";
                const text = `EarthSense V2.0 Classification: ${res.label} (${res.confidence}%) | GLI Index: ${res.spectral_indices?.gli?.toFixed(3)} | ${coordStr}`;
                navigator.clipboard.writeText(text);
                alert("Summary copied to clipboard!");
              }}
            >
              Copy Summary
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
