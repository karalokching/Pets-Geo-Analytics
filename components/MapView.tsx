import React, { useEffect, useRef } from 'react';
import { SalesRecord } from '../types';

declare global {
  interface Window {
    L: any;
  }
}

interface MapViewProps {
  records: SalesRecord[];
}

const MapView: React.FC<MapViewProps> = ({ records }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Ensure Leaflet is loaded
    if (!window.L || !mapContainerRef.current) return;

    // Initialize map if not already initialized
    if (!mapInstanceRef.current) {
      const hkCenter: [number, number] = [22.3193, 114.1694];
      
      const map = window.L.map(mapContainerRef.current).setView(hkCenter, 11);
      
      // Add Dark Matter tiles (CartoDB) - matches the app's dark theme perfectly
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Update Markers
    const map = mapInstanceRef.current;
    
    // Clear existing layers (except tiles) to prevent duplicate markers
    map.eachLayer((layer: any) => {
      if (layer instanceof window.L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    const validRecords = records.filter(r => r.lat && r.lng && !isNaN(r.lat) && !isNaN(r.lng)).slice(0, 2000);

    validRecords.forEach(record => {
      if (record.lat && record.lng) {
        const marker = window.L.circleMarker([record.lat, record.lng], {
          radius: 6,
          fillColor: "#3b82f6", // Blue-500
          color: "#ffffff",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.7
        });

        const popupContent = `
          <div style="font-family: sans-serif; color: #1e293b;">
            <div style="font-weight: bold; color: #0f172a; margin-bottom: 4px;">${record.district}</div>
            <div style="font-size: 12px; margin-bottom: 4px;">${record.address}</div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px; display: flex; justify-content: space-between;">
              <span style="font-size: 11px; color: #64748b;">Sales:</span>
              <span style="font-weight: bold; color: #059669;">$${record.amount.toLocaleString()}</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.addTo(map);
      }
    });

    // Cleanup on unmount
    return () => {
       // We keep the map instance alive for smoother tab switching, 
       // but strictly speaking in a robust app we might clean it up.
       // For this dashboard, keeping it is fine or we can remove:
       // map.remove(); 
       // mapInstanceRef.current = null;
    };
  }, [records]);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-white font-semibold flex items-center">
          <i className="fas fa-map-marked-alt text-blue-400 mr-2"></i>
          Customer Locations (Leaflet Map)
        </h3>
        <span className="text-xs text-slate-400 italic">
          *Locations estimated by District
        </span>
      </div>
      <div className="flex-1 relative z-0">
         <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default MapView;