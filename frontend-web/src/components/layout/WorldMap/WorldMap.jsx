import React, { useEffect, useRef, useContext } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CountryContext } from "../../../context/country";
import "./WorldMap.scss";

const COUNTRY_COLORS = {
  bresil:   "#1677ff",
  colombie: "#52c41a",
  equateur: "#fa8c16",
};

const FLAG = { bresil: "🇧🇷", equateur: "🇪🇨", colombie: "🇨🇴" };

const countryData = [
  { name: "Brésil",    code: "bresil",   coordinates: [-51.9253, -14.2350], zoomLevel: 5 },
  { name: "Équateur",  code: "equateur", coordinates: [-78.1834,  -0.1807], zoomLevel: 5 },
  { name: "Colombie",  code: "colombie", coordinates: [-74.2973,   4.5709], zoomLevel: 5 },
];

/**
 * Carte interactive Leaflet des pays fournisseurs.
 *
 * @param {string[]|null} allowedPays
 *   null  → admin, tous les marqueurs sont interactifs
 *   [...] → seuls les pays listés sont cliquables/colorés ;
 *            les autres apparaissent en gris verrouillé
 */
const WorldMap = ({ allowedPays = null }) => {
  const containerRef   = useRef(null);
  const mapRef         = useRef(null);
  const markersRef     = useRef({});
  // Ref pour lire allowedPays dans les effects sans l'ajouter aux deps
  const allowedPaysRef = useRef(allowedPays);
  const { selectedCountry, setSelectedCountry } = useContext(CountryContext);

  // ── Création de la carte + marqueurs (une seule fois) ───────────────────────
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

    const ap = allowedPaysRef.current;

    countryData.forEach((c) => {
      const isAllowed = ap === null || ap.includes(c.code);

      const marker = L.circleMarker(
        [c.coordinates[1], c.coordinates[0]],
        {
          radius:      18,
          fillColor:   isAllowed ? COUNTRY_COLORS[c.code] : "#bfbfbf",
          color:       "#fff",
          weight:      3,
          fillOpacity: isAllowed ? 0.88 : 0.4,
        }
      );

      const tooltipContent = isAllowed
        ? `<div class="map-tooltip">${FLAG[c.code] ?? ""} <strong>${c.name}</strong></div>`
        : `<div class="map-tooltip map-tooltip--locked">🔒 ${c.name} <span class="map-tooltip-sub">accès restreint</span></div>`;

      marker.bindTooltip(tooltipContent, {
        permanent:  false,
        direction:  "top",
        className:  "map-tooltip-container",
      });

      if (isAllowed) {
        marker.on("click", () => setSelectedCountry(c.code));
        marker.getElement && (marker.options.cursor = "pointer");
      }

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

  // ── Mise à jour visuelle au changement de pays sélectionné ──────────────────
  useEffect(() => {
    const ap = allowedPaysRef.current;

    Object.keys(markersRef.current).forEach((code) => {
      const marker    = markersRef.current[code];
      const isAllowed = ap === null || ap.includes(code);

      if (!isAllowed) return; // les marqueurs grisés restent grisés

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
      // Fly uniquement si ce pays est autorisé (sécurité supplémentaire)
      const isAllowed = ap === null || ap.includes(country.code);
      if (isAllowed) {
        mapRef.current.flyTo(
          [country.coordinates[1], country.coordinates[0]],
          country.zoomLevel,
          { duration: 0.8, easeLinearity: 0.3 }
        );
      }
    } else {
      mapRef.current.flyTo([-10, -58], 3, { duration: 0.8, easeLinearity: 0.3 });
    }
  }, [selectedCountry]);

  return <div ref={containerRef} className="leaflet-world-map" />;
};

export default WorldMap;
