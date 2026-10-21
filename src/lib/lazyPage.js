import { lazy } from "react";

// After a deploy the old build's page files are deleted. A tab opened
// before the deploy still asks for them, gets index.html back and fails
// with "Failed to fetch dynamically imported module". Reload once so the
// browser picks up the new build. The timestamp stops a reload loop if
// the file is really missing.
const KEY = "registra-chunk-reload-at";
const WINDOW_MS = 10000;

function reloadOnce() {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Storage blocked: still try a single reload.
  }
  window.location.reload();
  return true;
}

// React.lazy that reloads the page once when the page file can't load.
export function lazyPage(factory) {
  return lazy(() =>
    factory().catch((error) => {
      // Keep Suspense waiting while the page reloads.
      if (reloadOnce()) return new Promise(() => {});
      throw error;
    }),
  );
}
