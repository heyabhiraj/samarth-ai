export type ToastVariant = "success" | "error" | "info";

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "border-kisan-400/50 bg-kisan-50/95 text-kisan-800 dark:bg-kisan-950/90 dark:text-kisan-200",
  error: "border-rose-400/50 bg-rose-50/95 text-rose-800 dark:bg-rose-950/90 dark:text-rose-200",
  info: "border-sky-400/50 bg-sky-50/95 text-sky-800 dark:bg-sky-950/90 dark:text-sky-200",
};

export function showToast(message: string, variant: ToastVariant = "info", durationMs = 4000) {
  const root = document.getElementById("toast-root");
  if (!root) return;

  const toast = document.createElement("div");
  toast.className = `pointer-events-auto w-full max-w-sm animate-slide-up rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur ${VARIANT_CLASSES[variant]}`;
  toast.textContent = message;
  root.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 300ms ease";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}

declare global {
  interface Window {
    showToast: typeof showToast;
  }
}

window.showToast = showToast;
