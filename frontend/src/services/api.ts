import type {
  AdvisoryAlert,
  ApiResponse,
  CropReference,
  CropRecommendationResponse,
  DiseaseDetectionResult,
  Farmer,
  FarmerPreferences,
  GroundwaterData,
  HistoryResponse,
  Season,
  SatelliteData,
  SessionResponse,
  SoilData,
  SupportedLanguage,
  VoiceQueryResponse,
  WeatherData,
} from "@/types";
import { getIdToken } from "@/utils/firebase";

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL ?? "http://localhost:8787";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new Error(json.error.message || "Request failed");
  }
  return json.data;
}

function locationQuery(params: { state: string; district: string; village?: string }): string {
  const search = new URLSearchParams({ state: params.state, district: params.district });
  if (params.village) search.set("village", params.village);
  return search.toString();
}

export const api = {
  getWeather: (params: { state: string; district: string; village?: string }) =>
    request<WeatherData>(`/api/weather?${locationQuery(params)}`),

  getSoil: (params: { state: string; district: string; village?: string }) =>
    request<SoilData>(`/api/soil?${locationQuery(params)}`),

  getGroundwater: (params: { state: string; district: string; village?: string }) =>
    request<GroundwaterData>(`/api/groundwater?${locationQuery(params)}`),

  getSatellite: (params: { state: string; district: string; village?: string }) =>
    request<SatelliteData>(`/api/satellite?${locationQuery(params)}`),

  getCrops: (season?: Season) => request<CropReference[]>(`/api/crops${season ? `?season=${season}` : ""}`),

  getAdvisory: (params: { state: string; district: string; village?: string }) =>
    request<{ alerts: AdvisoryAlert[] }>(`/api/advisory?${locationQuery(params)}`),

  recommendCrops: (payload: {
    state: string;
    district: string;
    village?: string;
    landAreaAcres: number;
    season: Season;
    cropPreference?: string;
  }) =>
    request<CropRecommendationResponse>("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  detectDisease: (image: File, cropName?: string) => {
    const form = new FormData();
    form.append("image", image);
    if (cropName) form.append("cropName", cropName);
    return request<DiseaseDetectionResult>("/api/disease", { method: "POST", body: form });
  },

  askVoice: (payload: { query: string; language: SupportedLanguage; context?: { state?: string; district?: string } }) =>
    request<VoiceQueryResponse>("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  sendSms: (phoneNumber: string, alert: AdvisoryAlert) =>
    request<{ sent: boolean; reason?: string }>("/api/advisory/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, alert }),
    }),

  auth: {
    /** Call right after Firebase Phone Auth confirms the OTP — materializes the Firestore profile. */
    session: () =>
      request<SessionResponse>("/api/auth/session", {
        method: "POST",
      }),

    me: () => request<Farmer>("/api/auth/me"),
  },

  profile: {
    get: () => request<Farmer>("/api/profile"),
    update: (updates: Partial<FarmerPreferences> & { name?: string }) =>
      request<Farmer>("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }),
  },

  getHistory: () => request<HistoryResponse>("/api/history"),

  reverseGeocode: (lat: number, lon: number) =>
    request<{ state: string; district: string; latitude: number; longitude: number; precise: boolean }>(
      `/api/geocode/reverse?lat=${lat}&lon=${lon}`
    ),
};
