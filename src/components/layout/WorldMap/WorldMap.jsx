import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { countryStats } from "../../../services/mockData";
import "./WorldMap.scss";

const COUNTRY_COLORS = { Brésil: "#1677ff", Colombie: "#52c41a", Équateur: "#fa8c16" };

const popupHTML = (c) => `
  <div class="lf-popup">
    <div class="lf-popup-header" style="border-left: 4px solid ${COUNTRY_COLORS[c.name]}">
      <span class="lf-flag">${c.flag}</span>
      <strong class="lf-name">${c.name}</strong>
    </div>
    <div class="lf-popup-grid">
      <div class="lf-item"><span class="lf-lbl">Lots totaux</span><span class="lf-val">${c.lots}</span></div>
      <div class="lf-item"><span class="lf-lbl">Lots actifs</span><span class="lf-val" style="color:#52c41a">${c.activeLots}</span></div>
      <div class="lf-item"><span class="lf-lbl">Alertes</span><span class="lf-val" style="color:${c.alerts >= 4 ? "#ff4d4f" : "#fa8c16"}">${c.alerts}</span></div>
      <div class="lf-item"><span class="lf-lbl">T° moyenne</span><span class="lf-val" style="color:${c.avgTemp > 20 ? "#fa8c16" : "#52c41a"}">${c.avgTemp}°C</span></div>
      <div class="lf-item"><span class="lf-lbl">Humidité moy.</span><span class="lf-val" style="color:${c.avgHumidity > 62 ? "#fa8c16" : "#52c41a"}">${c.avgHumidity}%</span></div>
      <div class="lf-item"><span class="lf-lbl">Entrepôts</span><span class="lf-val">${c.warehouses.length}</span></div>
    </div>
  </div>
`;

const WorldMap = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-10, -58],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    countryStats.forEach((c) => {
      const marker = L.circleMarker(
        [c.coordinates[1], c.coordinates[0]],
        {
          radius: 18,
          fillColor: COUNTRY_COLORS[c.name],
          color: "#fff",
          weight: 3,
          fillOpacity: 0.88,
        }
      );

      marker.bindPopup(popupHTML(c), {
        maxWidth: 240,
        className: "lf-custom-popup",
      });

      marker.addTo(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="leaflet-world-map" />;
};

export default WorldMap;
