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
  try {
    syncHandler?.(pref);
  } catch {
    /* saving to the account is best effort */
  }
}

/**
 * Per-account theme (2026-10-31). The app registers a handler that saves a
 * choice to the signed-in person's account; `applyServerTheme` is called once
 * the account is known. The account value wins; if the account has none but
 * this browser has a choice, that choice is pushed up so it follows the person.
 */
let syncHandler: ((pref: ThemePreference) => void) | null = null;
export function setThemeSyncHandler(fn: ((pref: ThemePreference) => void) | null): void {
  syncHandler = fn;
}

export function applyServerTheme(serverPref: ThemePreference | null | undefined): void {
  if (serverPref === "light" || serverPref === "dark" || serverPref === "system") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, serverPref);
    } catch {
      /* applies for this page view only */
    }
    applyTheme(serverPref);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: serverPref }));
    return;
  }
  try {
    const local = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (local === "light" || local === "dark" || local === "system") syncHandler?.(local);
  } catch {
    /* nothing to push */
  }
}

/** Inline script for <head>: sets data-theme before first paint (no flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");if(p!=="light"&&p!=="dark"&&p!=="system")p="light";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
