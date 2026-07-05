import type { DailyForecast, Env, GeoLocation, WeatherData } from "../types";
import { withCache, cacheKey } from "../utils/cache";

function weatherCodeToCondition(code: number): string {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

async function fetchFromOpenMeteo(env: Env, location: GeoLocation): Promise<WeatherData> {
  const url = new URL(`${env.OPEN_METEO_BASE_URL}/forecast`);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,uv_index"
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max,uv_index_max,weather_code"
  );
  url.searchParams.set("timezone", "Asia/Kolkata");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`open-meteo responded ${res.status}`);
  const json = (await res.json()) as any;

  const forecast: DailyForecast[] = json.daily.time.map((date: string, i: number) => ({
    date,
    minTempC: json.daily.temperature_2m_min[i],
    maxTempC: json.daily.temperature_2m_max[i],
    rainProbabilityPct: json.daily.precipitation_probability_max?.[i] ?? 0,
    precipitationMm: json.daily.precipitation_sum?.[i] ?? 0,
    humidityPct: json.daily.relative_humidity_2m_mean?.[i] ?? 0,
    windKph: json.daily.wind_speed_10m_max?.[i] ?? 0,
    uvIndex: json.daily.uv_index_max?.[i] ?? 0,
    condition: weatherCodeToCondition(json.daily.weather_code?.[i] ?? 0),
  }));

  return {
    location,
    current: {
      tempC: json.current.temperature_2m,
      humidityPct: json.current.relative_humidity_2m,
      windKph: json.current.wind_speed_10m,
      uvIndex: json.current.uv_index ?? forecast[0]?.uvIndex ?? 0,
      condition: weatherCodeToCondition(json.current.weather_code ?? 0),
      rainLast24hMm: json.current.precipitation ?? 0,
    },
    forecast,
    source: "open-meteo",
    fetchedAt: new Date().toISOString(),
  };
}

function simulateWeather(location: GeoLocation): WeatherData {
  const seed = location.district.length + location.state.length;
  const forecast: DailyForecast[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      date: date.toISOString().slice(0, 10),
      minTempC: 22 + ((seed + i) % 5),
      maxTempC: 32 + ((seed + i) % 6),
      rainProbabilityPct: (seed * (i + 1) * 13) % 100,
      precipitationMm: ((seed * (i + 2)) % 40),
      humidityPct: 50 + ((seed + i) % 30),
      windKph: 8 + ((seed + i) % 15),
      uvIndex: 4 + ((seed + i) % 6),
      condition: (seed + i) % 3 === 0 ? "Rain" : "Partly cloudy",
    };
  });

  return {
    location,
    current: {
      tempC: 28 + (seed % 5),
      humidityPct: 60,
      windKph: 12,
      uvIndex: 6,
      condition: "Partly cloudy",
      rainLast24hMm: 0,
    },
    forecast,
    source: "simulated",
    fetchedAt: new Date().toISOString(),
  };
}

export async function getWeather(env: Env, location: GeoLocation): Promise<WeatherData> {
  const key = cacheKey("weather", location);
  return withCache(env, key, 60 * 30, async () => {
    try {
      return await fetchFromOpenMeteo(env, location);
    } catch {
      return simulateWeather(location);
    }
  });
}
