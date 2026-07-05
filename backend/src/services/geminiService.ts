import type { Env } from "../types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Gemini API returned no text content");
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
