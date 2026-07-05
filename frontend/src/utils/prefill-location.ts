import { isLoggedIn } from "@/utils/auth";
import { api } from "@/services/api";
import type { Farmer } from "@/types";

let cachedProfile: Farmer | null = null;

async function prefillForms() {
  if (!isLoggedIn()) return;

  const forms = document.querySelectorAll<HTMLFormElement>("[data-location-form]");
  if (forms.length === 0) return;

  if (!cachedProfile) {
    try {
      cachedProfile = await api.profile.get();
    } catch {
      return;
    }
  }

  const prefs = cachedProfile.preferences;

  forms.forEach((form) => {
    const stateEl = form.elements.namedItem("state") as HTMLSelectElement | null;
    const districtEl = form.elements.namedItem("district") as HTMLInputElement | null;
    const villageEl = form.elements.namedItem("village") as HTMLInputElement | null;
    const landEl = form.elements.namedItem("landAreaAcres") as HTMLInputElement | null;
    const seasonEl = form.elements.namedItem("season") as HTMLSelectElement | null;

    if (stateEl && !stateEl.value && prefs.state) stateEl.value = prefs.state;
    if (districtEl && !districtEl.value && prefs.district) districtEl.value = prefs.district;
    if (villageEl && !villageEl.value && prefs.village) villageEl.value = prefs.village;
    if (landEl && !landEl.value && prefs.landAreaAcres) landEl.value = String(prefs.landAreaAcres);
    if (seasonEl && !seasonEl.value && prefs.defaultSeason) seasonEl.value = prefs.defaultSeason;
  });
}

document.addEventListener("DOMContentLoaded", prefillForms);
document.addEventListener("astro:page-load", prefillForms);
window.addEventListener("kisan:auth-change", prefillForms);
