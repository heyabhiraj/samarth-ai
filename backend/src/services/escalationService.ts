import type { Env, Escalation } from "../types";
import { createDocument, runQuery } from "./firestoreService";

const ESCALATIONS_COLLECTION = "escalations";
const MAX_ESCALATIONS = 50;

// The Kisan Call Centre is a real, stable, toll-free national helpline
// (agriculture queries in 22 languages). Safe to hardcode; we never invent
// local office phone numbers, which an LLM would happily hallucinate.
const KISAN_CALL_CENTRE = "1800-180-1551";

// State-specific name for the local farmer service point. Different states
// brand these differently; where we don't have a specific name we fall back
// to the generic District/Mandal Agriculture Office wording.
const STATE_OFFICE_NAME: Record<string, string> = {
  "andhra pradesh": "your nearest Rythu Seva Kendra (RSK)",
  "telangana": "your nearest Rythu Vedika / Mandal Agriculture Office",
  "karnataka": "your nearest Raitha Samparka Kendra",
  "tamil nadu": "your nearest Agricultural Extension Centre",
  "maharashtra": "your nearest Krishi Vibhag / Taluka Agriculture Office",
  "punjab": "your nearest Krishi Vigyan Kendra (KVK)",
  "gujarat": "your nearest Krishi Seva Kendra",
  "west bengal": "your nearest Krishi Bhavan (Block Agriculture Office)",
  "uttar pradesh": "your nearest Krishi Vigyan Kendra (KVK)",
  "bihar": "your nearest Krishi Vigyan Kendra (KVK)",
  "rajasthan": "your nearest Krishi Vigyan Kendra (KVK)",
  "madhya pradesh": "your nearest Krishi Vigyan Kendra (KVK)",
  "haryana": "your nearest Krishi Vigyan Kendra (KVK)",
  "kerala": "your nearest Krishi Bhavan",
  "odisha": "your nearest Krishi Vigyan Kendra (KVK)",
};

function referralOfficeFor(state: string): string {
  return STATE_OFFICE_NAME[state.toLowerCase().trim()] ?? "your nearest District / Mandal Agriculture Office";
}

// Short human-readable reference code, e.g. "SKA-4F2K9" — derived from a UUID
// so it's unique without exposing the full internal id.
function referenceCode(): string {
  const raw = crypto.randomUUID().replace(/-/g, "").toUpperCase();
  return `SKA-${raw.slice(0, 5)}`;
}

export async function createEscalation(
  env: Env,
  farmerId: string,
  input: { diseaseReportId?: string; disease: string; imageUrl?: string; note?: string; state: string; district: string }
): Promise<Escalation> {
  const escalation = await createDocument<Escalation>(env, ESCALATIONS_COLLECTION, {
    farmerId,
    diseaseReportId: input.diseaseReportId,
    disease: input.disease,
    imageUrl: input.imageUrl,
    note: input.note,
    state: input.state,
    district: input.district,
    referralOffice: referralOfficeFor(input.state),
    helplineNumber: KISAN_CALL_CENTRE,
    referenceCode: referenceCode(),
    status: "submitted",
    createdAt: new Date().toISOString(),
  });

  return escalation;
}

export async function listEscalations(env: Env, farmerId: string): Promise<Escalation[]> {
  const results = await runQuery<Escalation>(env, ESCALATIONS_COLLECTION, {
    filters: [{ field: "farmerId", op: "EQUAL", value: farmerId }],
    limit: MAX_ESCALATIONS,
  });
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
