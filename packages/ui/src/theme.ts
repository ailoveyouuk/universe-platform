/**
 * Light / dark / device theme preference.
 *
 * The stored preference is one of "light", "dark" or "system" (the label in
 * the UI is "Device"). The page itself only ever carries a resolved
 * `data-theme="light" | "dark"` on <html>, which is what tokens.css reads.
 * Default is "light" so nobody's experience changes until they choose.
 */
export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "u-theme";
export const THEME_EVENT = "u-theme-change";

export function getThemePreference(): ThemePreference {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage unavailable (private mode etc.) — fall through to default */
  }
  return "light";
}

export function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "system") {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "light";
    }
  }
  return pref;
}

export function applyTheme(pref: ThemePreference): void {
  document.documentElement.setAttribute("data-theme", resolveTheme(pref));
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* choice applies for this page view only */
  }
  applyTheme(pref);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: pref }));
}

/** Inline script for <head>: sets data-theme before first paint (no flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");if(p!=="light"&&p!=="dark"&&p!=="system")p="light";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
