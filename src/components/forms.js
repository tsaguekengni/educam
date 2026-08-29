"use client";
// EduCam — champs de formulaire.
//
// Corrige un défaut présent partout dans le code actuel : les <label> n'étaient
// jamais liés à leur champ (`htmlFor` absent), donc aucun lecteur d'écran
// n'annonçait le nom du champ. Ici la liaison est automatique.

import { useId, useState } from "react";
import { COLORS, FONT } from "../lib/theme";

/* -------------------------------------------------------------------------- */
/* Enveloppe de champ                                                          */
/* -------------------------------------------------------------------------- */
function FieldShell({ id, label, hint, error, required, children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{ display: "block", fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.ink2, marginBottom: 5 }}
      >
        {label}
        {required ? <span aria-hidden="true" style={{ color: COLORS.crit }}> *</span> : null}
        {required ? <span className="ec-sr"> (obligatoire)</span> : null}
      </label>
      {children({ hintId, errId })}
      {hint && !error ? (
        <div id={hintId} style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 5, lineHeight: 1.45 }}>
          {hint}
        </div>
      ) : null}
      {error ? (
        <div id={errId} role="alert" style={{ fontSize: "var(--ec-fs-2)", color: COLORS.crit, marginTop: 5, fontWeight: 600 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Champ texte                                                                 */
/* -------------------------------------------------------------------------- */
export function Field({ label, hint, error, required, type = "text", ...rest }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      {({ hintId, errId }) => (
        <input
          id={id}
          type={type}
          className="ec-input"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errId || hintId}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Mot de passe, avec bouton afficher / masquer                                */
/* -------------------------------------------------------------------------- */
export function PasswordField({ label = "Mot de passe", hint, error, required, ...rest }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      {({ hintId, errId }) => (
        <div style={{ position: "relative" }}>
          <input
            id={id}
            type={shown ? "text" : "password"}
            className="ec-input"
            style={{ paddingRight: 88 }}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={errId || hintId}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            style={{
              position: "absolute", right: 4, top: 4, height: 38, minHeight: 38,
              padding: "0 11px", border: 0, background: "none",
              fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.g600, borderRadius: 8,
            }}
          >
            {shown ? "Masquer" : "Afficher"}
          </button>
        </div>
      )}
    </FieldShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Liste déroulante                                                            */
/* -------------------------------------------------------------------------- */
export function SelectField({ label, hint, error, required, options = [], children, ...rest }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      {({ hintId, errId }) => (
        <select
          id={id}
          className="ec-input"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errId || hintId}
          style={{ cursor: "pointer" }}
          {...rest}
        >
          {children || options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Zone de texte                                                               */
/* -------------------------------------------------------------------------- */
export function TextAreaField({ label, hint, error, required, rows = 4, ...rest }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      {({ hintId, errId }) => (
        <textarea
          id={id}
          rows={rows}
          className="ec-input"
          style={{ minHeight: 90, resize: "vertical", lineHeight: 1.5 }}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errId || hintId}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Choix par cartes (radiogroup accessible)                                    */
/* -------------------------------------------------------------------------- */
/**
 * Remplace les interrupteurs « Enseignant / Parent » faits en <div>.
 * Vrai groupe de boutons radio : navigable au clavier, annoncé correctement.
 */
export function ChoiceGroup({ label, value, onChange, options }) {
  return (
    <fieldset style={{ border: 0, margin: "0 0 14px" }}>
      <legend style={{ fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.ink2, marginBottom: 8 }}>
        {label}
      </legend>
      <div role="radiogroup" aria-label={label} style={{ display: "grid", gap: 9 }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-selected={selected ? "true" : "false"}
              className="ec-choice"
              onClick={() => onChange(o.value)}
            >
              {o.icon ? (
                <span aria-hidden="true" style={{ fontSize: "var(--ec-fs-5)", flex: "none" }}>{o.icon}</span>
              ) : null}
              <span>
                <span style={{ display: "block", fontSize: FONT.md, fontWeight: 700 }}>{o.label}</span>
                {o.description ? (
                  <span style={{ display: "block", fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 2 }}>
                    {o.description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
