/**
 * Geo utilities shared across API routes.
 */

/** Haversine great-circle distance in kilometres. */
export function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(d) { return d * Math.PI / 180; }

/**
 * Calculate delivery fee in KES.
 * Free within FREE_KM. KSh RATE_PER_KM per km beyond that.
 */
const FREE_KM       = 5;
const RATE_PER_KM   = 50; // KSh per km beyond free zone

export function calcDeliveryFee(distanceKm) {
  if (distanceKm == null || distanceKm <= FREE_KM) return 0;
  return Math.round((distanceKm - FREE_KM) * RATE_PER_KM);
}
