import { isLoggedIn } from "@/utils/auth";
import { t } from "@/utils/i18n";

function updateAuthNav() {
  const link = document.getElementById("auth-nav-link") as HTMLAnchorElement | null;
  const label = document.getElementById("auth-nav-label");
  const homeLink = document.getElementById("home-nav-link") as HTMLAnchorElement | null;

  const loggedIn = isLoggedIn();

  // "Home" takes signed-in farmers straight to their dashboard (/account),
  // and everyone else to the public landing page (/).
  if (homeLink) homeLink.href = loggedIn ? "/account" : "/";

  if (!link || !label) return;

  if (loggedIn) {
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
