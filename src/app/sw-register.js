"use client";
import { useEffect } from "react";
import { OFFLINE_ENABLED } from "../lib/flags";

// Registers the service worker ONLY when offline mode is enabled.
// When the flag is off (default, during testing) this renders nothing and
// registers nothing — zero behavioural change. It also actively unregisters
// any stale worker if the flag gets turned back off, so toggling is clean.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (!OFFLINE_ENABLED) {
      // Safety: if offline mode was ever on and is now off, remove the worker.
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
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
