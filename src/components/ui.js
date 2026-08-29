"use client";
// EduCam — primitives d'interface.
//
// Chaque composant remplace un motif aujourd'hui réécrit à la main dans
// dashboard.js, admin.js, schooladmin.js, results.js et activitylog.js.
// Les styles vivent dans globals.css (classes `ec-*`) parce qu'un style en ligne
// ne sait pas faire de survol, de focus ni de requête média.

import { COLORS, FONT, subjectColor } from "../lib/theme";

/* -------------------------------------------------------------------------- */
/* Bouton                                                                      */
/* -------------------------------------------------------------------------- */
export function Button({
  variant = "primary", size, block, children, className = "", ...rest
}) {
  const v = {
    primary: "", ghost: " ec-btn--ghost",
    danger: " ec-btn--danger", dangerSolid: " ec-btn--danger-solid",
  }[variant] || "";
  return (
    <button
      className={`ec-btn${v}${size === "sm" ? " ec-btn--sm" : ""}${block ? " ec-btn--block" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Bouton ne portant qu'une icône — `label` est obligatoire, il devient le nom accessible. */
export function IconButton({ label, children, active, ...rest }) {
  return (
    <button
      aria-label={label}
      title={label}
      style={{
        width: 44, height: 44, minHeight: 44, display: "grid", placeItems: "center",
        borderRadius: 10, border: `1px solid ${active ? COLORS.g500 : COLORS.border}`,
        background: active ? COLORS.g50 : COLORS.card,
        color: active ? COLORS.g600 : COLORS.ink2, fontSize: "var(--ec-fs-4)", flex: "none",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Carte                                                                       */
/* -------------------------------------------------------------------------- */
export function Card({ children, className = "", style, ...rest }) {
  return (
    <div className={`ec-card ${className}`} style={style} {...rest}>
      {children}
    </div>
  );
}

export function CardLabel({ children }) {
  return (
    <div style={{
      fontSize: FONT.xs, fontWeight: 700, letterSpacing: ".08em",
      textTransform: "uppercase", color: COLORS.ink3, marginBottom: 9,
    }}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge / pastille                                                            */
/* -------------------------------------------------------------------------- */
const BADGE_TONES = {
  neutral: { bg: COLORS.track, fg: COLORS.ink2 },
  brand:   { bg: COLORS.g50, fg: COLORS.g700 },
  warn:    { bg: COLORS.warnBg, fg: COLORS.warn },
  crit:    { bg: COLORS.critBg, fg: COLORS.crit },
};

export function Badge({ tone = "brand", children, style }) {
  const t = BADGE_TONES[tone] || BADGE_TONES.brand;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: "var(--ec-fs-2)", fontWeight: 700, padding: "5px 11px",
      borderRadius: 999, background: t.bg, color: t.fg,
      whiteSpace: "nowrap", ...style,
    }}>
      {children}
    </span>
  );
}

/** Pastille de matière — la couleur accompagne TOUJOURS le nom, jamais seule. */
export function SubjectChip({ name, style }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      fontSize: "var(--ec-fs-2)", fontWeight: 700, padding: "5px 11px 5px 7px",
      borderRadius: 999, background: COLORS.card,
      border: `1px solid ${COLORS.border}`, color: COLORS.ink, ...style,
    }}>
      <i aria-hidden="true" style={{
        width: 11, height: 11, borderRadius: 999, background: subjectColor(name), flex: "none",
      }} />
      {name}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Bandeau d'information                                                       */
/* -------------------------------------------------------------------------- */
const CALLOUT_TONES = {
  brand: { bg: COLORS.g50, fg: COLORS.g800 },
  warn:  { bg: COLORS.warnBg, fg: COLORS.warn },
  crit:  { bg: COLORS.critBg, fg: COLORS.crit },
};

export function Callout({ tone = "brand", icon, children, style }) {
  const t = CALLOUT_TONES[tone] || CALLOUT_TONES.brand;
  return (
    <div
      role={tone === "crit" ? "alert" : undefined}
      style={{
        display: "flex", gap: 10, borderRadius: 10, padding: "11px 12px",
        fontSize: FONT.sm, lineHeight: 1.5, background: t.bg, color: t.fg, ...style,
      }}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Ligne de liste                                                              */
/* -------------------------------------------------------------------------- */
/**
 * Remplace les <div onClick> non navigables au clavier : c'est un vrai <button>
 * quand `onClick` est fourni.
 */
/**
 * `barColor` — barre de matière de 4 px à gauche de la ligne. La couleur vient
 * de `subjectColor()` ; elle accompagne TOUJOURS un libellé, jamais seule.
 *
 * Les tailles du titre et de la méta vivent dans `globals.css`
 * (`.ec-row__title` / `.ec-row__meta`) et NON en style en ligne : un style en
 * ligne l'emporterait sur la requête média et la ligne resterait à 13,5 px sur
 * grand écran.
 */
export function ListRow({ icon, iconColor, barColor, title, meta, right, onClick, children, style }) {
  const inner = (
    <>
      {barColor ? <i aria-hidden="true" className="ec-row__bar" style={{ background: barColor }} /> : null}
      {icon != null && (
        <span aria-hidden="true" className="ec-row__ico" style={{
          background: iconColor || COLORS.g50,
          color: iconColor ? "#fff" : COLORS.g600,
        }}>
          {icon}
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ec-row__title" style={{ display: "block", fontWeight: 700, color: COLORS.ink }}>
          {title}
        </span>
        {meta ? (
          <span className="ec-row__meta" style={{ display: "block", color: COLORS.ink3, marginTop: 3 }}>
            {meta}
          </span>
        ) : null}
        {children}
      </span>
      {/* `flex: none` : sans lui, un badge en fin de ligne se faisait rogner
          dès que la ligne vivait dans une colonne étroite (constaté sur la
          messagerie en deux volets). */}
      {right !== undefined ? <span style={{ flex: "none" }}>{right}</span> : (onClick ? (
        <span aria-hidden="true" style={{ color: COLORS.ink3, fontSize: "var(--ec-fs-4)", flex: "none" }}>›</span>
      ) : null)}
    </>
  );

  if (!onClick) {
    return (
      <div className="ec-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, ...style }}>
        {inner}
      </div>
    );
  }
  return (
    <button type="button" className="ec-row" onClick={onClick} style={style}>
      {inner}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Jauge de progression                                                        */
/* -------------------------------------------------------------------------- */
export function Meter({ value, max = 100, color, label }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      style={{
        height: 7, background: COLORS.track, border: `1px solid ${COLORS.divider}`,
        borderRadius: 4, overflow: "hidden", marginTop: 7,
      }}
    >
      <span style={{
        display: "block", height: "100%", width: `${pct}%`,
        background: color || COLORS.g500, borderRadius: 4,
      }} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* État vide                                                                   */
/* -------------------------------------------------------------------------- */
export function EmptyState({ icon = "📭", title, children, action }) {
  return (
    <div style={{ textAlign: "center", padding: "34px 18px" }}>
      <div aria-hidden="true" style={{ fontSize: "var(--ec-fs-7)", marginBottom: 10 }}>{icon}</div>
      {title ? (
        <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink, marginBottom: 6 }}>{title}</div>
      ) : null}
      {children ? (
        <p style={{ fontSize: FONT.sm, color: COLORS.ink3, lineHeight: 1.55, maxWidth: "42ch", margin: "0 auto" }}>
          {children}
        </p>
      ) : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Squelettes de chargement                                                    */
/* -------------------------------------------------------------------------- */
export function Skeleton({ h = 16, w = "100%", style }) {
  return <div className="ec-skeleton" style={{ height: h, width: w, ...style }} />;
}

/** Placeholder de liste, à afficher pendant un chargement plutôt qu'un écran vide. */
export function SkeletonRows({ rows = 3 }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="ec-sr">Chargement…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ec-card" style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, marginBottom: 8 }}>
          <Skeleton h={36} w={36} style={{ borderRadius: 9, flex: "none" }} />
          <div style={{ flex: 1 }}>
            <Skeleton h={13} w="62%" />
            <Skeleton h={11} w="38%" style={{ marginTop: 7 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Onglets                                                                     */
/* -------------------------------------------------------------------------- */
/** Remplace les quatre implémentations d'onglets segmentés du code actuel. */
export function Tabs({ items, value, onChange, ariaLabel = "Sections" }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3 }}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            style={{
              flex: "none", border: 0, borderRadius: 999, padding: "9px 14px",
              minHeight: 40, fontSize: FONT.sm, fontWeight: 700,
              background: active ? COLORS.g500 : COLORS.track,
              color: active ? "#fff" : COLORS.ink2,
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Fil d'Ariane                                                                */
/* -------------------------------------------------------------------------- */
/** Remplace les boutons « ← retour » réécrits à chaque niveau de navigation. */
export function Breadcrumb({ items }) {
  return (
    <nav aria-label="Fil d'Ariane" style={{ marginBottom: 12 }}>
      <ol style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
        listStyle: "none", fontSize: FONT.sm,
      }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {i > 0 && <span aria-hidden="true" style={{ color: COLORS.ink3 }}>›</span>}
            {it.onClick && i < items.length - 1 ? (
              <button type="button" className="ec-link" onClick={it.onClick}
                style={{ minHeight: 32, fontSize: FONT.sm }}>
                {it.label}
              </button>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined}
                style={{ color: COLORS.ink2, fontWeight: 600 }}>
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Tuile de statistique                                                        */
/* -------------------------------------------------------------------------- */
/**
 * Tuile de statistique.
 *
 * `tint` — "green" | "blue" | "amber" | "violet" : habillage de CONTEXTE
 * (enseignement / résultats / à surveiller / système), **pas un statut**.
 * Une tuile ambre ne signifie pas « alerte » : l'alerte reste `warn` / `crit`,
 * portée par la ligne de variation ou un `Badge`.
 *
 * `foot` — ligne de contexte sous le nombre (« +6 cette semaine · sur 136 »).
 */
export function StatTile({ label, value, unit, delta, deltaDir, tint, foot, children }) {
  const col = deltaDir === "up" ? COLORS.good : deltaDir === "down" ? COLORS.crit : COLORS.ink3;
  // « Vibrant Command » (2026-08-13) : la teinte de domaine passe d'un FOND
  // plein à un liseré de 3 px en haut de la tuile. Un fond teinté finissait par
  // se lire comme un statut — exactement ce que la règle 1 interdit. La carte
  // redevient blanche, donc le chiffre garde son contraste maximal.
  const rule = tint ? `ec-tile-rule ec-tile-rule--${tint}` : "";
  return (
    <Card className={rule}>
      <div style={{
        fontSize: FONT.xs, color: COLORS.ink3, fontWeight: 750,
        letterSpacing: ".09em", textTransform: "uppercase",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: FONT.xxl, fontWeight: 750, letterSpacing: "-.03em",
        lineHeight: 1, marginTop: 6, fontVariantNumeric: "tabular-nums",
      }}>
        {value}
        {unit ? <span style={{ fontSize: FONT.base, color: COLORS.ink3, fontWeight: 600, marginLeft: 2 }}>{unit}</span> : null}
      </div>
      {delta ? (
        <div style={{ display: "inline-flex", gap: 5, fontSize: FONT.sm, fontWeight: 700, marginTop: 6, color: col }}>
          <span aria-hidden="true">{deltaDir === "up" ? "▲" : deltaDir === "down" ? "▼" : "—"}</span>
          {delta}
        </div>
      ) : null}
      {foot ? (
        <div style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 6, lineHeight: 1.4 }}>{foot}</div>
      ) : null}
      {children}
    </Card>
  );
}
