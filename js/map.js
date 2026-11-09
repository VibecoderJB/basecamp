// Lazy loader for Leaflet (free, from the unpkg CDN with Subresource Integrity)
// and helpers for TRAILSPEC's custom pin markers.

const LEAFLET = {
  css: { href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=' },
  js: { src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=' },
};

export const PIN_TYPES = {
  trailhead: { name: 'Trailhead', letter: 'T' },
  camp: { name: 'Campsite', letter: 'C' },
  water: { name: 'Water', letter: 'W' },
  waypoint: { name: 'Waypoint', letter: '•' },
};

let promise;
/** Load Leaflet once; resolves with window.L. Only called when the map is first shown. */
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return (promise ||= new Promise((resolve, reject) => {
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', crossOrigin: '', ...LEAFLET.css });
    const script = Object.assign(document.createElement('script'), { async: true, crossOrigin: '', ...LEAFLET.js });
    script.onload = () => resolve(window.L);
    script.onerror = () => { promise = null; link.remove(); script.remove(); reject(new Error('Leaflet failed to load')); };
    document.head.append(link, script);
  }));
}

/** Colored, lettered tag marker built from CSS (no image files needed). */
export function pinIcon(L, type) {
  const t = PIN_TYPES[type] || PIN_TYPES.waypoint;
  return L.divIcon({
    className: 'bc-marker',
    html: `<span class="pin-dot pin-${type}"><b>${t.letter}</b></span>`,
    iconSize: [28, 28], iconAnchor: [14, 30], popupAnchor: [0, -28], tooltipAnchor: [12, -18],
  });
}

/** Free OpenStreetMap standard tiles with required attribution. */
export function osmLayer(L) {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  });
}
