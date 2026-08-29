"use client";
// EduCam — invitation à installer l'application.
//
// L'audit a relevé que la PWA n'était jamais proposée : `beforeinstallprompt`
// n'apparaissait nulle part dans le code. Or c'est l'audience qui gagne le plus
// à installer — une fois installée, l'application ne recharge plus son enveloppe
// à chaque ouverture, ce qui économise des données payantes.
//
// Deux précautions volontaires :
//   · on n'invite qu'après quelques ouvertures, pour ne pas interrompre
//     quelqu'un qui découvre le produit ;
//   · un refus est mémorisé et respecté pendant 30 jours.

import { useEffect, useState } from "react";
import { COLORS, FONT } from "../lib/theme";
import { Button } from "./ui";

const SEEN_KEY = "educam_install_dismissed_until";
const VISITS_KEY = "educam_visits";
const MIN_VISITS = 3;
const SNOOZE_DAYS = 30;

export default function InstallPrompt({ enabled = true }) {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Déjà installée : rien à proposer.
    const installed =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;
    if (installed) return;

    let visits = 0;
    try {
      visits = Number(localStorage.getItem(VISITS_KEY) || 0) + 1;
      localStorage.setItem(VISITS_KEY, String(visits));
      const until = Number(localStorage.getItem(SEEN_KEY) || 0);
      if (until && until > Date.now()) return; // refus encore valable
    } catch (_) { /* stockage indisponible : on n'insiste pas */ }

    const onPrompt = (e) => {
      e.preventDefault();          // on choisit NOTRE moment
      setDeferred(e);
      if (visits >= MIN_VISITS) setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setVisible(false));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [enabled]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
    } catch (_) {}
  };

  const install = async () => {
    if (!deferred) return dismiss();
    setVisible(false);
    try {
      deferred.prompt();
      await deferred.userChoice;
    } catch (_) {}
    setDeferred(null);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="ec-install-title"
      style={{
        position: "fixed", left: 12, right: 12,
        bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
        zIndex: 60, display: "flex", justifyContent: "center",
      }}
    >
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: 12, padding: 15, maxWidth: 460, width: "100%",
        boxShadow: "0 8px 28px rgba(14,17,22,.18)",
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span aria-hidden="true" style={{
            width: 40, height: 40, borderRadius: 11, flex: "none",
            background: COLORS.g50, color: COLORS.g600,
            display: "grid", placeItems: "center", fontSize: "var(--ec-fs-5)",
          }}>⤓</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="ec-install-title" style={{ fontSize: FONT.md, fontWeight: 700, color: COLORS.ink }}>
              Installer EduCam sur votre téléphone
            </div>
            <p style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 4, lineHeight: 1.5 }}>
              L'application s'ouvre plus vite et consomme moins de données.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
          <Button variant="ghost" size="sm" block onClick={dismiss}>Plus tard</Button>
          <Button size="sm" block onClick={install}>Installer</Button>
        </div>
      </div>
    </div>
  );
}
