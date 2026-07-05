// Cloudflare Worker environment bindings.
// Persistence (DB/storage/cache) lives on Google Cloud (Firestore, Cloud
// Storage) and is reached over plain REST + a service account, since Workers
// can't hold the persistent connections Cloud SQL / Memorystore would need.
// Auth is Firebase Authentication (Phone/SMS OTP) — GCP_PROJECT_ID doubles as
// the Firebase project ID (a Firebase project *is* a GCP project) and is used
// to validate ID token issuer/audience; no separate auth secret is needed
// since token verification is pure public-key crypto (see firebaseAuthService.ts).
export interface Env {
  GCP_PROJECT_ID: string;
  GCP_SERVICE_ACCOUNT_EMAIL: string;
  GCP_SERVICE_ACCOUNT_PRIVATE_KEY: string;
  GCS_BUCKET_NAME: string;

  GEMINI_API_KEY: string;
  GEMINI_TEXT_MODEL: string;
  GEMINI_VISION_MODEL: string;

  SENTINEL_HUB_CLIENT_ID?: string;
  SENTINEL_HUB_CLIENT_SECRET?: string;
  INDIA_WRIS_API_KEY?: string;

  OPEN_METEO_BASE_URL: string;
  OPEN_METEO_GEOCODE_URL: string;
  SOILGRIDS_BASE_URL: string;

  SMS_PROVIDER: string;
  SMS_API_KEY?: string;
  SMS_SENDER_ID: string;
}

export type Season = "kharif" | "rabi" | "zaid";

export type SupportedLanguage =
  | "hi"
  | "en"
  | "te"
  | "ta"
  | "kn"
  | "mr"
  | "pa"
  | "gu"
  | "bn";

export interface GeoLocation {
  state: string;
  district: string;
  village?: string;
  latitude: number;
  longitude: number;
}

// ---------- Weather ----------
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

// ---------- Soil ----------
export interface SoilData {
  location: GeoLocation;
  ph: number;
  organicCarbonPct: number;
  nitrogenKgHa: number;
  phosphorusKgHa: number;
  potassiumKgHa: number;
  texture: "sandy" | "loamy" | "clayey" | "silty" | "sandy-loam" | "clay-loam";
  moisturePct: number;
  source: "soilgrids" | "simulated";
  fetchedAt: string;
}

// ---------- Groundwater ----------
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

// ---------- Satellite / NDVI ----------
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

// ---------- Crop Recommendation ----------
export interface CropRecommendationRequest {
  state: string;
  district: string;
  village?: string;
  landAreaAcres: number;
  season: Season;
  cropPreference?: string;
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

// ---------- Disease Detection ----------
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

// ---------- Voice Assistant ----------
export interface VoiceQueryRequest {
  query: string;
  language: SupportedLanguage;
  context?: {
    state?: string;
    district?: string;
  };
}

export interface VoiceQueryResponse {
  answer: string;
  language: SupportedLanguage;
  confidencePct: number;
}

// ---------- Advisory / Alerts ----------
export type AlertType =
  | "dry-spell"
  | "rain"
  | "disease"
  | "fertilizer"
  | "harvest"
  | "general";

export interface AdvisoryAlert {
  type: AlertType;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  smsText: string;
  createdAt: string;
}

export interface DrySpellCheckRequest {
  state: string;
  district: string;
  village?: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------- Accounts ----------
export interface FarmerPreferences {
  preferredLanguage: SupportedLanguage;
  state?: string;
  district?: string;
  village?: string;
  landAreaAcres?: number;
  defaultSeason?: Season;
}

// Farmer document ID is the Firebase Authentication UID — the account
// itself (phone verification via SMS OTP) is entirely handled by Firebase;
// this is just the farmer's saved profile/preferences.
export interface Farmer {
  id: string;
  name: string;
  phoneNumber: string;
  preferences: FarmerPreferences;
  createdAt: string;
}

export type PublicFarmer = Farmer;

export interface SessionResponse {
  farmer: PublicFarmer;
  isNewFarmer: boolean;
}

export interface HistoryResponse {
  cropRecommendations: Array<{ id: string; state: string; district: string; season: Season; aiSummary: string; confidencePct: number; createdAt: string }>;
  diseaseReports: Array<{ id: string; disease: string; isHealthy: boolean; confidencePct: number; imageUrl: string; createdAt: string }>;
  voiceQueries: Array<{ id: string; queryText: string; answerText: string; language: SupportedLanguage; createdAt: string }>;
  alerts: Array<{ id: string; type: AlertType; severity: string; title: string; message: string; createdAt: string }>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
