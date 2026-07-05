import type { Env, GeoLocation } from "../types";

// Approximate centroids used as a last-resort fallback when the geocoding
// API can't resolve a village/district name. Keeps every feature usable
// offline/without external dependency during demos.
const STATE_CENTROIDS: Record<string, { latitude: number; longitude: number }> = {
  "andhra pradesh": { latitude: 15.9129, longitude: 79.74 },
  "telangana": { latitude: 18.1124, longitude: 79.0193 },
  "karnataka": { latitude: 15.3173, longitude: 75.7139 },
  "tamil nadu": { latitude: 11.1271, longitude: 78.6569 },
  "maharashtra": { latitude: 19.7515, longitude: 75.7139 },
  "punjab": { latitude: 31.1471, longitude: 75.3412 },
  "gujarat": { latitude: 22.2587, longitude: 71.1924 },
  "west bengal": { latitude: 22.9868, longitude: 87.855 },
  "uttar pradesh": { latitude: 26.8467, longitude: 80.9462 },
  "bihar": { latitude: 25.0961, longitude: 85.3131 },
  "rajasthan": { latitude: 27.0238, longitude: 74.2179 },
  "madhya pradesh": { latitude: 22.9734, longitude: 78.6569 },
  "haryana": { latitude: 29.0588, longitude: 76.0856 },
  "kerala": { latitude: 10.8505, longitude: 76.2711 },
  "odisha": { latitude: 20.9517, longitude: 85.0985 },
};

const INDIA_FALLBACK = { latitude: 22.3511, longitude: 78.6677 };

export async function resolveLocation(
  env: Env,
  state: string,
  district: string,
  village?: string
): Promise<GeoLocation> {
  try {
    const url = new URL(`${env.OPEN_METEO_GEOCODE_URL}/search`);
    url.searchParams.set("name", village || district);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString());
    if (res.ok) {
      const json = (await res.json()) as {
        results?: Array<{
          latitude: number;
          longitude: number;
          admin1?: string;
          country_code?: string;
        }>;
      };
      const match = json.results?.find(
        (r) => r.country_code === "IN" && (!r.admin1 || r.admin1.toLowerCase().includes(state.toLowerCase().slice(0, 4)))
      ) ?? json.results?.find((r) => r.country_code === "IN");

      if (match) {
        return {
          state,
          district,
          village,
          latitude: match.latitude,
          longitude: match.longitude,
        };
      }
    }
  } catch {
    // fall through to static centroid fallback
  }

  const centroid = STATE_CENTROIDS[state.toLowerCase()] ?? INDIA_FALLBACK;
  return {
    state,
    district,
    village,
    latitude: centroid.latitude,
    longitude: centroid.longitude,
  };
}

export interface ReverseGeocodeResult {
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  /** false when Nominatim couldn't be reached/parsed and we fell back to the nearest known state centroid. */
  precise: boolean;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearestStateFallback(lat: number, lon: number): ReverseGeocodeResult {
  let nearestState = "Madhya Pradesh"; // geographic centroid of India, reasonable default
  let nearestDistance = Infinity;

  for (const [name, centroid] of Object.entries(STATE_CENTROIDS)) {
    const distance = haversineKm(lat, lon, centroid.latitude, centroid.longitude);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestState = name.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  return { state: nearestState, district: "Your Area", latitude: lat, longitude: lon, precise: false };
}

/**
 * Resolves GPS coordinates (from the browser's Geolocation API) to a
 * state/district name using OpenStreetMap Nominatim, so a farmer never has
 * to type their location — they just tap "Use My Location".
 *
 * Nominatim's free public endpoint can be slow, rate-limited, or block
 * datacenter/cloud IPs outright — that must never surface as a dead-end
 * error to a farmer standing in a field. Any failure here falls back to the
 * nearest known state centroid (Haversine distance) instead of failing.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("zoom", "8");
    url.searchParams.set("addressdetails", "1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim's usage policy requires an identifying User-Agent.
        "User-Agent": "SamarthKisanAI/1.0 (farmer advisory app; contact: support@samarthkisan.ai)",
        "Accept-Language": "en",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      console.error(`Nominatim reverse geocode failed: HTTP ${res.status}`);
      return nearestStateFallback(lat, lon);
    }

    const json = (await res.json()) as {
      address?: {
        state?: string;
        state_district?: string;
        county?: string;
        city?: string;
        town?: string;
        village?: string;
      };
    };

    const address = json.address;
    if (!address?.state) {
      console.error("Nominatim reverse geocode response had no address.state", JSON.stringify(json));
      return nearestStateFallback(lat, lon);
    }

    const district = address.state_district || address.county || address.city || address.town || address.village || address.state;

    return { state: address.state, district, latitude: lat, longitude: lon, precise: true };
  } catch (err) {
    console.error("Nominatim reverse geocode threw", err);
    return nearestStateFallback(lat, lon);
  }
}
