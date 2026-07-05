import type { Env, GeoLocation, SatelliteData } from "../types";
import { withCache, cacheKey } from "../utils/cache";

/**
 * Real NDVI requires a Sentinel Hub (or NASA AppEEARS) subscription. When
 * SENTINEL_HUB_CLIENT_ID/SECRET are configured, replace simulateNdvi() with
 * a call to the Sentinel Hub Statistical API for the farmer's plot polygon.
 */
function classifyHealth(ndvi: number): SatelliteData["vegetationHealth"] {
  if (ndvi < 0.2) return "poor";
  if (ndvi < 0.4) return "moderate";
  if (ndvi < 0.6) return "good";
  return "excellent";
}

function simulateSatellite(location: GeoLocation): SatelliteData {
  const seed = location.district.length * 11 + location.state.length * 2;
  const ndvi = Number((0.15 + ((seed % 60) / 100)).toFixed(2));
  const vegetationHealth = classifyHealth(ndvi);
  const healthScore = Math.round(ndvi * 100);

  return {
    location,
    ndvi,
    vegetationHealth,
    cropStressDetected: ndvi < 0.35,
    healthScore,
    falseColorImageUrl: null,
    source: "simulated",
    fetchedAt: new Date().toISOString(),
  };
}

export async function getSatelliteData(env: Env, location: GeoLocation): Promise<SatelliteData> {
  const key = cacheKey("satellite", location);
  return withCache(env, key, 60 * 60 * 12, async () => {
    // Real integration point: if (env.SENTINEL_HUB_CLIENT_ID) { ... }
    return simulateSatellite(location);
  });
}
