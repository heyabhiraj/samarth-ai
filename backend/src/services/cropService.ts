import type {
  CropRecommendationRequest,
  CropRecommendationResponse,
  Env,
  RecommendedCrop,
} from "../types";
import { resolveLocation } from "./geocodeService";
import { getWeather } from "./weatherService";
import { getSoil } from "./soilService";
import { getGroundwater } from "./groundwaterService";
import { getSatelliteData } from "./satelliteService";
import { generateJSON } from "./geminiService";

const RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          cropName: { type: "string" },
          expectedYieldQuintalPerAcre: { type: "number" },
          waterRequirementMm: { type: "number" },
          riskLevel: { type: "string", enum: ["low", "medium", "high"] },
          confidencePct: { type: "number" },
          reasons: { type: "array", items: { type: "string" } },
        },
        required: [
          "cropName",
          "expectedYieldQuintalPerAcre",
          "waterRequirementMm",
          "riskLevel",
          "confidencePct",
          "reasons",
        ],
      },
    },
    aiSummary: { type: "string" },
    overallConfidencePct: { type: "number" },
  },
  required: ["recommendations", "aiSummary", "overallConfidencePct"],
};

export async function recommendCrops(
  env: Env,
  request: CropRecommendationRequest
): Promise<CropRecommendationResponse> {
  const location = await resolveLocation(env, request.state, request.district, request.village);

  const [weather, soil, groundwater, satellite] = await Promise.all([
    getWeather(env, location),
    getSoil(env, location),
    getGroundwater(env, location),
    getSatelliteData(env, location),
  ]);

  const prompt = `A farmer needs crop recommendations. Analyze the data below and recommend the 3 most suitable crops.

FARM DETAILS:
- State: ${request.state}, District: ${request.district}${request.village ? `, Village: ${request.village}` : ""}
- Land area: ${request.landAreaAcres} acres
- Season: ${request.season}
- Crop preference (if any): ${request.cropPreference ?? "none specified"}

WEATHER (7-day forecast, source: ${weather.source}):
- Current temp: ${weather.current.tempC}°C, humidity: ${weather.current.humidityPct}%
- Avg rain probability next 7 days: ${Math.round(weather.forecast.reduce((s, d) => s + d.rainProbabilityPct, 0) / weather.forecast.length)}%
- Total forecast precipitation: ${weather.forecast.reduce((s, d) => s + d.precipitationMm, 0).toFixed(0)}mm

SOIL (source: ${soil.source}):
- pH: ${soil.ph}, texture: ${soil.texture}, organic carbon: ${soil.organicCarbonPct}%
- N: ${soil.nitrogenKgHa} kg/ha, P: ${soil.phosphorusKgHa} kg/ha, K: ${soil.potassiumKgHa} kg/ha
- Moisture: ${soil.moisturePct}%

GROUNDWATER (source: ${groundwater.source}):
- Depth: ${groundwater.depthMeters}m, status: ${groundwater.availabilityStatus}, trend: ${groundwater.rechargeTrend}, risk: ${groundwater.waterRisk}

SATELLITE / NDVI (source: ${satellite.source}):
- NDVI: ${satellite.ndvi}, vegetation health: ${satellite.vegetationHealth}, health score: ${satellite.healthScore}/100

For each recommended crop, give expected yield (quintal/acre), water requirement (mm for the season), a risk level, a confidencePct, and 2-4 short reasons that reference the specific data above. Then give a 2-3 sentence aiSummary in simple language, and an overallConfidencePct for the whole recommendation set.`;

  const aiResult = await generateJSON<{
    recommendations: RecommendedCrop[];
    aiSummary: string;
    overallConfidencePct: number;
  }>(env, prompt, RECOMMENDATION_SCHEMA);

  return {
    location,
    season: request.season,
    inputsUsed: { weather, soil, groundwater, satellite },
    recommendations: aiResult.recommendations,
    aiSummary: aiResult.aiSummary,
    confidencePct: aiResult.overallConfidencePct,
    generatedAt: new Date().toISOString(),
  };
}
