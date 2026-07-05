import { Chart, type ChartConfiguration } from "chart.js/auto";

interface ChartSpec {
  type: "line" | "bar";
  labels: string[];
  datasets: Array<{ label: string; data: number[]; color?: string }>;
}

const PALETTE = ["#16a34a", "#0ea5e9", "#f59e0b", "#e11d48", "#8b5cf6"];
const instances = new Map<string, Chart>();

function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

function buildConfig(spec: ChartSpec): ChartConfiguration {
  const gridColor = isDarkMode() ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const textColor = isDarkMode() ? "#cbd5e1" : "#475569";

  return {
    type: spec.type,
    data: {
      labels: spec.labels,
      datasets: spec.datasets.map((ds, i) => {
        const color = ds.color ?? PALETTE[i % PALETTE.length];
        return {
          label: ds.label,
          data: ds.data,
          borderColor: color,
          backgroundColor: spec.type === "line" ? `${color}33` : `${color}cc`,
          borderRadius: spec.type === "bar" ? 8 : undefined,
          fill: spec.type === "line",
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: color,
        };
      }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, usePointStyle: true } },
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } },
      },
    },
  };
}

function renderCharts() {
  document.querySelectorAll<HTMLCanvasElement>("canvas[data-chart]").forEach((canvas) => {
    const raw = canvas.dataset.chart;
    if (!raw) return;

    const existing = instances.get(canvas.id);
    if (existing) {
      existing.destroy();
      instances.delete(canvas.id);
    }

    const spec = JSON.parse(raw) as ChartSpec;
    const chart = new Chart(canvas, buildConfig(spec));
    if (canvas.id) instances.set(canvas.id, chart);
  });
}

document.addEventListener("DOMContentLoaded", renderCharts);
document.addEventListener("astro:page-load", renderCharts);

const themeObserver = new MutationObserver(renderCharts);
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
