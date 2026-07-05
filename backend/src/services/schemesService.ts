import type { Env, GovtScheme, SchemesResponse, SupportedLanguage } from "../types";
import { generateJSON } from "./geminiService";
import { withCache } from "../utils/cache";

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

const SCHEMES_SCHEMA = {
  type: "object",
  properties: {
    schemes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          level: { type: "string", enum: ["national", "state"] },
          category: { type: "string" },
          benefit: { type: "string" },
          eligibility: { type: "string" },
          howToApply: { type: "string" },
          officialSource: { type: "string" },
        },
        required: ["name", "level", "category", "benefit", "eligibility", "howToApply", "officialSource"],
      },
    },
  },
  required: ["schemes"],
};

const DISCLAIMERS: Partial<Record<SupportedLanguage, string>> = {
  en: "Scheme details can change. Always verify eligibility and apply only through official government portals or your local agriculture office / Rythu Seva Kendra.",
  hi: "योजना की जानकारी बदल सकती है। पात्रता की पुष्टि हमेशा सरकारी पोर्टल या अपने स्थानीय कृषि कार्यालय से करें।",
  bn: "প্রকল্পের বিবরণ পরিবর্তিত হতে পারে। যোগ্যতা সর্বদা সরকারি পোর্টাল বা স্থানীয় কৃষি অফিস থেকে যাচাই করুন।",
  mr: "योजनेचे तपशील बदलू शकतात. पात्रता नेहमी सरकारी पोर्टल किंवा स्थानिक कृषी कार्यालयातून तपासा.",
  te: "పథకం వివరాలు మారవచ్చు. అర్హతను ఎల్లప్పుడూ ప్రభుత్వ పోర్టల్ లేదా స్థానిక వ్యవసాయ కార్యాలయం నుండి ధృవీకరించండి.",
  ta: "திட்ட விவரங்கள் மாறலாம். தகுதியை எப்போதும் அரசு போர்ட்டல் அல்லது உள்ளூர் வேளாண் அலுவலகத்தில் சரிபார்க்கவும்.",
};

/**
 * Gemini-generated list of active government schemes relevant to farmers in
 * a given state, in the farmer's language. Cached for 24h per state+language
 * (schemes change rarely; Gemini calls are the expensive part). The prompt
 * explicitly restricts output to well-known schemes and the UI always shows
 * a "verify at official sources" disclaimer — LLM output here is a signpost,
 * not an authority.
 */
export async function getGovtSchemes(env: Env, state: string, language: SupportedLanguage): Promise<SchemesResponse> {
  const key = `schemes:${state}:${language}`.toLowerCase().replace(/\s+/g, "-");

  return withCache(env, key, 60 * 60 * 24, async () => {
    const languageName = LANGUAGE_NAMES[language];

    const prompt = `List 6 to 8 currently active Indian government schemes that help farmers in ${state}, India.
Include a mix of major national (central government) schemes and ${state} state-specific schemes if any well-known ones exist.

STRICT RULES:
- Only include real, well-established schemes you are confident exist (for example: PM-KISAN, Pradhan Mantri Fasal Bima Yojana, Kisan Credit Card, Soil Health Card, PM Krishi Sinchayee Yojana, eNAM).
- If you are not confident a state-specific scheme exists, include fewer schemes rather than inventing one.
- "officialSource" must be the official portal name or well-known URL (e.g. "pmkisan.gov.in") — never invent URLs.
- Write "name" in ${languageName} with the official English/Hindi scheme name in brackets if the languages differ.
- Write "benefit", "eligibility" and "howToApply" in simple ${languageName} that a farmer with limited literacy can understand (1-2 short sentences each).
- "category" is one short word/phrase in ${languageName} like income support, crop insurance, credit, irrigation, market access.`;

    const result = await generateJSON<{ schemes: GovtScheme[] }>(env, prompt, SCHEMES_SCHEMA);

    return {
      state,
      language,
      schemes: result.schemes,
      disclaimer: DISCLAIMERS[language] ?? DISCLAIMERS.en!,
    };
  });
}
