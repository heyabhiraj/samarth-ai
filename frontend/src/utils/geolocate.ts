import { api } from "@/services/api";

export interface DetectedLocation {
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  precise: boolean;
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

/**
 * Detects the caller's state/district from browser geolocation, so a farmer
 * never has to type it in. Throws with a friendly message on denial/failure
 * so callers can show a toast and fall back to manual entry.
 */
export async function detectLocation(): Promise<DetectedLocation> {
  let position: GeolocationPosition;
  try {
    position = await getCurrentPosition();
  } catch (err) {
    const geoErr = err as GeolocationPositionError;
    if (geoErr?.code === 1) {
      throw new Error("Location access was denied. Please enter your location manually.");
    }
    throw new Error("Could not detect your location. Please enter it manually.");
  }

  const { latitude, longitude } = position.coords;
  const result = await api.reverseGeocode(latitude, longitude);
  return { ...result };
}
