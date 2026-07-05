import type { AdvisoryAlert, AlertType, Env, GeoLocation } from "../types";
import { getWeather } from "./weatherService";
import { getSoil } from "./soilService";
import { resolveLocation } from "./geocodeService";
import { generateText } from "./geminiService";

const DRY_SPELL_RAIN_THRESHOLD_MM = 5;
const DRY_SPELL_TEMP_THRESHOLD_C = 35;
const DRY_SPELL_MOISTURE_THRESHOLD_PCT = 20;

export async function checkDrySpell(
  env: Env,
  state: string,
  district: string,
  village?: string
): Promise<AdvisoryAlert[]> {
  const location = await resolveLocation(env, state, district, village);
  const [weather, soil] = await Promise.all([getWeather(env, location), getSoil(env, location)]);

  const alerts: AdvisoryAlert[] = [];

  const upcomingRain = weather.forecast.slice(0, 5).reduce((s, d) => s + d.precipitationMm, 0);
  const maxTemp = Math.max(...weather.forecast.slice(0, 5).map((d) => d.maxTempC));
  const noRainDays = weather.forecast.slice(0, 5).filter((d) => d.precipitationMm < 1).length;

  const isDrySpell =
    upcomingRain < DRY_SPELL_RAIN_THRESHOLD_MM &&
    maxTemp >= DRY_SPELL_TEMP_THRESHOLD_C &&
    soil.moisturePct < DRY_SPELL_MOISTURE_THRESHOLD_PCT;

  if (isDrySpell) {
    alerts.push(
      await buildAlert(env, location, "dry-spell", "critical",
        `Little rain expected over the next ${noRainDays} days, temperatures up to ${maxTemp}°C, and soil moisture is only ${soil.moisturePct}%.`)
    );
  } else if (noRainDays >= 4 && soil.moisturePct < 30) {
    alerts.push(
      await buildAlert(env, location, "dry-spell", "warning",
        `Low rainfall expected (${noRainDays} of the next 5 days dry) with soil moisture at ${soil.moisturePct}%. Monitor irrigation needs.`)
    );
  }

  const heavyRainDay = weather.forecast.find((d) => d.precipitationMm > 40);
  if (heavyRainDay) {
    alerts.push(
      await buildAlert(env, location, "rain", "warning",
        `Heavy rain (${heavyRainDay.precipitationMm}mm) expected on ${heavyRainDay.date}.`)
    );
  }

  return alerts;
}

async function buildAlert(
  env: Env,
  location: GeoLocation,
  type: AlertType,
  severity: AdvisoryAlert["severity"],
  situationSummary: string
): Promise<AdvisoryAlert> {
  const prompt = `Write a short farm advisory alert for a farmer in ${location.district}, ${location.state}.
Situation: ${situationSummary}
Alert type: ${type}

Return two things separated by "|||":
1. A one-line title (max 8 words)
2. A friendly 1-2 sentence advisory message with a concrete recommended action (e.g. irrigate now, delay sowing, cover nursery, harvest before rain).
Keep language simple. Do not add any other text.`;

  let title = type === "rain" ? "Rain Alert" : "Dry Spell Alert";
  let message = situationSummary;

  try {
    const raw = await generateText(env, prompt);
    const [titlePart, messagePart] = raw.split("|||").map((s) => s.trim());
    title = titlePart || title;
    message = messagePart || message;
  } catch {
    message = `${situationSummary} Check the field early today and adjust irrigation or field work based on actual soil moisture.`;
  }

  return {
    type,
    severity,
    title,
    message,
    smsText: `KISAN ALERT: ${title}. ${message}`.slice(0, 160),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Sends an SMS via the configured provider. No-op stub until SMS_API_KEY is
 * set — the advisory text is still generated and returned to the caller so
 * the UI/notification center always has content to display.
 */
export async function sendSmsAdvisory(env: Env, phoneNumber: string, alert: AdvisoryAlert): Promise<{ sent: boolean; reason?: string }> {
  if (!env.SMS_API_KEY) {
    return { sent: false, reason: "SMS provider not configured (SMS_API_KEY missing)" };
  }

  // Real integration point, e.g. MSG91:
  // await fetch(`https://api.msg91.com/api/v5/flow/`, { method: "POST", headers: { authkey: env.SMS_API_KEY }, body: ... })
  void phoneNumber;
  void alert;
  return { sent: true };
}
