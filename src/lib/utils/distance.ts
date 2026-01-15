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
 * Coordinate delle principali città italiane
 * Coordinate centro città (per calcolo distanza approssimativo)
 * In produzione, usare un servizio di geocoding (es. Google Maps Geocoding API)
 */
const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  // Nord
  'Milano': { lat: 45.4642, lon: 9.1900 },
  'Torino': { lat: 45.0703, lon: 7.6869 },
  'Genova': { lat: 44.4056, lon: 8.9463 },
  'Venezia': { lat: 45.4408, lon: 12.3155 },
  'Bologna': { lat: 44.4949, lon: 11.3426 },
  'Firenze': { lat: 43.7696, lon: 11.2558 },
  'Verona': { lat: 45.4384, lon: 10.9916 },
  'Padova': { lat: 45.4064, lon: 11.8768 },
  'Brescia': { lat: 45.5416, lon: 10.2118 },
  'Bergamo': { lat: 45.6940, lon: 9.6773 },
  'Parma': { lat: 44.8015, lon: 10.3279 },
  'Modena': { lat: 44.6471, lon: 10.9252 },
  'Reggio Emilia': { lat: 44.6989, lon: 10.6297 },
  'Piacenza': { lat: 45.0522, lon: 9.6934 },
  'Mantova': { lat: 45.1564, lon: 10.7914 },
  'Cremona': { lat: 45.1327, lon: 10.0225 },
  'Vicenza': { lat: 45.5455, lon: 11.5353 },
  'Treviso': { lat: 45.6669, lon: 12.2430 },
  'Udine': { lat: 46.0715, lon: 13.2346 },
  'Trieste': { lat: 45.6495, lon: 13.7768 },
  'Bolzano': { lat: 46.4983, lon: 11.3548 },
  'Trento': { lat: 46.0748, lon: 11.1217 },
  
  // Centro
  'Roma': { lat: 41.9028, lon: 12.4964 },
  'Napoli': { lat: 40.8518, lon: 14.2681 },
  'Palermo': { lat: 38.1157, lon: 13.3613 },
  'Catania': { lat: 37.5079, lon: 15.0830 },
  'Messina': { lat: 38.1938, lon: 15.5540 },
  'Bari': { lat: 41.1177, lon: 16.8719 },
  'Taranto': { lat: 40.4640, lon: 17.2470 },
  'Cagliari': { lat: 39.2238, lon: 9.1217 },
  'Ancona': { lat: 43.6158, lon: 13.5189 },
  'Perugia': { lat: 43.1122, lon: 12.3888 },
  'Pescara': { lat: 42.4588, lon: 14.2138 },
  'L\'Aquila': { lat: 42.3505, lon: 13.3995 },
  'Terni': { lat: 42.5632, lon: 12.6438 },
  'Arezzo': { lat: 43.4632, lon: 11.8799 },
  'Pisa': { lat: 43.7228, lon: 10.4017 },
  'Livorno': { lat: 43.5500, lon: 10.3100 },
  'Siena': { lat: 43.3188, lon: 11.3307 },
  'Prato': { lat: 43.8808, lon: 11.0966 },
  
  // Sud
  'Salerno': { lat: 40.6824, lon: 14.7681 },
  'Caserta': { lat: 41.0732, lon: 14.3279 },
  'Foggia': { lat: 41.4621, lon: 15.5446 },
  'Lecce': { lat: 40.3522, lon: 18.1699 },
  'Brindisi': { lat: 40.6383, lon: 17.9458 },
  'Potenza': { lat: 40.6418, lon: 15.8079 },
  'Cosenza': { lat: 39.3099, lon: 16.2502 },
  'Catanzaro': { lat: 38.9108, lon: 16.5874 },
  'Reggio Calabria': { lat: 38.1112, lon: 15.6619 },
  'Siracusa': { lat: 37.0755, lon: 15.2866 },
  'Ragusa': { lat: 36.9269, lon: 14.7255 },
  'Trapani': { lat: 38.0176, lon: 12.5364 },
  'Agrigento': { lat: 37.3089, lon: 13.5767 },
  'Enna': { lat: 37.5676, lon: 14.2790 },
  'Caltanissetta': { lat: 37.4902, lon: 14.0625 },
  
  // Altre città importanti
  'Pavia': { lat: 45.1847, lon: 9.1582 },
  'Como': { lat: 45.8081, lon: 9.0852 },
  'Varese': { lat: 45.8206, lon: 8.8251 },
  'Alessandria': { lat: 44.9133, lon: 8.6150 },
  'Asti': { lat: 44.8990, lon: 8.2060 },
  'Novara': { lat: 45.4469, lon: 8.6222 },
  'Biella': { lat: 45.5660, lon: 8.0536 },
  'Vercelli': { lat: 45.3217, lon: 8.4233 },
  'Savona': { lat: 44.3073, lon: 8.4767 },
  'La Spezia': { lat: 44.1027, lon: 9.8248 },
  'Massa': { lat: 44.0225, lon: 10.1147 },
  'Lucca': { lat: 43.8430, lon: 10.5079 },
  'Grosseto': { lat: 42.7606, lon: 11.1137 },
  'Frosinone': { lat: 41.6400, lon: 13.3500 },
  'Latina': { lat: 41.4677, lon: 12.9036 },
  'Viterbo': { lat: 42.4174, lon: 12.1087 },
  'Rieti': { lat: 42.4042, lon: 12.8624 },
  'Fermo': { lat: 43.1606, lon: 13.7169 },
  'Ascoli Piceno': { lat: 42.8535, lon: 13.5749 },
  'Macerata': { lat: 43.3002, lon: 13.4536 },
  'Teramo': { lat: 42.6588, lon: 13.7038 },
  'Chieti': { lat: 42.3512, lon: 14.1674 },
  'L\'Aquila': { lat: 42.3505, lon: 13.3995 },
  'Campobasso': { lat: 41.5607, lon: 14.6674 },
  'Isernia': { lat: 41.6006, lon: 14.2380 },
  'Avellino': { lat: 40.9150, lon: 14.7898 },
  'Benevento': { lat: 41.1296, lon: 14.7821 },
  'Barletta': { lat: 41.3200, lon: 16.2817 },
  'Andria': { lat: 41.2312, lon: 16.2980 },
  'Trani': { lat: 41.2774, lon: 16.4100 },
  'Matera': { lat: 40.6667, lon: 16.6000 },
  'Nuoro': { lat: 40.3215, lon: 9.3296 },
  'Oristano': { lat: 39.9050, lon: 8.5919 },
  'Sassari': { lat: 40.7259, lon: 8.5557 },
  'Olbia': { lat: 40.9234, lon: 9.4980 },
}

/**
 * Normalizza il nome della città per il matching (rimuove accenti, maiuscole, spazi)
 */
function normalizeCityName(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
    .replace(/\s+/g, ' ') // Normalizza spazi
}

/**
 * Trova le coordinate di una città (con matching flessibile)
 */
export function getCityCoordinates(city: string | null): { lat: number; lon: number } | null {
  if (!city) return null
  
  const normalized = normalizeCityName(city)
  
  // Match esatto (case-insensitive, senza accenti)
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (normalizeCityName(key) === normalized) {
      return coords
    }
  }
  
  // Match parziale (es. "Milano" matcha "Milano Centro")
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    const normalizedKey = normalizeCityName(key)
    if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
      return coords
    }
  }
  
  return null
}

/**
 * Calcola distanza tra due città (in km)
 * Restituisce null se una delle città non è trovata
 */
export function calculateCityDistance(
  city1: string | null,
  city2: string | null
): number | null {
  if (!city1 || !city2) return null
  
  const coords1 = getCityCoordinates(city1)
  const coords2 = getCityCoordinates(city2)
  
  if (!coords1 || !coords2) {
    return null
  }
  
  return calculateDistance(coords1.lat, coords1.lon, coords2.lat, coords2.lon)
}

/**
 * @deprecated Usa calculateCityDistance invece
 * Mantenuto per retrocompatibilità
 */
export function getProvinceCoordinates(province: string): { lat: number; lon: number } | null {
  return getCityCoordinates(province)
}

/**
 * @deprecated Usa calculateCityDistance invece
 * Mantenuto per retrocompatibilità
 */
export function calculateProvinceDistance(
  province1: string,
  province2: string
): number | null {
  return calculateCityDistance(province1, province2)
}

