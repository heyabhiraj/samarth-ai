import type { Env, Planting, PlantingWithStatus } from "../types";
import { createDocument, deleteDocument, getDocument, runQuery } from "./firestoreService";
import { CROP_REFERENCE_DATA } from "../data/crops";

const PLANTINGS_COLLECTION = "plantings";
const MAX_PLANTINGS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

/** Authoritative crop duration from the reference table; falls back to a client hint or 110 days. */
export function resolveCropDuration(cropName: string, hint?: number): number {
  const match = CROP_REFERENCE_DATA.find((c) => c.name.toLowerCase() === cropName.toLowerCase());
  if (match) return match.avgDurationDays;
  if (hint && hint > 0) return hint;
  return 110;
}

function withStatus(planting: Planting): PlantingWithStatus {
  const today = new Date().toISOString().slice(0, 10);
  const daysSinceSowing = Math.max(0, daysBetween(planting.sowingDate, today));
  const daysToHarvest = daysBetween(today, planting.expectedHarvestDate);
  const progressPct = Math.max(0, Math.min(100, Math.round((daysSinceSowing / planting.avgDurationDays) * 100)));

  let stage: PlantingWithStatus["stage"];
  if (daysToHarvest < 0) stage = "overdue";
  else if (daysToHarvest <= 7) stage = "harvest-ready";
  else if (progressPct >= 70) stage = "maturing";
  else if (progressPct >= 10) stage = "growing";
  else stage = "sowing";

  return { ...planting, daysSinceSowing, daysToHarvest, progressPct, stage };
}

export async function listPlantings(env: Env, farmerId: string): Promise<PlantingWithStatus[]> {
  const results = await runQuery<Planting>(env, PLANTINGS_COLLECTION, {
    filters: [{ field: "farmerId", op: "EQUAL", value: farmerId }],
    limit: MAX_PLANTINGS,
  });
  return results
    .map(withStatus)
    // Soonest-to-harvest first — that's what the farmer needs to act on.
    .sort((a, b) => a.daysToHarvest - b.daysToHarvest);
}

export async function addPlanting(
  env: Env,
  farmerId: string,
  input: { cropName: string; sowingDate: string; avgDurationDays?: number }
): Promise<PlantingWithStatus> {
  const existing = await runQuery<Planting>(env, PLANTINGS_COLLECTION, {
    filters: [{ field: "farmerId", op: "EQUAL", value: farmerId }],
    limit: MAX_PLANTINGS,
  });
  if (existing.length >= MAX_PLANTINGS) {
    throw new Error(`You can track up to ${MAX_PLANTINGS} plantings`);
  }

  const avgDurationDays = resolveCropDuration(input.cropName, input.avgDurationDays);
  const expectedHarvestDate = addDays(input.sowingDate, avgDurationDays);

  const planting = await createDocument<Planting>(env, PLANTINGS_COLLECTION, {
    farmerId,
    cropName: input.cropName,
    sowingDate: input.sowingDate,
    avgDurationDays,
    expectedHarvestDate,
    createdAt: new Date().toISOString(),
  });

  return withStatus(planting);
}

export async function removePlanting(env: Env, farmerId: string, id: string): Promise<boolean> {
  const planting = await getDocument<Planting>(env, PLANTINGS_COLLECTION, id);
  if (!planting || planting.farmerId !== farmerId) return false;
  await deleteDocument(env, PLANTINGS_COLLECTION, id);
  return true;
}
