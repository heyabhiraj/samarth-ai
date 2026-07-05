import type { SupportedLanguage } from "@/types";

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Bihar",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
];

export const SEASONS = [
  { value: "kharif", label: "Kharif (Jun - Oct)" },
  { value: "rabi", label: "Rabi (Nov - Mar)" },
  { value: "zaid", label: "Zaid (Apr - Jun)" },
] as const;

export const LANGUAGES: Array<{ code: SupportedLanguage; label: string; nativeLabel: string; speechLocale: string }> = [
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", speechLocale: "hi-IN" },
  { code: "en", label: "English", nativeLabel: "English", speechLocale: "en-IN" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు", speechLocale: "te-IN" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", speechLocale: "ta-IN" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", speechLocale: "kn-IN" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी", speechLocale: "mr-IN" },
  { code: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ", speechLocale: "pa-IN" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી", speechLocale: "gu-IN" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", speechLocale: "bn-IN" },
];

export const RISK_COLORS: Record<string, string> = {
  low: "text-kisan-700 bg-kisan-100 dark:text-kisan-300 dark:bg-kisan-900/40",
  medium: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
  high: "text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/40",
  moderate: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
  critical: "text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/40",
};
