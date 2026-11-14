/* TJ-ARCH-MOB-001 compliant */
/* Pre-paint theme (theme-behaviour.md, plan c09): a classic, render-blocking,
   same-origin script so CSP `script-src 'self'` allows it without a hash. Stored
   km-meet-theme first, then prefers-color-scheme (light), else dark. Mirrors
   infrastructure/theme/theme-adapters.ts, which takes over once the app boots. */
(() => {
  var root = document.documentElement;
  var theme = null;
  try {
    theme = window.localStorage.getItem("km-meet-theme");
  } catch (_error) {
    theme = null;
  }
  if (theme !== "dark" && theme !== "light") {
    theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
})();
