import { TRANSLATIONS, type UILanguage } from "@/i18n/translations";

const STORAGE_KEY = "kisan-ui-language";
const DEFAULT_LANGUAGE: UILanguage = "hi";

export function getUILanguage(): UILanguage {
  const stored = localStorage.getItem(STORAGE_KEY) as UILanguage | null;
  if (stored && stored in TRANSLATIONS["nav.home"]) return stored;
  return DEFAULT_LANGUAGE;
}

export function t(key: string): string {
  const lang = getUILanguage();
  const entry = TRANSLATIONS[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en;
}

export function setUILanguage(lang: UILanguage) {
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations();
  window.dispatchEvent(new CustomEvent("kisan:language-change", { detail: { lang } }));
}

export function applyTranslations() {
  const lang = getUILanguage();

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    const entry = TRANSLATIONS[key];
    if (!entry) return;
    el.textContent = entry[lang] ?? entry.en;
  });

  document.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (!key) return;
    const entry = TRANSLATIONS[key];
    if (!entry) return;
    el.placeholder = entry[lang] ?? entry.en;
  });

  document.documentElement.setAttribute("data-ui-lang", lang);
}

document.addEventListener("DOMContentLoaded", applyTranslations);
document.addEventListener("astro:page-load", applyTranslations);
window.addEventListener("kisan:language-change", applyTranslations);
