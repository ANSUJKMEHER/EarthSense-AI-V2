// frontend/src/components/BatchUpload.jsx
import React, { useState, useRef } from "react";
import { batchPredict } from "../api";
import { saveAs } from "file-saver";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
ChartJS.register(ArcElement, Tooltip, Legend);

export default function BatchUpload() {
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef();

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
      setFiles(Array.from(e.dataTransfer.files));
      setResult(null);
      setError(null);
    }
  };

  const onFilesChange = (e) => {
    setFiles(Array.from(e.target.files));
    setResult(null);
    setError(null);
  };

  const submit = async () => {
    if (files.length === 0) return setError("Please select or drop images first.");
    setLoading(true);
    setError(null);
    try {
      const data = await batchPredict(files);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data || err.message || "Batch process failed");
    }
    setLoading(false);
  };

  const downloadCSV = () => {
    if (!result) return;
    const rows = [["filename", "label", "confidence", "prob_deforested", "prob_non_deforested", "veg_fraction"]];
    result.results.forEach((r) => {
      rows.push([
        r.filename || "",
        r.label || "",
        r.confidence ?? "",
        r.prob_deforested ?? "",
        r.prob_non_deforested ?? "",
        r.veg_fraction ?? ""
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `batch_analysis_${Date.now()}.csv`);
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const pieData = result
    ? {
        labels: ["Deforested", "Healthy Forest"],
        datasets: [
          {
            data: [result.summary.deforested, result.summary.not_deforested],
            backgroundColor: ["rgba(239, 68, 68, 0.75)", "rgba(16, 185, 129, 0.75)"],
            borderColor: ["#ef4444", "#10b981"],
            borderWidth: 2,
          },
        ],
      }
    : null;

  const pieOptions = {
    plugins: {
      legend: {
        labels: {
          color: "#f3f4f6",
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 11
          }
        }
      }
    }
  };

  return (
    <div className="glass-panel">
      <h2 className="panel-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        Batch Diagnostics Pipeline
      </h2>

      {/* Drag and Drop Zone */}
      {files.length === 0 ? (
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <div className="dropzone-text">Drag and drop multiple files here</div>
          <div className="dropzone-subtext">Batch upload multiple satellite frames for parallel run</div>
          <button className="btn btn-secondary" style={{ marginTop: "10px" }} onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>
            Select Files
          </button>
        </div>
      ) : (
        <div style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: "600" }}>
              Selected <strong style={{ color: "var(--accent)" }}>{files.length}</strong> satellite image frames
            </span>
            <button className="btn btn-danger btn-icon-only" title="Clear selection" onClick={handleReset} disabled={loading}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          
          {/* File list text summary */}
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px", maxHeight: "60px", overflowY: "auto" }}>
            {files.map(f => f.name).join(", ")}
          </div>
        </div>
      )}

      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        multiple 
        onChange={onFilesChange}
        style={{ display: "none" }}
      />

      <div style={{ marginTop: 16, display: "flex", gap: "10px" }}>
        <button 
          className="btn" 
          onClick={submit} 
          disabled={loading || files.length === 0}
        >
          {loading ? "Running Parallel Inference..." : "Execute Batch Analysis"}
        </button>
        {files.length > 0 && (
          <button className="btn btn-secondary" onClick={handleReset} disabled={loading}>
            Reset Pipeline
          </button>
        )}
        {result && (
          <button className="btn btn-secondary" onClick={downloadCSV}>
            Export CSV Dataset
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

      {loading && (
        <div style={{ marginTop: 20 }}>
          <div className="skeleton skeleton-text" style={{ width: "40%" }} />
          <div className="skeleton skeleton-text" style={{ width: "70%" }} />
          <div className="skeleton skeleton-img" style={{ height: "100px", marginTop: "15px" }} />
        </div>
      )}

      {result && !loading && (
        <div style={{ marginTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
          
          {/* Summary Stats Cards */}
          <div className="summaryRow">
            <div className="statCard">
              <div className="statTitle">Analyzed</div>
              <div className="statValue">{result.summary.total}</div>
            </div>
            <div className="statCard">
              <div className="statTitle">Deforested</div>
              <div className="statValue" style={{ color: "var(--danger)" }}>
                {result.summary.deforested}
              </div>
            </div>
            <div className="statCard">
              <div className="statTitle">Healthy Forest</div>
              <div className="statValue" style={{ color: "var(--accent)" }}>
                {result.summary.not_deforested}
              </div>
            </div>
            <div className="statCard">
              <div className="statTitle">Forest Loss %</div>
              <div className="statValue">
                {result.summary.total > 0 
                  ? Math.round((result.summary.deforested / result.summary.total) * 100)
                  : 0}%
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "20px", marginTop: "20px", alignItems: "start" }}>
            
            {/* Table */}
            <div className="fancy-table-container">
              <table className="fancy-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Prediction</th>
                    <th>Confidence</th>
                    <th>Veg Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.filename}
                      </td>
                      <td>
                        <span className={`prediction-badge ${r.label === 'Deforested' ? 'deforested' : 'healthy'}`} style={{ fontSize: "11px", padding: "4px 10px" }}>
                          {r.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: "600" }}>
                        {(r.confidence * 100).toFixed(1)}%
                      </td>
                      <td>
                        {r.veg_fraction != null 
                          ? `${(r.veg_fraction * 100).toFixed(1)}%` 
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pie Chart */}
            <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "12px", padding: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "100%", height: "100%" }}>
                {pieData && <Pie data={pieData} options={pieOptions} />}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
