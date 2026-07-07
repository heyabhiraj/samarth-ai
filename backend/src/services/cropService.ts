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
import { generateJSON, languageDirective } from "./geminiService";
import { CROP_REFERENCE_DATA, type CropReference } from "../data/crops";

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
  request: CropRecommendationRequest,
  language?: string
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

For each recommended crop, give expected yield (quintal/acre), water requirement (mm for the season), a risk level, a confidencePct, and 2-4 short reasons that reference the specific data above. Then give a 2-3 sentence aiSummary in simple language, and an overallConfidencePct for the whole recommendation set.${languageDirective(language ?? request.language)}`;

  let aiResult: {
    recommendations: RecommendedCrop[];
    aiSummary: string;
    overallConfidencePct: number;
  };

  try {
    aiResult = await generateJSON<{
      recommendations: RecommendedCrop[];
      aiSummary: string;
      overallConfidencePct: number;
    }>(env, prompt, RECOMMENDATION_SCHEMA);
  } catch {
    aiResult = buildHeuristicRecommendation(request, {
      weather,
      soil,
      groundwater,
      satellite,
    });
  }

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

function waterRequirementMm(waterNeed: CropReference["waterNeed"]): number {
  if (waterNeed === "low") return 350;
  if (waterNeed === "medium") return 550;
  return 900;
}

function yieldEstimate(crop: CropReference): number {
  const baseByCategory: Record<CropReference["category"], number> = {
    cereal: 18,
    pulse: 8,
    oilseed: 10,
    "cash-crop": 22,
    vegetable: 80,
    fruit: 120,
  };
  return baseByCategory[crop.category];
}

function buildHeuristicRecommendation(
  request: CropRecommendationRequest,
  data: CropRecommendationResponse["inputsUsed"]
): { recommendations: RecommendedCrop[]; aiSummary: string; overallConfidencePct: number } {
  const { weather, soil, groundwater, satellite } = data;
  const totalRainMm = weather.forecast.reduce((sum, day) => sum + day.precipitationMm, 0);
  const avgRainProbability = weather.forecast.reduce((sum, day) => sum + day.rainProbabilityPct, 0) / weather.forecast.length;
  const waterStress = groundwater.waterRisk === "high" || groundwater.waterRisk === "critical" || soil.moisturePct < 25;
  const preference = request.cropPreference?.toLowerCase().trim();

  const candidates = CROP_REFERENCE_DATA.filter((crop) => crop.seasons.includes(request.season));
  const scored = candidates
    .map((crop) => {
      let score = 50;

      if (crop.waterNeed === "low") score += waterStress ? 22 : 8;
      if (crop.waterNeed === "medium") score += waterStress ? 8 : 14;
      if (crop.waterNeed === "high") score += waterStress ? -18 : 10;
      if (crop.waterNeed === "high" && (totalRainMm > 45 || avgRainProbability > 65)) score += 10;
      if (soil.ph >= 6 && soil.ph <= 7.8) score += 8;
      if (satellite.healthScore >= 60) score += 5;
      if (preference && crop.name.toLowerCase().includes(preference)) score += 16;

      return { crop, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const recommendations = scored.map(({ crop, score }): RecommendedCrop => {
    const riskLevel: RecommendedCrop["riskLevel"] =
      waterStress && crop.waterNeed === "high" ? "high" : waterStress && crop.waterNeed === "medium" ? "medium" : "low";
    const confidencePct = Math.max(45, Math.min(78, Math.round(score)));
    const reasons = [
      `${crop.name} is suitable for the ${request.season} season.`,
      `Water need is ${crop.waterNeed}; groundwater risk is ${groundwater.waterRisk} and soil moisture is ${soil.moisturePct}%.`,
      `Forecast rain over 7 days is ${totalRainMm.toFixed(1)}mm with ${Math.round(avgRainProbability)}% average rain probability.`,
      `Soil pH is ${soil.ph} with ${soil.texture} texture.`,
    ];

    return {
      cropName: crop.name,
      expectedYieldQuintalPerAcre: yieldEstimate(crop),
      waterRequirementMm: waterRequirementMm(crop.waterNeed),
      riskLevel,
      confidencePct,
      reasons,
    };
  });

  return {
    recommendations,
    aiSummary:
      `AI service is unavailable, so this recommendation uses the app's crop rules and live data. ` +
      `For ${request.district}, ${request.state}, groundwater risk is ${groundwater.waterRisk}, soil moisture is ${soil.moisturePct}%, and forecast rain is ${totalRainMm.toFixed(1)}mm; choose lower-water crops if irrigation is limited.`,
    overallConfidencePct: recommendations.length > 0 ? Math.round(recommendations.reduce((sum, crop) => sum + crop.confidencePct, 0) / recommendations.length) : 40,
  };
}
