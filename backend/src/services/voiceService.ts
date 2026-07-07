import type { Env, VoiceQueryRequest, VoiceQueryResponse } from "../types";
import { ANTI_HALLUCINATION_INSTRUCTION, LANGUAGE_NAMES, generateJSON } from "./geminiService";

const VOICE_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    confidencePct: { type: "number" },
  },
  required: ["answer", "confidencePct"],
};

/**
 * Speech-to-text and text-to-speech run in the browser via the Web Speech
 * API (SpeechRecognition / SpeechSynthesis) to avoid requiring a paid STT/TTS
 * key for the MVP. This service only handles the text query -> AI answer step.
 */
export async function answerVoiceQuery(env: Env, request: VoiceQueryRequest): Promise<VoiceQueryResponse> {
  const languageName = LANGUAGE_NAMES[request.language];

  const prompt = `A farmer asked the following question via voice assistant, in ${languageName}:
"${request.query}"

${request.context?.state ? `Location context: ${request.context.district ?? ""}, ${request.context.state}` : "No location context provided."}

Answer the farmer's question helpfully and accurately in ${languageName} only. Keep the answer short (2-4 sentences), practical,
and easy to understand for someone with limited literacy. If the question needs data you don't have (exact weather, soil test
results, etc.), say so honestly and suggest what the farmer should check, rather than guessing. Give a confidencePct for your answer.`;

  try {
    const result = await generateJSON<{ answer: string; confidencePct: number }>(
      env,
      prompt,
      VOICE_SCHEMA,
      ANTI_HALLUCINATION_INSTRUCTION
    );

    return {
      answer: result.answer,
      language: request.language,
      confidencePct: result.confidencePct,
    };
  } catch {
    const location = request.context?.state ? ` for ${request.context.district ?? "your area"}, ${request.context.state}` : "";
    return {
      answer: `I cannot reach the AI service right now. For this question${location}, check today's weather, the top 5 cm of soil moisture, and your crop stage before acting. If leaves are wilting or the soil is dry, give a light irrigation; if rain is likely or soil is moist, wait and check again tomorrow.`,
      language: request.language,
      confidencePct: 35,
    };
  }
}
