import L from "leaflet";
import "leaflet/dist/leaflet.css";

const maps = new Map<string, L.Map>();

function initMaps() {
  document.querySelectorAll<HTMLDivElement>("[data-map]").forEach((el) => {
    if (maps.has(el.id)) return;

    const lat = Number(el.dataset.lat);
    const lng = Number(el.dataset.lng);
    const label = el.dataset.label ?? "Your farm";
    const ndvi = el.dataset.ndvi ? Number(el.dataset.ndvi) : null;

    const map = L.map(el, { zoomControl: true, attributionControl: false }).setView([lat, lng], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    const color = ndvi === null ? "#16a34a" : ndvi > 0.5 ? "#16a34a" : ndvi > 0.3 ? "#f59e0b" : "#e11d48";

    L.circle([lat, lng], { radius: 800, color, fillColor: color, fillOpacity: 0.25 }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindPopup(label);

    maps.set(el.id, map);
  });
}

document.addEventListener("DOMContentLoaded", initMaps);
document.addEventListener("astro:page-load", initMaps);
