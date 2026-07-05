import type { Env, HistoryResponse } from "../types";
import { runQuery } from "./firestoreService";

const HISTORY_LIMIT = 20;

export async function getFarmerHistory(env: Env, farmerId: string): Promise<HistoryResponse> {
  const [cropRecommendations, diseaseReports, voiceQueries, alerts] = await Promise.all([
    runQuery<any>(env, "crop_recommendations", {
      filters: [{ field: "farmerId", op: "EQUAL", value: farmerId }],
      orderBy: { field: "createdAt", direction: "DESCENDING" },
      limit: HISTORY_LIMIT,
    }),
    runQuery<any>(env, "disease_reports", {
      filters: [{ field: "farmerId", op: "EQUAL", value: farmerId }],
      orderBy: { field: "createdAt", direction: "DESCENDING" },
      limit: HISTORY_LIMIT,
    }),
    runQuery<any>(env, "voice_queries", {
      filters: [{ field: "farmerId", op: "EQUAL", value: farmerId }],
      orderBy: { field: "createdAt", direction: "DESCENDING" },
      limit: HISTORY_LIMIT,
    }),
    runQuery<any>(env, "alerts", {
      filters: [{ field: "farmerId", op: "EQUAL", value: farmerId }],
      orderBy: { field: "createdAt", direction: "DESCENDING" },
      limit: HISTORY_LIMIT,
    }),
  ]);

  return {
    cropRecommendations: cropRecommendations.map((r) => ({
      id: r.id,
      state: r.state,
      district: r.district,
      season: r.season,
      aiSummary: r.aiSummary,
      confidencePct: r.confidencePct,
      createdAt: r.createdAt,
    })),
    diseaseReports: diseaseReports.map((r) => ({
      id: r.id,
      disease: r.disease,
      isHealthy: r.isHealthy,
      confidencePct: r.confidencePct,
      imageUrl: r.imageUrl,
      createdAt: r.createdAt,
    })),
    voiceQueries: voiceQueries.map((r) => ({
      id: r.id,
      queryText: r.queryText,
      answerText: r.answerText,
      language: r.language,
      createdAt: r.createdAt,
    })),
    alerts: alerts.map((r) => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      title: r.title,
      message: r.message,
      createdAt: r.createdAt,
    })),
  };
}
