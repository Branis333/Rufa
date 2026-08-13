// Used only when the device has no real location yet (permission denied/pending).
export const FALLBACK_COORDS = { lat: 4.051, lng: 9.768 };

export function offsetKm(center, dLatKm, dLngKm) {
  return {
    lat: center.lat + dLatKm / 111,
    lng: center.lng + dLngKm / (111 * Math.cos((center.lat * Math.PI) / 180)),
  };
}

export function distanceKm(a, b) {
  const dLat = (a.lat - b.lat) * 111;
  const dLng = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export function randomPointNear(center, maxKm) {
  const r = Math.random() * maxKm;
  const angle = Math.random() * 2 * Math.PI;
  const dLat = (r * Math.cos(angle)) / 111;
  const dLng = (r * Math.sin(angle)) / (111 * Math.cos((center.lat * Math.PI) / 180));
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}

export function interpolate(from, to, fraction) {
  const t = Math.min(1, Math.max(0, fraction));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}
