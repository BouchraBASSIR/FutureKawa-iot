// import React, { useEffect, useRef } from "react";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import { countryStats } from "../../../services/mockData";
// import "./WorldMap.scss";

// const COUNTRY_COLORS = { Brésil: "#1677ff", Colombie: "#52c41a", Équateur: "#fa8c16" };

// const popupHTML = (c) => `
//   <div class="lf-popup">
//     <div class="lf-popup-header" style="border-left: 4px solid ${COUNTRY_COLORS[c.name]}">
//       <span class="lf-flag">${c.flag}</span>
//       <strong class="lf-name">${c.name}</strong>
//     </div>
//     <div class="lf-popup-grid">
//       <div class="lf-item"><span class="lf-lbl">Lots totaux</span><span class="lf-val">${c.lots}</span></div>
//       <div class="lf-item"><span class="lf-lbl">Lots actifs</span><span class="lf-val" style="color:#52c41a">${c.activeLots}</span></div>
//       <div class="lf-item"><span class="lf-lbl">Alertes</span><span class="lf-val" style="color:${c.alerts >= 4 ? "#ff4d4f" : "#fa8c16"}">${c.alerts}</span></div>
//       <div class="lf-item"><span class="lf-lbl">T° moyenne</span><span class="lf-val" style="color:${c.avgTemp > 20 ? "#fa8c16" : "#52c41a"}">${c.avgTemp}°C</span></div>
//       <div class="lf-item"><span class="lf-lbl">Humidité moy.</span><span class="lf-val" style="color:${c.avgHumidity > 62 ? "#fa8c16" : "#52c41a"}">${c.avgHumidity}%</span></div>
//       <div class="lf-item"><span class="lf-lbl">Entrepôts</span><span class="lf-val">${c.warehouses.length}</span></div>
//     </div>
//   </div>
// `;

// const WorldMap = () => {
//   const containerRef = useRef(null);
//   const mapRef = useRef(null);

//   useEffect(() => {
//     if (!containerRef.current || mapRef.current) return;

//     const map = L.map(containerRef.current, {
//       center: [-10, -58],
//       zoom: 3,
//       zoomControl: true,
//       attributionControl: true,
//     });

//     L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//       attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
//       maxZoom: 18,
//     }).addTo(map);

//     countryStats.forEach((c) => {
//       const marker = L.circleMarker(
//         [c.coordinates[1], c.coordinates[0]],
//         {
//           radius: 18,
//           fillColor: COUNTRY_COLORS[c.name],
//           color: "#fff",
//           weight: 3,
//           fillOpacity: 0.88,
//         }
//       );

//       marker.bindPopup(popupHTML(c), {
//         maxWidth: 240,
//         className: "lf-custom-popup",
//       });

//       marker.addTo(map);
//     });

//     mapRef.current = map;

//     return () => {
//       map.remove();
//       mapRef.current = null;
//     };
//   }, []);

//   return <div ref={containerRef} className="leaflet-world-map" />;
// };

// export default WorldMap;


import React, { useEffect, useRef, useContext } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CountryContext } from "../../../context/country";
import "./WorldMap.scss";

const COUNTRY_COLORS = { 
  bresil: "#1677ff", 
  colombie: "#52c41a", 
  equateur: "#fa8c16" 
};

const countryData = [
  {
    name: "Brésil",
    code: "bresil",
    coordinates: [-51.9253, -14.2350],
    zoomLevel: 5,
  },
  {
    name: "Équateur",
    code: "equateur",
    coordinates: [-78.1834, -0.1807],
    zoomLevel: 5,
  },
  {
    name: "Colombie",
    code: "colombie",
    coordinates: [-74.2973, 4.5709],
    zoomLevel: 5,
  },
];

const WorldMap = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const { selectedCountry, setSelectedCountry } = useContext(CountryContext);

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

    countryData.forEach((c) => {
      const marker = L.circleMarker(
        [c.coordinates[1], c.coordinates[0]],
        {
          radius: 18,
          fillColor: COUNTRY_COLORS[c.code],
          color: "#fff",
          weight: 3,
          fillOpacity: 0.88,
        }
      );
      marker.bindTooltip(
        `<div class="map-tooltip">${c.flag} <strong>${c.name}</strong></div>`,
        {
          permanent: false,
          direction: "top",
          className: "map-tooltip-container",
        }
      );

      // marker.on("click", () => {
      //   setSelectedCountry(c.code);
      //   map.flyTo([c.coordinates[1], c.coordinates[0]], c.zoomLevel, {
      //     duration: 1.5,
      //   });
      // });
      marker.on("click", () => {
        setSelectedCountry(c.code);
      });
      marker.addTo(map);
      markersRef.current[c.code] = marker;
    });

    mapRef.current = map;
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [setSelectedCountry]);

  useEffect(() => {
    Object.keys(markersRef.current).forEach((code) => {
      const marker = markersRef.current[code];
      if (code === selectedCountry) {
        marker.setStyle({ weight: 5, color: COUNTRY_COLORS[code], fillOpacity: 1 });
        marker._container?.classList.add("marker-selected");
      } else {
        marker.setStyle({ weight: 3, color: "#fff", fillOpacity: 0.88 });
        marker._container?.classList.remove("marker-selected");
      }
    });

    if (!mapRef.current) return;
    const country = countryData.find(c => c.code === selectedCountry);
    if (country) {
      mapRef.current.flyTo(
        [country.coordinates[1], country.coordinates[0]],
        country.zoomLevel,
        { duration: 0.8, easeLinearity: 0.3 }
      );
    } else {
      mapRef.current.flyTo([-10, -58], 3, { duration: 0.8, easeLinearity: 0.3 });
    }
  }, [selectedCountry]);

  return <div ref={containerRef} className="leaflet-world-map" />;
};

export default WorldMap;