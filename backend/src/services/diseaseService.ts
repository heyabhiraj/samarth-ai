import type { DiseaseDetectionResult, Env } from "../types";
import { analyzeImageJSON } from "./geminiService";
import { uploadObject } from "./gcsService";
import { arrayBufferToBase64 } from "../utils/googleCrypto";

const DISEASE_SCHEMA = {
  type: "object",
  properties: {
    disease: { type: "string" },
    isHealthy: { type: "boolean" },
    confidencePct: { type: "number" },
    treatment: { type: "array", items: { type: "string" } },
    fertilizerRecommendation: { type: "array", items: { type: "string" } },
    expertRecommendation: { type: "string" },
    reasoning: { type: "string" },
  },
  required: [
    "disease",
    "isHealthy",
    "confidencePct",
    "treatment",
    "fertilizerRecommendation",
    "expertRecommendation",
    "reasoning",
  ],
};

export async function detectDisease(
  env: Env,
  imageBuffer: ArrayBuffer,
  mimeType: string,
  cropName: string | undefined,
  requestUrl: string
): Promise<DiseaseDetectionResult> {
  const key = `disease/${crypto.randomUUID()}.${mimeType.split("/")[1] ?? "jpg"}`;

  await uploadObject(env, key, imageBuffer, mimeType);

  const base64Image = arrayBufferToBase64(imageBuffer);

  const prompt = `Analyze this crop leaf/plant image${cropName ? ` (crop: ${cropName})` : ""} for disease or pest damage.
Identify the specific disease (or state "Healthy" if no disease is visible), your confidence, step-by-step treatment instructions,
fertilizer recommendations if relevant, and when the farmer should consult a Rythu Seva Kendra / agricultural expert in person.
Reference visible symptoms (leaf color, spots, wilting, texture) in your reasoning. Do not invent a disease if the image is unclear —
lower confidencePct and say so instead.`;

  const result = await analyzeImageJSON<{
    disease: string;
    isHealthy: boolean;
    confidencePct: number;
    treatment: string[];
    fertilizerRecommendation: string[];
    expertRecommendation: string;
    reasoning: string;
  }>(env, base64Image, mimeType, prompt, DISEASE_SCHEMA);

  const origin = new URL(requestUrl).origin;

  return {
    imageUrl: `${origin}/api/images/${key}`,
    disease: result.disease,
    confidencePct: result.confidencePct,
    isHealthy: result.isHealthy,
    treatment: result.treatment,
    fertilizerRecommendation: result.fertilizerRecommendation,
    expertRecommendation: result.expertRecommendation,
    reasoning: result.reasoning,
    detectedAt: new Date().toISOString(),
  };
}
