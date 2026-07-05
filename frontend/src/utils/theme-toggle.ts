function initThemeToggles() {
  document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("kisan-theme", isDark ? "dark" : "light");
    });
  });
}

document.addEventListener("DOMContentLoaded", initThemeToggles);
document.addEventListener("astro:page-load", initThemeToggles);
