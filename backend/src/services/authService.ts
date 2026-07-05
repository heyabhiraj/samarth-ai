import type { Farmer, PublicFarmer } from "../types";
import { createDocument, getDocument, setDocument } from "./firestoreService";
import type { Env } from "../types";

const FARMERS_COLLECTION = "farmers";

function toPublicFarmer(farmer: Farmer): PublicFarmer {
  return farmer;
}

export async function getFarmerById(env: Env, id: string): Promise<Farmer | null> {
  return getDocument<Farmer>(env, FARMERS_COLLECTION, id);
}

/**
 * Called right after the frontend verifies a farmer's phone number with
 * Firebase Phone Auth. The Firebase UID (from the verified ID token, never
 * client-supplied) is the Firestore document ID — first sign-in creates the
 * profile, every sign-in after that just fetches it.
 */
export async function ensureFarmerSession(
  env: Env,
  uid: string,
  phoneNumber: string | undefined
): Promise<{ farmer: PublicFarmer; isNewFarmer: boolean }> {
  const existing = await getFarmerById(env, uid);
  if (existing) {
    return { farmer: toPublicFarmer(existing), isNewFarmer: false };
  }

  const farmer = await createDocument<Farmer>(
    env,
    FARMERS_COLLECTION,
    {
      name: "Farmer",
      phoneNumber: phoneNumber ?? "",
      preferences: { preferredLanguage: "hi" },
      createdAt: new Date().toISOString(),
    },
    uid
  );

  return { farmer: toPublicFarmer(farmer), isNewFarmer: true };
}

export async function updateFarmerProfile(
  env: Env,
  farmerId: string,
  updates: { name?: string; preferences?: Partial<Farmer["preferences"]> }
): Promise<PublicFarmer> {
  const farmer = await getFarmerById(env, farmerId);
  if (!farmer) throw new Error("Farmer not found");

  const mergedPreferences = { ...farmer.preferences, ...updates.preferences };
  const { id, ...toWrite } = farmer;
  const updated = { ...toWrite, name: updates.name ?? farmer.name, preferences: mergedPreferences };

  await setDocument(env, FARMERS_COLLECTION, farmerId, updated);
  return toPublicFarmer({ ...updated, id: farmerId });
}

export { toPublicFarmer };
