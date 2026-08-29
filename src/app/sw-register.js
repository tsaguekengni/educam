"use client";
import { useEffect } from "react";
import { OFFLINE_ENABLED } from "../lib/flags";

// The service worker is a PRODUCTION-ONLY feature.
//
// Under `next dev` (Turbopack) the server recompiles chunks on the fly and uses
// hot-module reloading. A service worker that caches the app shell then serves a
// stale HTML document pointing at chunks that no longer exist, the page fails to
// hydrate, Next does a full reload, the stale worker serves the stale shell
// again — an infinite reload loop that looks like "freezing / loading forever".
//
// So we register the worker ONLY in a production build AND only when offline
// mode is enabled. In every other case (dev, or offline disabled) we actively
// remove any worker + EduCam caches left over from earlier testing, so the dev
// server is never served a stale shell.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const isProd = process.env.NODE_ENV === "production";
    const shouldRun = OFFLINE_ENABLED && isProd;

    if (!shouldRun) {
      // Guarantee a clean slate: unregister any worker and drop EduCam caches.
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      if (typeof caches !== "undefined") {
        caches.keys()
          .then((keys) => keys.filter((k) => k.startsWith("educam-")).forEach((k) => caches.delete(k)))
          .catch(() => {});
      }
      return;
    }

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        // If an updated worker is waiting, activate it right away.
        if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              sw.postMessage("SKIP_WAITING");
            }
          });
        });
      } catch (_) {
        // Registration failures must never break the app.
      }
    };

    register();
  }, []);

  return null;
}
