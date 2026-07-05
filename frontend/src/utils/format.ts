export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function formatDayShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });
}

export function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function severityToColor(severity: "info" | "warning" | "critical"): string {
  switch (severity) {
    case "critical":
      return "border-rose-400/60 bg-rose-50/80 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200";
    case "warning":
      return "border-amber-400/60 bg-amber-50/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
    default:
      return "border-sky-400/60 bg-sky-50/80 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200";
  }
}
