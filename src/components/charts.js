"use client";
// EduCam — graphiques.
//
// SVG écrit à la main, sans librairie : Recharts ou Chart.js ajouteraient des
// centaines de kilo-octets, ce qui contredirait tout le reste du travail sur des
// connexions lentes et payantes. L'ensemble de ce fichier pèse quelques Ko et
// fonctionne hors ligne.
//
// Trois règles, vérifiées au validateur de contraste et de vision daltonienne :
//   1. L'écart au calendrier utilise terracotta ↔ bleu, JAMAIS rouge/vert —
//      illisible pour près d'un homme sur douze, et une carte de chaleur ne
//      repose que sur la couleur.
//   2. Une seule teinte pour les comparaisons de magnitude (barres, histogramme) :
//      c'est la longueur qui porte l'information, pas la couleur.
//   3. Chaque graphique a une description textuelle (`aria-label`) qui énonce
//      les valeurs, et une info-bulle native `<title>` sur chaque marque.

import { COLORS, SEQ } from "../lib/theme";
// `deviationColor` / `inkOn` ne sont plus utilisés depuis que la carte de
// chaleur passe par les classes `.ec-hcell--*` : l'intensité est portée par
// le fond, l'encre ne change plus. Ils restent exportés par theme.js.

const AXIS = COLORS.border;
const TICK = COLORS.ink3;

/** Nombre au format français : 12.4 → « 12,4 ». */
export const fr = (n, d = 1) =>
  n == null || Number.isNaN(n) ? "—" : Number(n).toFixed(d).replace(".", ",");

/* -------------------------------------------------------------------------- */
/* Courbe de tendance — une seule série                                        */
/* -------------------------------------------------------------------------- */
export function Sparkline({ values = [], color = COLORS.g500, height = 30 }) {
  if (values.length < 2) return null;
  const w = 100, h = height;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - 3 - ((v - min) / span) * (h - 7),
  ]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true"
      style={{ display: "block", width: "100%", height, marginTop: 10 }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"
        vectorEffect="non-scaling-stroke" />
      <circle cx={pts.at(-1)[0].toFixed(1)} cy={pts.at(-1)[1].toFixed(1)} r="2.6" fill={color} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Évolution dans le temps — une seule série                                   */
/* -------------------------------------------------------------------------- */
export function LineChart({ points = [], labels = [], min, max, unit = "", label }) {
  if (points.length < 2) return null;
  const W = 400, H = 190, L = 34, R = 10, T = 14, B = 30;
  const lo = min != null ? min : Math.min(...points) - 0.5;
  const hi = max != null ? max : Math.max(...points) + 0.5;
  const span = hi - lo || 1;
  const x = (i) => L + (i * (W - L - R)) / (points.length - 1);
  const y = (v) => T + (1 - (v - lo) / span) * (H - T - B);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + t * span);
  const d = points.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const area =
    `M${x(0).toFixed(1)} ${H - B} ` +
    points.map((v, i) => "L" + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ") +
    ` L${x(points.length - 1).toFixed(1)} ${H - B} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={label || `Évolution de ${fr(points[0])} à ${fr(points.at(-1))}${unit}`}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={L} y1={y(v).toFixed(1)} x2={W - R} y2={y(v).toFixed(1)} stroke={AXIS} />
          <text x={L - 7} y={(y(v) + 3.5).toFixed(1)} textAnchor="end" fontSize="9.5" fill={TICK}>
            {fr(v)}
          </text>
        </g>
      ))}
      <path d={area} fill="rgba(0,122,94,.10)" />
      <path d={d} fill="none" stroke={COLORS.g500} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
      {points.map((v, i) => (
        <circle key={i} cx={x(i).toFixed(1)} cy={y(v).toFixed(1)} r="4"
          fill={COLORS.g500} stroke="#fff" strokeWidth="2">
          <title>{`${labels[i] || "Point " + (i + 1)} : ${fr(v)}${unit}`}</title>
        </circle>
      ))}
      {labels.map((l, i) => (
        <text key={i} x={x(i).toFixed(1)} y={H - 10} textAnchor="middle" fontSize="10" fill={TICK}>
          {l}
        </text>
      ))}
      <text x={x(points.length - 1).toFixed(1)} y={(y(points.at(-1)) - 12).toFixed(1)}
        textAnchor="end" fontSize="11.5" fontWeight="700" fill={COLORS.ink}>
        {fr(points.at(-1))}
      </text>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Comparaison — barres horizontales, une seule teinte                          */
/* -------------------------------------------------------------------------- */
export function BarList({ items = [], max = 20, unit = "" }) {
  if (!items.length) return null;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((it, i) => {
        const pct = Math.max(0, Math.min(100, (it.value / max) * 100));
        // La teinte suit la valeur pour aider la lecture, mais c'est la LONGUEUR
        // qui porte l'information : la couleur ne code rien à elle seule.
        const shade = SEQ[Math.min(SEQ.length - 1, Math.max(0, Math.round((pct / 100) * (SEQ.length - 1))))];
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "78px 1fr 52px", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12.5, color: COLORS.ink2, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {it.label}
            </span>
            <span style={{ background: COLORS.track, borderRadius: 999, height: 20, overflow: "hidden" }}>
              <span title={`${it.label} : ${fr(it.value)}${unit}`} style={{
                display: "block", height: "100%", width: `${pct}%`,
                background: it.color || shade, borderRadius: 999,
              }} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {fr(it.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Répartition — histogramme, emphase sur les tranches en difficulté            */
/* -------------------------------------------------------------------------- */
export function Histogram({ bins = [], emphasizeBelow = 0, label }) {
  if (!bins.length) return null;
  const W = 400, H = 190, L = 30, R = 8, T = 14, B = 34;
  const max = Math.max(...bins.map((b) => b.count), 1);
  const bw = (W - L - R) / bins.length;
  const step = Math.ceil(max / 4);
  const ticks = [0, step, step * 2, step * 3, step * 4];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={label || bins.map((b) => `${b.label} : ${b.count}`).join(", ")}>
      {ticks.map((v, i) => {
        const yy = T + (1 - v / (step * 4 || 1)) * (H - T - B);
        return (
          <g key={i}>
            <line x1={L} y1={yy.toFixed(1)} x2={W - R} y2={yy.toFixed(1)} stroke={AXIS} />
            <text x={L - 6} y={(yy + 3.5).toFixed(1)} textAnchor="end" fontSize="9.5" fill={TICK}>{v}</text>
          </g>
        );
      })}
      {bins.map((b, i) => {
        const h = (b.count / (step * 4 || 1)) * (H - T - B);
        const yy = H - B - h;
        const xx = L + i * bw + 4;
        const isWeak = i < emphasizeBelow;
        return (
          <g key={i}>
            <rect x={xx.toFixed(1)} y={yy.toFixed(1)} width={(bw - 8).toFixed(1)}
              height={Math.max(0, h).toFixed(1)} rx="4" fill={isWeak ? COLORS.neg : COLORS.g400}>
              <title>{`${b.label} : ${b.count} élève${b.count > 1 ? "s" : ""}`}</title>
            </rect>
            <text x={(xx + (bw - 8) / 2).toFixed(1)} y={(yy - 5).toFixed(1)} textAnchor="middle"
              fontSize="10.5" fontWeight="700" fill={COLORS.ink}>{b.count}</text>
            <text x={(xx + (bw - 8) / 2).toFixed(1)} y={H - 12} textAnchor="middle"
              fontSize="10" fill={TICK}>{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Carte de chaleur — avance et retard sur la répartition                       */
/* -------------------------------------------------------------------------- */
/**
 * `rows` : [{ label, values: [nombre|null] }] — l'écart en semaines.
 * Négatif = retard, positif = avance, null = pas de donnée.
 * Le graphique signature du tableau de bord : il répond d'un coup d'œil à
 * « mes classes suivent-elles la répartition officielle ? ».
 */
export function Heatmap({ rows = [], columns = [], rowHeader = "Classe" }) {
  if (!rows.length) return null;

  // Vocabulaire d'ACTION, pas une échelle abstraite : un directeur doit lire la
  // cellule, pas la décoder. Et « pas encore commencé » n'est pas une valeur de
  // l'échelle — il se distingue par sa bordure en pointillé, pas par sa teinte.
  const label = (v) =>
    v == null ? "—"
    : v === 0 ? "à jour"
    : v > 0 ? `+${v} sem`
    : `−${Math.abs(v)} sem`;
  const say = (v) =>
    v == null ? "pas encore commencé" : v === 0 ? "à jour"
    : v < 0 ? `${Math.abs(v)} semaine${Math.abs(v) > 1 ? "s" : ""} de retard`
    : `${v} semaine${v > 1 ? "s" : ""} d'avance`;
  const cls = (v) =>
    v == null ? "ec-hcell ec-hcell--na"
    : v === 0 ? "ec-hcell ec-hcell--mid"
    : v > 0 ? "ec-hcell ec-hcell--pos"
    : v <= -2 ? "ec-hcell ec-hcell--neg"
    : "ec-hcell ec-hcell--neg2";

  const key = [
    { c: "ec-hcell ec-hcell--neg", t: "En retard" },
    { c: "ec-hcell ec-hcell--mid", t: "À jour" },
    { c: "ec-hcell ec-hcell--pos", t: "En avance" },
    { c: "ec-hcell ec-hcell--na", t: "Pas encore commencé" },
  ];

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 5, width: "100%", minWidth: 480, margin: -5 }}>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: "left", fontSize: "var(--ec-fs-2)", color: COLORS.ink2, fontWeight: 800, paddingRight: 10, whiteSpace: "nowrap" }}>
                {rowHeader}
              </th>
              {columns.map((c) => (
                <th key={c} scope="col" style={{ fontSize: "var(--ec-fs-1)", fontWeight: 800, letterSpacing: ".05em", color: TICK, paddingBottom: 4 }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* La clé ne peut PAS être `r.label` : deux classes du même niveau
                portent légitimement la même étiquette, et React fusionnait ou
                omettait alors des lignes. `r.key` quand l'appelant en fournit
                une (l'identifiant de la classe), l'index sinon. */}
            {rows.map((r, i) => (
              <tr key={r.key ?? i}>
                <th scope="row" style={{ textAlign: "left", fontSize: "var(--ec-fs-2)", color: COLORS.ink, fontWeight: 800, paddingRight: 10, whiteSpace: "nowrap" }}>
                  {r.label}
                </th>
                {r.values.map((v, j) => (
                  <td key={j} style={{ padding: 0 }}>
                    <div
                      className={cls(v)}
                      title={`${r.label} · ${columns[j]} : ${say(v)}`}
                      aria-label={`${r.label}, ${columns[j]} : ${say(v)}`}
                    >
                      {label(v)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        marginTop: 14, paddingTop: 12, borderTop: `1px solid ${COLORS.divider}`,
        fontSize: "var(--ec-fs-2)", color: COLORS.ink2, fontWeight: 600,
      }}>
        {key.map((k) => (
          <span key={k.t} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span aria-hidden="true" className={k.c} style={{ width: 15, height: 15, padding: 0, borderRadius: 4 }} />
            {k.t}
          </span>
        ))}
      </div>
    </>
  );
}
