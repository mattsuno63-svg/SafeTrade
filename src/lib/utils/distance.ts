/**
 * Calcola la distanza tra due coordinate geografiche usando la formula Haversine
 * @param lat1 Latitudine punto 1
 * @param lon1 Longitudine punto 1
 * @param lat2 Latitudine punto 2
 * @param lon2 Longitudine punto 2
 * @returns Distanza in chilometri
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Raggio della Terra in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Coordinate approssimative delle province italiane
 * Nota: Per una soluzione più precisa, usare un servizio di geocoding
 */
const PROVINCE_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'Ragusa': { lat: 36.9269, lon: 14.7255 },
  'Milano': { lat: 45.4642, lon: 9.1900 },
  'Roma': { lat: 41.9028, lon: 12.4964 },
  'Napoli': { lat: 40.8518, lon: 14.2681 },
  'Torino': { lat: 45.0703, lon: 7.6869 },
  'Palermo': { lat: 38.1157, lon: 13.3613 },
  'Firenze': { lat: 43.7696, lon: 11.2558 },
  'Bologna': { lat: 44.4949, lon: 11.3426 },
  'Genova': { lat: 44.4056, lon: 8.9463 },
  'Venezia': { lat: 45.4408, lon: 12.3155 },
  // Aggiungi altre province principali se necessario
}

/**
 * Ottiene coordinate approssimative per una provincia
 * In produzione, usare un servizio di geocoding (es. Google Maps API)
 */
export function getProvinceCoordinates(province: string): { lat: number; lon: number } | null {
  return PROVINCE_COORDINATES[province] || null
}

/**
 * Calcola distanza tra due province (approssimativa)
 */
export function calculateProvinceDistance(
  province1: string,
  province2: string
): number | null {
  const coords1 = getProvinceCoordinates(province1)
  const coords2 = getProvinceCoordinates(province2)
  
  if (!coords1 || !coords2) {
    return null
  }
  
  return calculateDistance(coords1.lat, coords1.lon, coords2.lat, coords2.lon)
}

