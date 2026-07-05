// Lucide SVG icon registry for use inside plain TS/JS (client scripts that
// build DOM/innerHTML dynamically, where the Astro <Icon> component can't be
// used). Mirrors the icon set in src/components/Icon.astro so dynamically
// rendered content (weather conditions, crop chips, trend arrows...) stays
// visually consistent with the rest of the app instead of falling back to
// emoji.
import Sun from "lucide-static/icons/sun.svg?raw";
import Cloud from "lucide-static/icons/cloud.svg?raw";
import CloudSun from "lucide-static/icons/cloud-sun.svg?raw";
import CloudFog from "lucide-static/icons/cloud-fog.svg?raw";
import CloudRain from "lucide-static/icons/cloud-rain.svg?raw";
import CloudLightning from "lucide-static/icons/cloud-lightning.svg?raw";
import Snowflake from "lucide-static/icons/snowflake.svg?raw";
import Wheat from "lucide-static/icons/wheat.svg?raw";
import Leaf from "lucide-static/icons/leaf.svg?raw";
import Sprout from "lucide-static/icons/sprout.svg?raw";
import Droplet from "lucide-static/icons/droplet.svg?raw";
import Droplets from "lucide-static/icons/droplets.svg?raw";
import Carrot from "lucide-static/icons/carrot.svg?raw";
import Apple from "lucide-static/icons/apple.svg?raw";
import Calendar from "lucide-static/icons/calendar.svg?raw";
import MapPin from "lucide-static/icons/map-pin.svg?raw";
import AlertTriangle from "lucide-static/icons/triangle-alert.svg?raw";
import CheckCircle from "lucide-static/icons/circle-check-big.svg?raw";
import XCircle from "lucide-static/icons/circle-x.svg?raw";
import Sparkles from "lucide-static/icons/sparkles.svg?raw";
import TrendingUp from "lucide-static/icons/trending-up.svg?raw";
import TrendingDown from "lucide-static/icons/trending-down.svg?raw";
import Minus from "lucide-static/icons/minus.svg?raw";
import Wind from "lucide-static/icons/wind.svg?raw";
import Thermometer from "lucide-static/icons/thermometer.svg?raw";
import Gauge from "lucide-static/icons/gauge.svg?raw";

const ICONS: Record<string, string> = {
  sun: Sun,
  cloud: Cloud,
  "cloud-sun": CloudSun,
  "cloud-fog": CloudFog,
  "cloud-rain": CloudRain,
  "cloud-lightning": CloudLightning,
  snowflake: Snowflake,
  wheat: Wheat,
  leaf: Leaf,
  sprout: Sprout,
  droplet: Droplet,
  droplets: Droplets,
  carrot: Carrot,
  apple: Apple,
  calendar: Calendar,
  "map-pin": MapPin,
  "alert-triangle": AlertTriangle,
  "check-circle": CheckCircle,
  "x-circle": XCircle,
  sparkles: Sparkles,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  minus: Minus,
  wind: Wind,
  thermometer: Thermometer,
  gauge: Gauge,
};

/** Returns raw SVG markup for `name` with `className` applied — safe to drop into innerHTML. */
export function svgIcon(name: keyof typeof ICONS, className = "h-5 w-5"): string {
  const markup = ICONS[name] ?? Leaf;
  return markup.replace("<svg", `<svg class="${className}"`);
}

const WEATHER_CONDITION_ICON: Record<string, keyof typeof ICONS> = {
  "Clear sky": "sun",
  "Partly cloudy": "cloud-sun",
  Fog: "cloud-fog",
  Drizzle: "cloud-rain",
  Rain: "cloud-rain",
  Snow: "snowflake",
  Thunderstorm: "cloud-lightning",
};

export function weatherConditionIcon(condition: string, className = "h-10 w-10"): string {
  return svgIcon(WEATHER_CONDITION_ICON[condition] ?? "cloud-sun", className);
}

const CROP_CATEGORY_ICON: Record<string, keyof typeof ICONS> = {
  cereal: "wheat",
  pulse: "leaf",
  oilseed: "droplet",
  "cash-crop": "sprout",
  vegetable: "carrot",
  fruit: "apple",
};

export function cropCategoryIcon(category: string, className = "h-6 w-6"): string {
  return svgIcon(CROP_CATEGORY_ICON[category] ?? "leaf", className);
}
