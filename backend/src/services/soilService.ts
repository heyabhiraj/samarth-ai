import type { Env, GeoLocation, SoilData } from "../types";
import { withCache, cacheKey } from "../utils/cache";

function classifyTexture(sand: number, clay: number): SoilData["texture"] {
  if (sand > 60) return "sandy";
  if (clay > 45) return "clayey";
  if (clay > 30 && sand < 30) return "clay-loam";
  if (sand > 45 && clay < 20) return "sandy-loam";
  if (clay > 25) return "silty";
  return "loamy";
}

async function fetchFromSoilGrids(env: Env, location: GeoLocation): Promise<SoilData> {
  const url = new URL(`${env.SOILGRIDS_BASE_URL}/properties/query`);
  url.searchParams.set("lon", String(location.longitude));
  url.searchParams.set("lat", String(location.latitude));
  for (const prop of ["phh2o", "soc", "nitrogen", "sand", "clay"]) {
    url.searchParams.append("property", prop);
  }
  url.searchParams.set("depth", "0-5cm");
  url.searchParams.set("value", "mean");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`soilgrids responded ${res.status}`);
  const json = (await res.json()) as any;

  const layers: any[] = json.properties?.layers ?? [];
  const getMean = (name: string, divisor: number) => {
    const layer = layers.find((l) => l.name === name);
    const mean = layer?.depths?.[0]?.values?.mean;
    return typeof mean === "number" ? mean / divisor : null;
  };

  const ph = getMean("phh2o", 10);
  const soc = getMean("soc", 10); // dg/kg -> g/kg approx
  const nitrogen = getMean("nitrogen", 100); // cg/kg -> g/kg approx
  const sand = getMean("sand", 10);
  const clay = getMean("clay", 10);

  if (ph === null || sand === null || clay === null) {
    throw new Error("soilgrids incomplete response");
  }

  return {
    location,
    ph: Number(ph.toFixed(1)),
    organicCarbonPct: soc !== null ? Number((soc / 10).toFixed(2)) : 0.5,
    nitrogenKgHa: nitrogen !== null ? Math.round(nitrogen * 20) : 250,
    phosphorusKgHa: 22, // SoilGrids does not expose P/K; approximate regional average
    potassiumKgHa: 180,
    texture: classifyTexture(sand, clay),
    moisturePct: 28,
    source: "soilgrids",
    fetchedAt: new Date().toISOString(),
  };
}

function simulateSoil(location: GeoLocation): SoilData {
  const seed = location.district.length * 7 + location.state.length;
  const textures: SoilData["texture"][] = ["sandy", "loamy", "clayey", "silty", "sandy-loam", "clay-loam"];
  return {
    location,
    ph: Number((6 + (seed % 20) / 10).toFixed(1)),
    organicCarbonPct: Number((0.4 + (seed % 10) / 10).toFixed(2)),
    nitrogenKgHa: 200 + (seed % 150),
    phosphorusKgHa: 15 + (seed % 30),
    potassiumKgHa: 120 + (seed % 200),
    texture: textures[seed % textures.length],
    moisturePct: 20 + (seed % 25),
    source: "simulated",
    fetchedAt: new Date().toISOString(),
  };
}

export async function getSoil(env: Env, location: GeoLocation): Promise<SoilData> {
  const key = cacheKey("soil", location);
  return withCache(env, key, 60 * 60 * 24, async () => {
    try {
      return await fetchFromSoilGrids(env, location);
    } catch {
      return simulateSoil(location);
    }
  });
}
