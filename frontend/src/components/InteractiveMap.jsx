// frontend/src/components/InteractiveMap.jsx
import React, { useEffect, useRef } from "react";

export default function InteractiveMap({ onAnalyzeLocation }) {
  const leafletMapInstanceRef = useRef(null);

  useEffect(() => {
    // Check if Leaflet is loaded from CDN
    if (typeof window === "undefined" || !window.L) {
      console.warn("Leaflet library L object not found on window");
      return;
    }

    const L = window.L;

    // Initialize map centered at coordinates close to equator
    const map = L.map("leaflet-interactive-map", {
      center: [-5.0, -10.0],
      zoom: 2,
      minZoom: 1.5,
    });
    leafletMapInstanceRef.current = map;

    // Add Dark Matter CartoDB tile layer for premium dark aesthetics
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Custom CSS-based marker icons
    const sensorIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: #10b981; width: 14px; height: 14px; border: 2.5px solid #fff; border-radius: 50%; box-shadow: 0 0 12px #10b981;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const activeIcon = L.divIcon({
      className: 'custom-map-marker-active',
      html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border: 2.5px solid #fff; border-radius: 50%; box-shadow: 0 0 12px #ef4444; animation: pulseRed 1.8s infinite;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    // Define Presets
    const presets = [
      {
        name: "Amazon Logging Spot",
        lat: -3.4653,
        lon: -62.2159,
        image: "/deforested_amazon.png",
        filename: "amazon_deforestation.png",
        type: "deforested",
        desc: "Visible canopy degradation and access roads branching into primary forest."
      },
      {
        name: "Borneo Plantation Encroachment",
        lat: 1.2054,
        lon: 114.1205,
        image: "/deforested_borneo.png",
        filename: "borneo_clearance.png",
        type: "deforested",
        desc: "Encroaching palm oil plantation grids causing severe biomass loss."
      },
      {
        name: "Olympic National Forest (Protected)",
        lat: 47.8021,
        lon: -123.6044,
        image: "/healthy_forest.png",
        filename: "olympic_canopy.png",
        type: "healthy",
        desc: "Dense canopy representing healthy, protected temperate primary forest."
      }
    ];

    presets.forEach(p => {
      const marker = L.marker([p.lat, p.lon], { icon: p.type === "deforested" ? activeIcon : sensorIcon }).addTo(map);
      
      const popupContent = document.createElement("div");
      popupContent.style.color = "#111827";
      popupContent.style.fontFamily = "'Inter', sans-serif";
      popupContent.style.fontSize = "12px";
      popupContent.style.minWidth = "180px";
      popupContent.innerHTML = `
        <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: ${p.type === 'deforested' ? '#ef4444' : '#10b981'};">${p.name}</h4>
        <p style="margin: 0 0 10px 0; color: #4b5563; line-height: 1.4; font-size: 11px;">${p.desc}</p>
        <button id="map-btn-${p.filename}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 10px; width: 100%; display: block; box-shadow: 0 2px 6px rgba(16,185,129,0.3);">
          Analyze Satellite Capture
        </button>
      `;

      marker.bindPopup(popupContent);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`map-btn-${p.filename}`);
        if (btn) {
          btn.onclick = () => {
            onAnalyzeLocation(p.filename, p.image, { lat: p.lat, lon: p.lon });
            marker.closePopup();
          };
        }
      });
    });

    // Custom clicking on map to set custom coordinate
    let customMarker = null;
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      
      if (customMarker) {
        map.removeLayer(customMarker);
      }

      customMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'custom-map-marker-click',
          html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border: 2.5px solid #fff; border-radius: 50%; box-shadow: 0 0 12px #3b82f6;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        })
      }).addTo(map);

      const popupContent = document.createElement("div");
      popupContent.style.color = "#111827";
      popupContent.style.fontFamily = "'Inter', sans-serif";
      popupContent.style.fontSize = "12px";
      popupContent.style.minWidth = "180px";
      popupContent.innerHTML = `
        <h4 style="margin: 0 0 4px 0; font-weight: 700; color: #3b82f6; font-size: 13px;">Custom Sensor Request</h4>
        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 11px;">Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}</p>
        <button id="map-btn-custom" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 10px; width: 100%; display: block; box-shadow: 0 2px 6px rgba(59,130,246,0.3);">
          Run Satellite Audit
        </button>
      `;

      customMarker.bindPopup(popupContent);

      customMarker.on("popupopen", () => {
        const btn = document.getElementById("map-btn-custom");
        if (btn) {
          btn.onclick = () => {
            // Equatorial clicks mimic Deforestation (Amazon), others mimic Healthy Forest
            const isEquatorial = Math.abs(lat) < 15;
            const mockImg = isEquatorial ? "/deforested_amazon.png" : "/healthy_forest.png";
            const mockFilename = isEquatorial ? "custom_equatorial_jungle.png" : "custom_temperate_canopy.png";
            
            onAnalyzeLocation(mockFilename, mockImg, { lat, lon: lng });
            map.removeLayer(customMarker);
            customMarker = null;
          };
        }
      });

      customMarker.openPopup();
    });

    return () => {
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
      }
    };
  }, [onAnalyzeLocation]);

  return (
    <div className="glass-panel" style={{ height: "380px", display: "flex", flexDirection: "column" }}>
      <h2 className="panel-title" style={{ margin: "0 0 15px 0" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        GIS Satellite Map Explorer
      </h2>
      <div 
        id="leaflet-interactive-map" 
        style={{ 
          flex: 1, 
          width: "100%", 
          borderRadius: "12px", 
          border: "1px solid rgba(255,255,255,0.06)",
          zIndex: 1,
          background: "#0d1423"
        }}
      />
    </div>
  );
}
