export type Season = "kharif" | "rabi" | "zaid";

export type SupportedLanguage = "hi" | "en" | "te" | "ta" | "kn" | "mr" | "pa" | "gu" | "bn";

export interface GeoLocation {
  state: string;
  district: string;
  village?: string;
  latitude: number;
  longitude: number;
}

export interface DailyForecast {
  date: string;
  minTempC: number;
  maxTempC: number;
  rainProbabilityPct: number;
  precipitationMm: number;
  humidityPct: number;
  windKph: number;
  uvIndex: number;
  condition: string;
}

export interface WeatherData {
  location: GeoLocation;
  current: {
    tempC: number;
    humidityPct: number;
    windKph: number;
    uvIndex: number;
    condition: string;
    rainLast24hMm: number;
  };
  forecast: DailyForecast[];
  source: "open-meteo" | "simulated";
  fetchedAt: string;
}

export interface SoilData {
  location: GeoLocation;
  ph: number;
  organicCarbonPct: number;
  nitrogenKgHa: number;
  phosphorusKgHa: number;
  potassiumKgHa: number;
  texture: string;
  moisturePct: number;
  source: "soilgrids" | "simulated";
  fetchedAt: string;
}

export type WaterRisk = "low" | "moderate" | "high" | "critical";

export interface GroundwaterData {
  location: GeoLocation;
  depthMeters: number;
  availabilityStatus: "safe" | "semi-critical" | "critical" | "over-exploited";
  rechargeTrend: "rising" | "stable" | "declining";
  waterRisk: WaterRisk;
  recommendedIrrigationMethod: string;
  irrigationReasoning: string;
  source: "india-wris" | "simulated";
  fetchedAt: string;
}

export interface SatelliteData {
  location: GeoLocation;
  ndvi: number;
  vegetationHealth: "poor" | "moderate" | "good" | "excellent";
  cropStressDetected: boolean;
  healthScore: number;
  falseColorImageUrl: string | null;
  source: "sentinel-hub" | "simulated";
  fetchedAt: string;
}

export interface RecommendedCrop {
  cropName: string;
  expectedYieldQuintalPerAcre: number;
  waterRequirementMm: number;
  riskLevel: "low" | "medium" | "high";
  confidencePct: number;
  reasons: string[];
}

export interface CropRecommendationResponse {
  location: GeoLocation;
  season: Season;
  inputsUsed: {
    weather: WeatherData;
    soil: SoilData;
    groundwater: GroundwaterData;
    satellite: SatelliteData;
  };
  recommendations: RecommendedCrop[];
  aiSummary: string;
  confidencePct: number;
  generatedAt: string;
}

export interface DiseaseDetectionResult {
  imageUrl: string;
  disease: string;
  confidencePct: number;
  isHealthy: boolean;
  treatment: string[];
  fertilizerRecommendation: string[];
  expertRecommendation: string;
  reasoning: string;
  detectedAt: string;
}

export interface VoiceQueryResponse {
  answer: string;
  language: SupportedLanguage;
  confidencePct: number;
}

export type AlertType = "dry-spell" | "rain" | "disease" | "fertilizer" | "harvest" | "general";

export interface AdvisoryAlert {
  type: AlertType;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  smsText: string;
  createdAt: string;
}

export interface CropReference {
  name: string;
  category: "cereal" | "pulse" | "oilseed" | "cash-crop" | "vegetable" | "fruit";
  seasons: Season[];
  waterNeed: "low" | "medium" | "high";
  avgDurationDays: number;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

// ---------- Accounts ----------
export interface FarmerPreferences {
  preferredLanguage: SupportedLanguage;
  state?: string;
  district?: string;
  village?: string;
  landAreaAcres?: number;
  defaultSeason?: Season;
  homeLatitude?: number;
  homeLongitude?: number;
}

export interface Friend {
  id: string;
  name: string;
  phoneNumber: string;
  createdAt: string;
}

export interface GovtScheme {
  name: string;
  level: "national" | "state";
  category: string;
  benefit: string;
  eligibility: string;
  howToApply: string;
  officialSource: string;
}

export interface SchemesResponse {
  state: string;
  language: SupportedLanguage;
  schemes: GovtScheme[];
  disclaimer: string;
}

export interface PlantingWithStatus {
  id: string;
  cropName: string;
  sowingDate: string;
  avgDurationDays: number;
  expectedHarvestDate: string;
  createdAt: string;
  daysSinceSowing: number;
  daysToHarvest: number;
  progressPct: number;
  stage: "sowing" | "growing" | "maturing" | "harvest-ready" | "overdue";
}

export interface Escalation {
  id: string;
  diseaseReportId?: string;
  disease: string;
  imageUrl?: string;
  note?: string;
  state: string;
  district: string;
  referralOffice: string;
  helplineNumber: string;
  referenceCode: string;
  status: "submitted" | "in-review" | "resolved";
  createdAt: string;
}

export interface Farmer {
  id: string;
  name: string;
  phoneNumber: string;
  preferences: FarmerPreferences;
  createdAt: string;
}

export interface SessionResponse {
  farmer: Farmer;
  isNewFarmer: boolean;
}

export interface HistoryResponse {
  cropRecommendations: Array<{ id: string; state: string; district: string; season: Season; aiSummary: string; confidencePct: number; createdAt: string }>;
  diseaseReports: Array<{ id: string; disease: string; isHealthy: boolean; confidencePct: number; imageUrl: string; createdAt: string }>;
  voiceQueries: Array<{ id: string; queryText: string; answerText: string; language: SupportedLanguage; createdAt: string }>;
  alerts: Array<{ id: string; type: AlertType; severity: string; title: string; message: string; createdAt: string }>;
}
