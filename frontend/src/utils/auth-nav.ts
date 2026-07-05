import { isLoggedIn } from "@/utils/auth";
import { t } from "@/utils/i18n";

function updateAuthNav() {
  const link = document.getElementById("auth-nav-link") as HTMLAnchorElement | null;
  const label = document.getElementById("auth-nav-label");
  if (!link || !label) return;

  if (isLoggedIn()) {
    link.href = "/account";
    label.dataset.i18n = "nav.myAccount";
    label.textContent = t("nav.myAccount");
  } else {
    link.href = "/login";
    label.dataset.i18n = "nav.login";
    label.textContent = t("nav.login");
  }
}

document.addEventListener("DOMContentLoaded", updateAuthNav);
document.addEventListener("astro:page-load", updateAuthNav);
window.addEventListener("kisan:auth-change", updateAuthNav);
window.addEventListener("kisan:language-change", updateAuthNav);
