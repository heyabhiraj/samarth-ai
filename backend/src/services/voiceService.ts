import type { Env, SupportedLanguage, VoiceQueryRequest, VoiceQueryResponse } from "../types";
import { ANTI_HALLUCINATION_INSTRUCTION, generateJSON } from "./geminiService";

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  hi: "Hindi",
  en: "English",
  te: "Telugu",
  ta: "Tamil",
  kn: "Kannada",
  mr: "Marathi",
  pa: "Punjabi",
  gu: "Gujarati",
  bn: "Bengali",
};

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
}
