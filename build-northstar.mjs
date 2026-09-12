// Regenerate the North Star reference from the SAME data now in curriculum_topics,
// annotated with current lesson status. Run: node build-northstar.mjs
import { writeFileSync } from "fs";
import { DATA, THEMES } from "./build-curriculum-cm1.mjs";

// ---- Current lesson status (from the live DB, Sept status query) ----
// Components that have one legacy lesson per unit, all parked on week 1:
const WEEK1_LEGACY = new Set([
  "francais.conjugaison", "francais.expression-orale", "francais.grammaire",
  "francais.litterature", "francais.orthographe", "francais.production-ecrits",
  "francais.vocabulaire",
  "maths.geometrie", "maths.mesures-grandeurs", "maths.statistiques",
  "sciences.agropastoral", "sciences.environnement", "sciences.sciences-physiques",
  "sciences.sciences-terre", "sciences.sciences-vie", "sciences.technologies",
]);
// nombres-calculs: U1 & U2 already split into 3 weekly lessons (done); U3-U8 = 1 legacy lesson on week 1.
function lessonStatus(key, unit, week) {
  if (key === "maths.nombres-calculs") {
    if ((unit === 1 || unit === 2)) return "done";            // real weekly lesson exists
    if (week === 1) return "legacy";                          // U3-U8 single legacy lesson on w1
    return "todo";
  }
  if (WEEK1_LEGACY.has(key)) return week === 1 ? "legacy" : "todo";
  return "todo"; // english, langues, shs, tic, arts, eps, devperso: no lessons yet
}
const MARK = { done: "✅", legacy: "⚠️", todo: "⬜" };

// ---- Subject / component display names & order ----
const SUBJECTS = {
  francais: { name: "Français et Littérature", comps: {
    "expression-orale": "Expression orale", "production-ecrits": "Production d'écrits",
    "litterature": "Littérature", "grammaire": "Grammaire", "vocabulaire": "Vocabulaire",
    "orthographe": "Orthographe", "conjugaison": "Conjugaison" } },
  maths: { name: "Mathématiques", comps: {
    "nombres-calculs": "Nombres et calculs", "mesures-grandeurs": "Mesures et grandeurs",
    "geometrie": "Géométrie et espace", "statistiques": "Statistiques" } },
  sciences: { name: "Sciences et Technologies", comps: {
    "sciences-vie": "Sciences de la vie", "sciences-physiques": "Sciences physiques et chimiques",
    "technologies": "Technologies", "sciences-terre": "Sciences de la terre",
    "agropastoral": "Sciences agropastorales et piscicoles", "environnement": "Éducation à l'environnement" } },
  english: { name: "English Language", comps: {
    "listening": "Listening and Speaking", "reading": "Reading", "writing": "Writing", "grammar": "Grammar and Vocabulary" } },
  langues: { name: "Langues et cultures nationales", comps: { "langue-nationale": "Langue nationale" } },
  shs: { name: "Sciences humaines et sociales", comps: {
    "morale": "Éducation morale", "droits": "Droits et devoirs de l'enfant",
    "paix": "Éducation à la paix et à la sécurité", "citoyennete": "Éducation à la citoyenneté",
    "regles-reglements": "Règles et règlements", "histoire": "Histoire",
    "geographie-physique": "Géographie physique", "geographie-humaine": "Géographie humaine",
    "geographie-economique": "Géographie économique" } },
  tic: { name: "TIC", comps: {
    "env-info": "Environnements informatiques", "production-tic": "Production avec les outils TIC",
    "internet": "Internet et communication", "sante-securite-ethique": "Santé, sécurité et éthique",
    "programmation": "Notions de programmation" } },
  arts: { name: "Éducation artistique", comps: {
    "arts-visuels": "Arts visuels", "musique": "Musique", "arts-dramatiques": "Arts dramatiques", "danse": "Danse" } },
  eps: { name: "Éducation physique et sportive", comps: {
    "athletisme": "Activités athlétiques", "sports-co": "Sports collectifs", "autodefense": "Techniques d'autodéfense" } },
  devperso: { name: "Développement personnel", comps: {
    "artisanat": "Artisanat et constructions", "agropastoral-dp": "Activités agropastorales", "domestique": "Activités domestiques" } },
};

const esc = (s) => (s || "").replace(/\|/g, "\\|");
const STAMP = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
let md = "";
md += "# EduCam — Curriculum Map CM1\n\n";
md += `> **Dernière mise à jour : ${STAMP}** · **Companion data file to \`EduCam_North_Star.md\`.**\n`;
md += "> This file lists **WHAT to teach** — every subject / component / unit / week topic. The **North Star** says **HOW** to build a lesson. This is *not* a second North Star; it is the generated topic table. Do not hand-edit — regenerate with `build-northstar.mjs` if the curriculum changes.\n\n";
md += "**Generated from the `curriculum_topics` table**, rebuilt directly from the official Répartition Annuelle CM1 (533 topics, no gaps). Single source of truth for topics.\n\n";
md += "## The model\n";
md += "- Each unit = **3 teaching weeks** (S1, S2, S3), each an independent lesson. **Week 4 = intégration et évaluation** (no platform lesson).\n";
md += "- 8 units follow the 8 centres d'intérêt: 1 La nature · 2 Le village, la ville · 3 L'école · 4 Les métiers · 5 Les voyages · 6 La santé · 7 Sports et loisirs · 8 Dans l'espace.\n";
md += "- Months: Sept=U1, Oct=U2, Nov=U3, Déc/Janvier=U4, Février=U5, Mars=U6, **Avril=U7, Mai=U8** (no June).\n\n";
md += "## How to use this (for content chats)\n";
md += "1. Pick a subject/component below and a specific **unité + semaine**. The cell text is the lesson topic — use it as the lesson title/objective.\n";
md += "2. Create ONE lesson for that exact week. Set `subject_id`, `component_id`, `level='cm1'`, `unit_number`, and **`week_number` (1, 2 or 3)** — this is required.\n";
md += "3. Lesson structure (see North Star §3): intro → contenu (vidéo = un bloc dans le contenu) → activité → exercices → **bilan** (trace écrite). Include **4 exercices** + **6 questions de quiz de préparation**.\n";
md += "4. Upload via the batch uploader (`lessons/<folder>/<name>.sql` + media), or the admin editor.\n\n";
md += "## Status legend\n";
md += "- ✅ **Lesson built** for this week and aligned to the topic.\n";
md += "- ⚠️ **Legacy lesson** exists on week 1 only (old 1-lesson-per-unit content) — needs splitting/re-aligning to this week's topic.\n";
md += "- ⬜ **To create** — no lesson yet.\n\n";

// ---- Status summary ----
let done = 0, legacy = 0, todo = 0, total = 0;
for (const key of Object.keys(DATA)) {
  const units = DATA[key].units;
  for (const u of Object.keys(units)) {
    units[u].forEach((_, i) => {
      total++;
      const s = lessonStatus(key, parseInt(u), i + 1);
      if (s === "done") done++; else if (s === "legacy") legacy++; else todo++;
    });
  }
}
md += `## Where we stand (${total} weekly topics total)\n`;
md += `- ✅ Built & aligned: **${done}**  ·  ⚠️ Legacy (needs re-align): **${legacy}**  ·  ⬜ To create: **${todo}**\n`;
md += `- Subjects with content today: **Français, Maths, Sciences** (mostly legacy week-1 lessons; only Maths/Nombres et calculs U1–U2 fully split).\n`;
md += `- No lessons yet: **English, Langue nationale, SHS, TIC, Arts, EPS, Développement personnel** (topics ready, lessons to build).\n\n`;
md += "---\n\n";

// ---- Per subject / component tables ----
for (const subId of Object.keys(SUBJECTS)) {
  const sub = SUBJECTS[subId];
  md += `## ${sub.name}\n\n`;
  for (const compId of Object.keys(sub.comps)) {
    const key = `${subId}.${compId}`;
    if (!DATA[key]) continue;
    md += `### ${sub.comps[compId]}  \n`;
    md += `\`${subId} / ${compId}\`  ·  savoir-être: *${DATA[key].savoir}*\n\n`;
    md += "| Unité | Thème | S1 | S2 | S3 |\n|---|---|---|---|---|\n";
    for (let u = 1; u <= 8; u++) {
      const wk = DATA[key].units[u] || [];
      const cell = (i) => {
        if (!wk[i]) return "—";
        const s = lessonStatus(key, u, i + 1);
        return `${MARK[s]} ${esc(wk[i][0])}`;
      };
      md += `| ${u} | ${esc(THEMES[u - 1])} | ${cell(0)} | ${cell(1)} | ${cell(2)} |\n`;
    }
    md += "\n";
  }
  md += "---\n\n";
}

md += "## Priority order for content production\n";
md += "1. **Re-align the legacy week-1 lessons** in Français, Maths, Sciences so each unit's week-1 lesson matches its new S1 topic, then **create the S2 and S3 lessons** for those units.\n";
md += "2. **Maths / Nombres et calculs U3–U8** — split into 3 weekly lessons (U1–U2 already done).\n";
md += "3. **Fill the empty subjects** (English, Langue nationale, SHS, TIC, Arts, EPS, Dév. personnel) — topics are ready.\n";

writeFileSync("EduCam_Curriculum_Map_CM1.md", md);
console.log(`Curriculum Map written: ${total} topics, ${done} done / ${legacy} legacy / ${todo} to create.`);
