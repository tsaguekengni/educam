// EduCam — jetons de design.
//
// Ces valeurs sont le miroir JS des variables CSS de `globals.css`. Utilisez la
// classe CSS quand c'est possible (elle apporte le survol, le focus et les
// requêtes média) ; utilisez ces constantes pour tout ce qui est calculé en JS :
// graphiques SVG, couleurs dynamiques, styles dépendant d'une donnée.
//
// Règles non négociables, vérifiées au validateur de contraste et de daltonisme :
//   1. Les couleurs de STATUT ne servent jamais de couleur décorative ou de série.
//   2. L'écart au calendrier utilise NEG ↔ POS (terracotta ↔ bleu), jamais
//      rouge/vert — illisible pour près d'un homme sur douze.
//   3. Vert et terracotta ne coexistent jamais dans un même graphique.
//   4. Les couleurs de MATIÈRE sont des pastilles accompagnées du nom ; elles ne
//      sont pas utilisables comme séries d'un graphique (huit teintes chaudes ne
//      se distinguent pas de façon fiable).

export const COLORS = {
  // Échelle verte — 500 est le vert du drapeau camerounais. INCHANGÉE.
  g50: "#E8F5EF", g100: "#C7E7DA", g200: "#97D3BD", g300: "#5FBC9C",
  g400: "#2A9C79", g500: "#007A5E", g600: "#0A6247", g700: "#0F4C35", g800: "#0A3626",

  // Surfaces — direction « Vibrant » (2026-08-12).
  // L'ancienne bordure #E4E7EB faisait 1,24:1 sur blanc : invisible à 60 cm.
  page: "#E4EAE3", card: "#FFFFFF",
  border: "#C0C8D1", border2: "#A9B3BF", track: "#E3E8EC",
  divider: "#DCE2E8", panel: "#F2F6F1",

  ink: "#0D1219", ink2: "#3A4552", ink3: "#57616E",

  // Statuts — réservés. INCHANGÉS.
  good: "#0A6E2E",
  warn: "#8A5A06", warnBg: "#FDF1DC",
  crit: "#A0231A", critBg: "#FCE9E7", critBrd: "#F3C9C4",

  // Données divergentes (retard ↔ avance). INCHANGÉES.
  // `mid` reste #EDEFF3 : c'est le neutre de l'échelle divergente, pas une
  // surface d'interface — le changer déplacerait toute la carte de chaleur.
  // L'ENCRE ne change pas d'un cran à l'autre — seul le FOND encode
  // l'intensité. Un ton moyen plus clair (#C4703F) tombait à 3,29:1.
  // Mesures : retard fort 4,76:1 · retard léger 5,56:1 · avance 5,66:1 · à jour 8,47:1.
  neg: "#A83E1E", pos: "#0B5FA5", mid: "#EDEFF3",
  negBg: "#F5DCD2", negBrd: "#C9755A",     // retard ≥ 2 semaines
  neg2Bg: "#FBF0EB", neg2Brd: "#E0B7A6",   // retard de 1 semaine
  posBg: "#E6EFF8", posBrd: "#A9C6E2",     // avance
  midBrd: "#C7CDD6",

  // Carte héros « Prochain cours » — vert CLAIR teinté, jamais vert foncé.
  hero: "#C6E5D6", heroBrd: "#8CC0A6", heroInk: "#0D1219", heroInk2: "#35414E",

  // Jaune du drapeau : 1,47:1 sur blanc, 6,78:1 sur #0F4C35.
  // N'existe QUE sur surface sombre (rail) ou en filet décoratif de 3 px.
  flagYellow: "#FCD116",
};

/**
 * Surfaces teintées par DOMAINE — un habillage de contexte, PAS un statut.
 * Une tuile ambre ne veut pas dire « alerte » : l'alerte reste `warn` / `crit`.
 */
export const TINTS = {
  green:  { bg: "#E4F1EB", brd: "#B4D8C8", ink: "#0F4C35" },
  blue:   { bg: "#E3EEF7", brd: "#B5CFE4", ink: "#0B5FA5" },
  amber:  { bg: "#FAEEE0", brd: "#E6CDA9", ink: "#A8431E" },
  violet: { bg: "#EEEAF7", brd: "#CBC2E6", ink: "#4A3AA7" },
};

/** Rampe séquentielle (une seule teinte, clair → foncé) pour barres et heatmaps de magnitude. */
export const SEQ = [COLORS.g100, COLORS.g200, COLORS.g300, COLORS.g400, COLORS.g500];

/** Pastilles de matières — la « couche expressive ». Toujours avec le nom à côté. */
export const SUBJECT_COLORS = {
  mathematiques: "#0B5FA5",
  francais:      "#A8431E",
  sciences:      "#007A5E",
  english:       "#7A3E8F",
  shs:           "#B07000",
  tic:           "#4A3AA7",
  arts:          "#C0392B",
  eps:           "#5C6B1F",
};

/** Normalise un nom de matière vers une clé de SUBJECT_COLORS. */
export function subjectKey(name) {
  const n = String(name || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (n.includes("math")) return "mathematiques";
  if (n.includes("franc")) return "francais";
  if (n.includes("scien")) return "sciences";
  if (n.includes("engl") || n.includes("angl")) return "english";
  if (n.includes("shs") || n.includes("human") || n.includes("social")) return "shs";
  if (n.includes("tic") || n.includes("informat")) return "tic";
  if (n.includes("art")) return "arts";
  if (n.includes("eps") || n.includes("physique") || n.includes("sport")) return "eps";
  return null;
}

/** Couleur d'une matière, avec repli neutre. */
export function subjectColor(name) {
  const k = subjectKey(name);
  return (k && SUBJECT_COLORS[k]) || COLORS.ink3;
}

export const RADII = { sm: 8, md: 12, lg: 16, pill: 999 };

export const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 44 };

/**
 * Échelle typographique — sept pas, exposés en VARIABLES CSS.
 *
 * Pourquoi des `var()` et non des nombres : les tailles de police sont écrites
 * en dur dans des styles en ligne React, et un style en ligne ne peut pas être
 * repris par une requête média. En passant par une variable CSS, la requête
 * média unique de `globals.css` (≥ 900 px) atteint aussi ces styles en ligne.
 *
 * Valeurs réelles — téléphone → ordinateur :
 *   xs 10,5→11,5 · sm 12,5→13 · md 13,5→15 · base 16→17
 *   lg 21→24 · xl 24→30 · xxl 32→36
 *
 * ⚠️ Ce sont désormais des CHAÎNES. Ne jamais faire d'arithmétique dessus
 * (`FONT.md - 1` donnerait NaN). Vérifié : aucun usage arithmétique dans le
 * dépôt au moment de la conversion. Pour un SVG, qui exige un nombre, utiliser
 * une valeur numérique littérale — voir `components/charts.js`.
 */
export const FONT = {
  xs:   "var(--ec-fs-1)",
  sm:   "var(--ec-fs-2)",
  md:   "var(--ec-fs-3)",
  base: "var(--ec-fs-4)",
  lg:   "var(--ec-fs-5)",
  xl:   "var(--ec-fs-6)",
  xxl:  "var(--ec-fs-7)",
};

export const SHADOW = {
  sm: "0 1px 3px rgba(13,18,25,.10)",
  md: "0 4px 14px rgba(13,18,25,.10)",
};

/** Plancher de cible tactile, en pixels. */
export const TOUCH_MIN = 44;

/**
 * Encre lisible sur un fond donné (noir ou blanc selon la luminance).
 * Sert aux cellules de heatmap, dont la couleur est calculée.
 */
export function inkOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.42 ? "#14161A" : "#FFFFFF";
}

/** Interpolation linéaire entre deux couleurs hex. */
export function mix(a, b, t) {
  const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const out = [r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t];
  return "#" + out.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}

/**
 * Couleur d'un écart au calendrier, en semaines.
 * Négatif = retard (terracotta) · 0 = neutre · positif = avance (bleu).
 */
export function deviationColor(weeks, maxLate = 3, maxEarly = 2) {
  if (!weeks) return COLORS.mid;
  const t = Math.min(Math.abs(weeks) / (weeks < 0 ? maxLate : maxEarly), 1) * 0.82 + 0.18;
  return mix(COLORS.mid, weeks < 0 ? COLORS.neg : COLORS.pos, t);
}
