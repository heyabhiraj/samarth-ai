export interface CropReference {
  name: string;
  category: "cereal" | "pulse" | "oilseed" | "cash-crop" | "vegetable" | "fruit";
  seasons: Array<"kharif" | "rabi" | "zaid">;
  waterNeed: "low" | "medium" | "high";
  avgDurationDays: number;
}

export const CROP_REFERENCE_DATA: CropReference[] = [
  { name: "Rice (Paddy)", category: "cereal", seasons: ["kharif"], waterNeed: "high", avgDurationDays: 120 },
  { name: "Wheat", category: "cereal", seasons: ["rabi"], waterNeed: "medium", avgDurationDays: 130 },
  { name: "Maize", category: "cereal", seasons: ["kharif", "rabi"], waterNeed: "medium", avgDurationDays: 100 },
  { name: "Bajra (Pearl Millet)", category: "cereal", seasons: ["kharif"], waterNeed: "low", avgDurationDays: 90 },
  { name: "Jowar (Sorghum)", category: "cereal", seasons: ["kharif", "rabi"], waterNeed: "low", avgDurationDays: 110 },
  { name: "Chickpea (Chana)", category: "pulse", seasons: ["rabi"], waterNeed: "low", avgDurationDays: 100 },
  { name: "Pigeon Pea (Tur/Arhar)", category: "pulse", seasons: ["kharif"], waterNeed: "low", avgDurationDays: 150 },
  { name: "Green Gram (Moong)", category: "pulse", seasons: ["kharif", "zaid"], waterNeed: "low", avgDurationDays: 65 },
  { name: "Groundnut", category: "oilseed", seasons: ["kharif", "rabi"], waterNeed: "medium", avgDurationDays: 110 },
  { name: "Soybean", category: "oilseed", seasons: ["kharif"], waterNeed: "medium", avgDurationDays: 100 },
  { name: "Mustard", category: "oilseed", seasons: ["rabi"], waterNeed: "low", avgDurationDays: 120 },
  { name: "Cotton", category: "cash-crop", seasons: ["kharif"], waterNeed: "high", avgDurationDays: 170 },
  { name: "Sugarcane", category: "cash-crop", seasons: ["kharif", "zaid"], waterNeed: "high", avgDurationDays: 330 },
  { name: "Tomato", category: "vegetable", seasons: ["rabi", "zaid"], waterNeed: "medium", avgDurationDays: 90 },
  { name: "Onion", category: "vegetable", seasons: ["rabi", "kharif"], waterNeed: "medium", avgDurationDays: 110 },
  { name: "Potato", category: "vegetable", seasons: ["rabi"], waterNeed: "medium", avgDurationDays: 90 },
  { name: "Banana", category: "fruit", seasons: ["kharif", "rabi", "zaid"], waterNeed: "high", avgDurationDays: 300 },
  { name: "Mango", category: "fruit", seasons: ["zaid"], waterNeed: "medium", avgDurationDays: 365 },
];
