import type { Env, GeoLocation, GroundwaterData, WaterRisk } from "../types";
import { withCache, cacheKey } from "../utils/cache";

/**
 * India-WRIS (https://indiawris.gov.in) exposes groundwater level data but
 * requires a partner API key that most deployments won't have during MVP.
 * When INDIA_WRIS_API_KEY is configured, wire the real call in here. Until
 * then we derive a deterministic, regionally-plausible estimate so every
 * downstream feature (irrigation advice, dry-spell alerts) keeps working.
 */
function deriveRisk(depthMeters: number, rechargeTrend: GroundwaterData["rechargeTrend"]): WaterRisk {
  if (depthMeters > 25 || (depthMeters > 15 && rechargeTrend === "declining")) return "critical";
  if (depthMeters > 15) return "high";
  if (depthMeters > 8) return "moderate";
  return "low";
}

function irrigationAdvice(risk: WaterRisk, texture: "sandy" | "loamy" | "clayey"): { method: string; reasoning: string } {
  if (risk === "critical" || risk === "high") {
    return {
      method: "Drip irrigation",
      reasoning:
        "Groundwater levels are declining and depth is high, so drip irrigation is recommended to cut water use by 30-50% while maintaining root-zone moisture.",
    };
  }
  if (texture === "sandy") {
    return {
      method: "Sprinkler irrigation",
      reasoning: "Sandy soil drains quickly; sprinkler systems apply water evenly and reduce percolation losses compared to flood irrigation.",
    };
  }
  return {
    method: "Furrow / alternate-wetting irrigation",
    reasoning: "Groundwater availability is currently adequate; furrow or alternate-wetting-drying irrigation balances yield with water conservation.",
  };
}

function simulateGroundwater(location: GeoLocation): GroundwaterData {
  const seed = location.district.length * 5 + location.state.length * 3;
  const depthMeters = Number((3 + (seed % 28)).toFixed(1));
  const trendRoll = seed % 3;
  const rechargeTrend: GroundwaterData["rechargeTrend"] = trendRoll === 0 ? "rising" : trendRoll === 1 ? "stable" : "declining";
  const waterRisk = deriveRisk(depthMeters, rechargeTrend);
  const availabilityStatus: GroundwaterData["availabilityStatus"] =
    waterRisk === "critical" ? "over-exploited" : waterRisk === "high" ? "critical" : waterRisk === "moderate" ? "semi-critical" : "safe";

  const texture = seed % 3 === 0 ? "sandy" : seed % 3 === 1 ? "loamy" : "clayey";
  const advice = irrigationAdvice(waterRisk, texture);

  return {
    location,
    depthMeters,
    availabilityStatus,
    rechargeTrend,
    waterRisk,
    recommendedIrrigationMethod: advice.method,
    irrigationReasoning: advice.reasoning,
    source: "simulated",
    fetchedAt: new Date().toISOString(),
  };
}

export async function getGroundwater(env: Env, location: GeoLocation): Promise<GroundwaterData> {
  const key = cacheKey("groundwater", location);
  return withCache(env, key, 60 * 60 * 24, async () => {
    // Real integration point: if (env.INDIA_WRIS_API_KEY) { ... }
    return simulateGroundwater(location);
  });
}
