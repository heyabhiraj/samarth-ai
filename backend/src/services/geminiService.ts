import type { Env, SupportedLanguage } from "../types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
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

/**
 * A strong instruction telling Gemini to write every human-readable string in
 * the farmer's chosen language while keeping the JSON structure (field names
 * and fixed enum values like "low"/"high") in English so the app can parse it.
 * Returns an empty string for English so existing prompts are unchanged.
 */
export function languageDirective(language?: string): string {
  if (!language || language === "en") return "";
  const name = LANGUAGE_NAMES[language as SupportedLanguage];
  if (!name || name === "English") return ""; // unknown/English → no directive
  return `\n\nIMPORTANT — LANGUAGE: Write every human-readable text value (titles, messages, summaries, reasons, treatment steps, recommendations, descriptions, and any disease or crop name shown to the user) in ${name} using its native script. Keep the JSON field names and fixed enum values (such as "low", "medium", "high") exactly as specified, in English. Do not mix in English sentences.`;
}

export const ANTI_HALLUCINATION_INSTRUCTION = `You are an agricultural advisor for Indian farmers. Rules you must always follow:
1. Never invent facts you were not given. Base every claim strictly on the data provided in the prompt.
2. Always explain WHY — the reasoning behind a crop, irrigation, or fertilizer recommendation must reference the specific input data (soil, weather, groundwater, satellite, or image).
3. Always state a confidencePct (0-100) reflecting how certain you are given the data quality and completeness.
4. If the provided data is insufficient to answer confidently, say so explicitly and lower the confidence score instead of guessing.
5. Keep language simple enough for a smallholder farmer with limited literacy to understand.
6. Respond ONLY in the exact JSON shape requested — no markdown, no extra commentary.`;

interface GenerateOptions {
  systemInstruction?: string;
  responseSchema?: object;
  temperature?: number;
}

async function callGemini(
  env: Env,
  model: string,
  parts: Array<Record<string, unknown>>,
  options: GenerateOptions = {}
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }
  if (!model) {
    throw new Error("Gemini model is not configured (GEMINI_TEXT_MODEL / GEMINI_VISION_MODEL)");
  }
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      ...(options.responseSchema
        ? { responseMimeType: "application/json", responseSchema: options.responseSchema }
        : {}),
    },
  };

  if (options.systemInstruction) {
    body.systemInstruction = { role: "system", parts: [{ text: options.systemInstruction }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const json = (await res.json()) as any;
  const candidate = json.candidates?.[0];
  // Gemini can return a candidate with no text when the answer is split across
  // multiple parts, or none at all when the prompt/response was blocked.
  const text = candidate?.content?.parts?.map((p: any) => p?.text).filter((t: any) => typeof t === "string").join("") ?? "";
  if (!text) {
    const reason =
      json.promptFeedback?.blockReason ??
      candidate?.finishReason ??
      "no text content returned";
    throw new Error(`Gemini API returned no usable text (${reason})`);
  }
  return text;
}

export async function generateJSON<T>(
  env: Env,
  prompt: string,
  responseSchema: object,
  systemInstruction: string = ANTI_HALLUCINATION_INSTRUCTION
): Promise<T> {
  const text = await callGemini(
    env,
    env.GEMINI_TEXT_MODEL,
    [{ text: prompt }],
    { systemInstruction, responseSchema }
  );
  return JSON.parse(text) as T;
}

export async function generateText(
  env: Env,
  prompt: string,
  systemInstruction: string = ANTI_HALLUCINATION_INSTRUCTION
): Promise<string> {
  return callGemini(env, env.GEMINI_TEXT_MODEL, [{ text: prompt }], { systemInstruction });
}

export async function analyzeImageJSON<T>(
  env: Env,
  base64Image: string,
  mimeType: string,
  prompt: string,
  responseSchema: object
): Promise<T> {
  const text = await callGemini(
    env,
    env.GEMINI_VISION_MODEL,
    [
      { text: prompt },
      { inlineData: { mimeType, data: base64Image } },
    ],
    { systemInstruction: ANTI_HALLUCINATION_INSTRUCTION, responseSchema, temperature: 0.2 }
  );
  return JSON.parse(text) as T;
}
