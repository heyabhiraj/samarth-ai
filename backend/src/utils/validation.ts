import { z } from "zod";

export const geoLocationInputSchema = z.object({
  state: z.string().min(2).max(60),
  district: z.string().min(2).max(60),
  village: z.string().max(80).optional(),
});

export const cropRecommendationSchema = geoLocationInputSchema.extend({
  landAreaAcres: z.number().positive().max(10000),
  season: z.enum(["kharif", "rabi", "zaid"]),
  cropPreference: z.string().max(60).optional(),
});

export const drySpellCheckSchema = geoLocationInputSchema;

export const groundwaterQuerySchema = geoLocationInputSchema;

export const satelliteQuerySchema = geoLocationInputSchema;

export const weatherQuerySchema = geoLocationInputSchema;

export const soilQuerySchema = geoLocationInputSchema;

export const voiceQuerySchema = z.object({
  query: z.string().min(1).max(2000),
  language: z.enum(["hi", "en", "te", "ta", "kn", "mr", "pa", "gu", "bn"]),
  context: z
    .object({
      state: z.string().optional(),
      district: z.string().optional(),
    })
    .optional(),
});

export const diseaseDetectionSchema = z.object({
  cropName: z.string().max(60).optional(),
});

export const reverseGeocodeSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

const LANGUAGE_ENUM = z.enum(["hi", "en", "te", "ta", "kn", "mr", "pa", "gu", "bn"]);

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  preferredLanguage: LANGUAGE_ENUM.optional(),
  state: z.string().max(60).optional(),
  district: z.string().max(60).optional(),
  village: z.string().max(80).optional(),
  landAreaAcres: z.number().positive().max(10000).optional(),
  defaultSeason: z.enum(["kharif", "rabi", "zaid"]).optional(),
});

export type CropRecommendationInput = z.infer<typeof cropRecommendationSchema>;
export type VoiceQueryInput = z.infer<typeof voiceQuerySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
