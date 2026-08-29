"use client";
// EduCam — dialogues et retours d'action.
//
// Répond à deux constats de l'audit :
//   · aucune confirmation sur les suppressions (élève, observation, créneau,
//     section, bloc, exercice) ;
//   · les erreurs étaient avalées en silence (`catch (_) {}`), l'utilisateur
//     croyant son action enregistrée.

import { useEffect, useRef, useState, useCallback } from "react";
import { COLORS, FONT } from "../lib/theme";
import { Button } from "./ui";

/* -------------------------------------------------------------------------- */
/* Dialogue de confirmation                                                    */
/* -------------------------------------------------------------------------- */
/**
 * Confirmation bloquante pour une action irréversible.
 * `title` doit NOMMER l'objet concerné (« Retirer Ngo Bell Adèle ? »), et
 * `children` doit énoncer la conséquence réelle (ce qui sera perdu).
 */
export function ConfirmDialog({
  open, title, children,
  confirmLabel = "Confirmer", cancelLabel = "Annuler",
  destructive = false, busy = false, onConfirm, onCancel,
}) {
  const panelRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.();
      if (e.key !== "Tab") return;
      // Piège de focus : le clavier ne doit pas sortir du dialogue.
      const f = panelRef.current?.querySelectorAll("button, [href], input, select, textarea");
      if (!f || !f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="ec-sheet-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel?.(); }}
    >
      <div
        ref={panelRef}
        className="ec-sheet"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ec-confirm-title"
      >
        <h2 id="ec-confirm-title" style={{ fontSize: "var(--ec-fs-4)", fontWeight: 800, letterSpacing: "-.02em" }}>
          {title}
        </h2>
        {children ? (
          <div style={{ fontSize: FONT.md, color: COLORS.ink2, marginTop: 9, lineHeight: 1.55 }}>
            {children}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
          <Button variant="ghost" block onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={destructive ? "dangerSolid" : "primary"}
            block
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "En cours…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Notifications éphémères                                                     */
/* -------------------------------------------------------------------------- */
const TONES = {
  success: { bg: "#0A3626", fg: "#FFFFFF", icon: "✓" },
  error:   { bg: COLORS.crit, fg: "#FFFFFF", icon: "!" },
  info:    { bg: "#14161A", fg: "#FFFFFF", icon: "i" },
};

/**
 * Pile de messages courts. À utiliser partout où le code faisait `catch (_) {}` :
 * l'utilisateur doit savoir qu'une écriture a échoué.
 *
 *   const { toasts, pushToast, ToastViewport } = useToasts();
 *   ...
 *   catch (e) { pushToast("Impossible d'enregistrer la note.", "error"); }
 *   return (<>{...}<ToastViewport /></>);
 */
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((message, tone = "info", ms = 4500) => {
    const id = ++idRef.current;
    setToasts((list) => [...list, { id, message, tone }]);
    if (ms) setTimeout(() => dismiss(id), ms);
    return id;
  }, [dismiss]);

  const ToastViewport = useCallback(() => (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: "fixed", left: 12, right: 12, bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
        zIndex: 120, display: "grid", gap: 8, justifyItems: "center", pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const tone = TONES[t.tone] || TONES.info;
        return (
          <div
            key={t.id}
            style={{
              pointerEvents: "auto", display: "flex", alignItems: "center", gap: 10,
              background: tone.bg, color: tone.fg, borderRadius: 10,
              padding: "11px 13px", fontSize: FONT.sm, fontWeight: 600,
              maxWidth: 460, width: "100%", boxShadow: "0 6px 20px rgba(0,0,0,.22)",
            }}
          >
            <span aria-hidden="true" style={{
              width: 20, height: 20, borderRadius: 999, flex: "none",
              background: "rgba(255,255,255,.2)", display: "grid", placeItems: "center", fontSize: "var(--ec-fs-2)",
            }}>
              {tone.icon}
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Fermer"
              style={{
                background: "none", border: 0, color: tone.fg, opacity: .75,
                fontSize: "var(--ec-fs-4)", minHeight: 32, padding: "0 4px",
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  ), [toasts, dismiss]);

  return { toasts, pushToast, dismiss, ToastViewport };
}
