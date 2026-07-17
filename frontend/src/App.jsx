import React, { useEffect, useState } from "react";
import UploadCard from "./components/UploadCard";
import BatchUpload from "./components/BatchUpload";
import InteractiveMap from "./components/InteractiveMap";
import "./App.css";

export default function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const API_URL = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  // State to hold prediction history
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("earthsense_history");
    return saved ? JSON.parse(saved) : [];
  });

  // Active history item loaded back into the analyzer
  const [activeHistoryItem, setActiveHistoryItem] = useState(null);

  // Keep track of object URLs in memory for the session to display original uploads in history
  const [sessionImageUrls, setSessionImageUrls] = useState({});

  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch(`${API_URL}/ping`);
        const json = await res.json();
        if (json.status === "ok") setBackendStatus("Online");
        else setBackendStatus("Offline");
      } catch (err) {
        setBackendStatus("Offline");
      }
    }
    checkBackend();
    // Check backend status every 30 seconds
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, [API_URL]);

  // Handler to load a map selection and automatically trigger analysis
  const handleAnalyzeLocation = async (filename, imageUrl, gpsCoords) => {
    try {
      let targetUrl = imageUrl;
      
      // If coordinates are provided, pull the real satellite image from Esri's global servers
      if (gpsCoords) {
        const { lat, lon } = gpsCoords;
        const delta = 0.008; // Bounding box size (approx 1km x 1km)
        const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
        
        // Esri ArcGIS World Imagery Static Export REST API
        targetUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=512,512&format=jpg&f=image`;
      }
      
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error("Failed to retrieve satellite imagery from Esri GIS server");
      
      const blob = await response.blob();
      const fileObject = new File([blob], filename, { type: "image/jpeg" });
      
      setActiveHistoryItem({
        filename,
        fileUrl: targetUrl,
        fileObject,
        isMapSelection: true,
        gps: gpsCoords,
        res: null // Tell UploadCard it needs to perform a fresh prediction
      });
    } catch (err) {
      console.error("Failed to load map preset image", err);
    }
  };

  // Handler to record a new single image prediction
  const handlePredictionSuccess = (filename, result, fileObject) => {
    const id = Date.now().toString();
    
    // Save the file ObjectURL for the session
    let fileUrl = null;
    if (fileObject) {
      fileUrl = URL.createObjectURL(fileObject);
      setSessionImageUrls(prev => ({ ...prev, [id]: fileUrl }));
    }

    const newItem = {
      id,
      timestamp: new Date().toLocaleString(),
      filename,
      label: result.label,
      confidence: result.confidence,
      veg_fraction: result.veg_fraction,
      veg_norm: result.veg_norm,
      spectral_indices: result.spectral_indices,
      gps: result.gps,
      gradcam_base64: result.gradcam_base64,
      fileUrl: fileUrl, // only valid during current browser session
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 10);
      localStorage.setItem("earthsense_history", JSON.stringify(updated));
      return updated;
    });
  };

  // Helper to load a past history prediction back into the analyzer
  const loadHistoryItem = (item) => {
    // Determine the best source for the original image
    const currentUrl = sessionImageUrls[item.id] || item.fileUrl;
    
    setActiveHistoryItem({
      filename: item.filename,
      fileUrl: currentUrl, // might be null if past session
      res: {
        label: item.label,
        confidence: item.confidence,
        veg_fraction: item.veg_fraction,
        veg_norm: item.veg_norm,
        spectral_indices: item.spectral_indices,
        gps: item.gps,
        gradcam_base64: item.gradcam_base64,
      }
    });
  };

  // Clear history handler
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("earthsense_history");
    setActiveHistoryItem(null);
  };

  // Calculate live stats from history
  const totalAnalyzed = history.length;
  const deforestedCount = history.filter(h => h.label === "Deforested").length;
  const deforestRate = totalAnalyzed > 0 ? Math.round((deforestedCount / totalAnalyzed) * 100) : 0;
  
  const totalVeg = history.reduce((sum, curr) => sum + (curr.veg_fraction || 0), 0);
  const avgVegFraction = totalAnalyzed > 0 ? Math.round((totalVeg / totalAnalyzed) * 100) : 0;

  return (
    <div className="app-wrapper">
      <div className="app-container">
        
        {/* Header */}
        <header className="app-header">
          <div className="app-header-left">
            <div className="app-logo-icon">
              {/* Custom Forest SVG Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 22h20L12 2z" />
                <path d="M12 8l-5 10h10l-5-10z" />
                <path d="M12 14v8" />
              </svg>
            </div>
            <div>
              <h1 className="app-title">EarthSense AI</h1>
              <p className="app-subtitle">Satellite-Based Environmental Intelligence Dashboard</p>
            </div>
          </div>

          <div className="backend-status-card">
            <span className={`status-dot ${backendStatus === "Online" ? "online" : "offline"}`} />
            <div>
              <strong>Backend Status:</strong> <span style={{ color: backendStatus === "Online" ? "var(--accent)" : "var(--danger)" }}>{backendStatus}</span>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{API_URL}</div>
            </div>
          </div>
        </header>

        {/* Dashboard Stats Ribbon */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-title">Images Analyzed</span>
              <span className="stat-value">{totalAnalyzed}</span>
              <span className="stat-sub">This browser session</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper red">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-title">Deforestation Rate</span>
              <span className="stat-value">{deforestRate}%</span>
              <span className="stat-sub">Detected forest loss</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper green">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-title">Avg Veg Cover</span>
              <span className="stat-value">{avgVegFraction}%</span>
              <span className="stat-sub">Healthy biomass area</span>
            </div>
          </div>
        </section>

        {/* Main Workspace Layout */}
        <div className="dashboard-grid">
          
          {/* Main Column */}
          <main style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            <InteractiveMap onAnalyzeLocation={handleAnalyzeLocation} />
            <UploadCard 
              onPredictionSuccess={handlePredictionSuccess} 
              activeHistoryItem={activeHistoryItem}
              clearActiveHistoryItem={() => setActiveHistoryItem(null)}
            />
            <BatchUpload />
          </main>

          {/* Sidebar Column */}
          <aside style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            
            {/* History Panel */}
            <div className="glass-panel history-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h3 className="panel-title" style={{ margin: 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Recent Predictions
                </h3>
                {history.length > 0 && (
                  <button className="btn btn-secondary btn-icon-only" title="Clear History" onClick={clearHistory}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: "13px" }}>
                  No predictions recorded yet. Upload an image to start tracking.
                </div>
              ) : (
                <div className="history-list">
                  {history.map((item) => (
                    <div className="history-item" key={item.id} onClick={() => loadHistoryItem(item)}>
                      <div className="history-item-left">
                        <span className="history-item-name">{item.filename}</span>
                        <span className="history-item-meta">{item.timestamp}</span>
                      </div>
                      <div className="history-item-right">
                        <div style={{ display: "flex", alignItems: "center", fontSize: "12px", fontWeight: "700" }}>
                          <span className={`history-dot-indicator ${item.label === "Deforested" ? "deforested" : "healthy"}`} />
                          <span style={{ color: item.label === "Deforested" ? "var(--danger)" : "var(--accent)" }}>
                            {item.label}
                          </span>
                        </div>
                        <span className="history-item-meta">Conf: {item.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* About and Methodology */}
            <div className="glass-panel">
              <h3 className="panel-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Model Details
              </h3>
              <p style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--text-muted)", margin: "0 0 12px 0" }}>
                EarthSense AI utilizes a deep convolutional neural network based on the <strong>MobileNetV2</strong> architecture, fine-tuned using transfer learning for binary classification.
              </p>
              <ul style={{ fontSize: "13px", paddingLeft: "18px", color: "var(--text-muted)", margin: 0, lineHeight: "1.8" }}>
                <li>Image Target Resolution: 224×224px</li>
                <li>Visual Heatmaps: Grad-CAM overlay</li>
                <li>Biomass Heuristic: Normalized Green Cover ratio</li>
              </ul>
            </div>
          </aside>

        </div>

        {/* Footer */}
        <footer className="app-footer">
          <div className="app-footer-brand">EarthSense AI</div>
          <div>Satellite-Based Environmental Monitoring Dashboard • Hackathon Edition</div>
          <div style={{ opacity: 0.5, fontSize: "10px", marginTop: "4px" }}>Powered by TensorFlow, Keras, Flask, React & Vite</div>
        </footer>

      </div>
    </div>
  );
}
