"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import { supabase } from "../lib/supabase";
import { takeBackup, clearBackup, rollback, pendingBackup } from "../lib/lesson-backup";
import Admin from "./admin";
import SchoolAdmin from "./schooladmin";
import SchoolDashboard from "./schooldashboard";
import Results from "./results";
import ActivityLog from "./activitylog";
import ReadinessQuiz from "./readiness";
import { OFFLINE_ENABLED, PROFILES_ENABLED, PARENT_TIP_ENABLED, WHATSAPP_ENABLED } from "../lib/flags";
import { logActivity } from "../lib/activity";
import { notifyDirectMessage } from "../lib/whatsapp";
import {
  cachedQuery, fetchLessonBundle, saveLessonBundle, loadLessonBundle,
  getCachedLessonIds, downloadWeek, getGrant,
  enqueue, queueCount, isShellCached, cachedQueryMeta, freshnessLabel, newId,
  loadMediaBlob, isDownloadableMedia,
} from "../lib/offline";
import { drainQueue } from "../lib/sync";
import { COLORS, FONT, SHADOW, TINTS, subjectColor } from "../lib/theme";
import { Button, Card, CardLabel, Badge, Callout, ListRow, IconButton, EmptyState, Tabs, Breadcrumb, Meter, StatTile, Skeleton, SkeletonRows } from "../components/ui";
import { Sparkline, fr } from "../components/charts";
import { useToasts } from "../components/overlays";
import InstallPrompt from "../components/InstallPrompt";
import { normalizePhone, formatPhone, isSuspectPhone } from "../lib/phone";

const LEVELS = [
  { id: "ce1", name: "CE1", full: "Cours Élémentaire 1", primary: "Primary 3" },
  { id: "ce2", name: "CE2", full: "Cours Élémentaire 2", primary: "Primary 4" },
  { id: "cm1", name: "CM1", full: "Cours Moyen 1", primary: "Primary 5" },
  { id: "cm2", name: "CM2", full: "Cours Moyen 2", primary: "Primary 6" },
];

// Libellés des rôles pour la console « Utilisateurs ». `referent` partage l'accès
// du directeur mais reste un rôle DISTINCT (décision conservée) : on l'affiche
// donc sous son propre nom, jamais fondu dans « directeur ».
const ROLE_LABELS = {
  teacher: "Enseignant",
  school_admin: "Directeur",
  referent: "Référent",
  admin: "Superadmin",
  parent: "Parent",
};

const SUBJECTS = [
  {
    id: "francais", name: "Français et Littérature", icon: "📖", color: "#3B82F6", hours: "5h/sem",
    components: [
      { id: "expression-orale", name: "Expression orale" },
      { id: "production-ecrits", name: "Production d'écrits" },
      { id: "litterature", name: "Littérature" },
      { id: "grammaire", name: "Grammaire" },
      { id: "vocabulaire", name: "Vocabulaire" },
      { id: "orthographe", name: "Orthographe" },
      { id: "conjugaison", name: "Conjugaison" },
    ]
  },
  {
    id: "maths", name: "Mathématiques", icon: "🔢", color: "#8B5CF6", hours: "5h/sem",
    components: [
      { id: "nombres-calculs", name: "Nombres et calculs" },
      { id: "mesures-grandeurs", name: "Mesures et grandeurs" },
      { id: "geometrie", name: "Géométrie et espace" },
      { id: "statistiques", name: "Statistiques" },
    ]
  },
  {
    id: "sciences", name: "Sciences et Technologies", icon: "🔬", color: "#10B981", hours: "4h/sem",
    components: [
      { id: "sciences-vie", name: "Sciences de la vie" },
      { id: "sciences-physiques", name: "Sciences physiques et chimiques" },
      { id: "technologies", name: "Technologies" },
      { id: "sciences-terre", name: "Sciences de la terre" },
      { id: "agropastoral", name: "Sciences agropastorales et piscicoles" },
      { id: "environnement", name: "Éducation environnementale" },
    ]
  },
  {
    id: "english", name: "English Language", icon: "🇬🇧", color: "#EF4444", hours: "3h/sem",
    components: [
      { id: "listening", name: "Listening and Speaking" },
      { id: "reading", name: "Reading" },
      { id: "writing", name: "Writing" },
      { id: "grammar", name: "Grammar and Vocabulary" },
    ]
  },
  {
    id: "shs", name: "Sciences humaines et sociales", icon: "🌍", color: "#F59E0B", hours: "3h/sem",
    components: [
      { id: "morale", name: "Éducation morale" },
      { id: "droits", name: "Droits et devoirs de l'enfant" },
      { id: "paix", name: "Éducation à la paix et à la sécurité" },
      { id: "citoyennete", name: "Éducation à la citoyenneté" },
      { id: "regles-reglements", name: "Règles et règlements" },
      { id: "histoire", name: "Histoire" },
      { id: "geographie-physique", name: "Géographie physique" },
      { id: "geographie-humaine", name: "Géographie humaine" },
      { id: "geographie-economique", name: "Géographie économique" },
    ]
  },
  {
    id: "tic", name: "TIC", icon: "💻", color: "#6366F1", hours: "2h/sem",
    components: [
      { id: "env-info", name: "Environnements informatiques" },
      { id: "production-tic", name: "Production avec les outils TIC" },
      { id: "internet", name: "Internet et communication" },
      { id: "sante-securite-ethique", name: "Santé, sécurité et éthique" },
      { id: "programmation", name: "Notions de programmation" },
    ]
  },
  {
    id: "langues", name: "Langues et cultures nationales", icon: "🗣️", color: "#059669", hours: "2h/sem",
    components: [{ id: "langue-nationale", name: "Langue nationale" }]
  },
  {
    id: "arts", name: "Éducation artistique", icon: "🎨", color: "#EC4899", hours: "1h/sem",
    components: [
      { id: "arts-visuels", name: "Arts visuels" },
      { id: "musique", name: "Musique" },
      { id: "arts-dramatiques", name: "Arts dramatiques" },
      { id: "danse", name: "Danse" },
    ]
  },
  {
    id: "eps", name: "Éducation physique et sportive", icon: "⚽", color: "#14B8A6", hours: "2h/sem",
    components: [
      { id: "athletisme", name: "Activités athlétiques" },
      { id: "sports-co", name: "Sports collectifs" },
      { id: "autodefense", name: "Autodéfense" },
    ]
  },
  {
    id: "devperso", name: "Développement personnel", icon: "🌱", color: "#78716C", hours: "3h/sem",
    components: [
      { id: "artisanat", name: "Artisanat et constructions artistiques" },
      { id: "agropastoral-dp", name: "Activités agropastorales" },
      { id: "domestique", name: "Activités domestiques et familiales" },
    ]
  },
];

const THEMES = [
  "La nature", "Le village, la ville", "L'école", "Les métiers",
  "Les voyages", "La santé", "Sports et loisirs", "Dans l'espace"
];

const SECTION_TYPES = [
  { id: "intro", name: "Introduction", icon: "💡" },
  { id: "content", name: "Contenu de la leçon", icon: "📖" },
  { id: "video", name: "Vidéo", icon: "🎬" },
  { id: "activity", name: "Activité pratique", icon: "🧪" },
  { id: "exercise", name: "Exercices", icon: "✏️" },
  { id: "bilan", name: "Bilan — À recopier", icon: "📋" },
];

const BLOCK_TYPES = [
  { id: "text", name: "Texte", icon: "📝" },
  { id: "image", name: "Image", icon: "🖼️" },
  { id: "video", name: "Vidéo", icon: "🎬" },
];

const emptyBlock = (type = "text") => ({
  block_type: type, text_content: "", media_url: "", caption: "", alt_text: "",
});

const editInputStyle = {
  width: "100%", padding: "10px 12px", border: "1.5px solid #D1D5DB",
  borderRadius: 8, fontSize: "var(--ec-fs-3)", outline: "none", boxSizing: "border-box",
  background: "white"
};

const editLabelStyle = {
  fontSize: "var(--ec-fs-3)", fontWeight: 600, color: "#374151", display: "block", marginBottom: 6
};

const DAY_NAMES = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const MONTH_NAMES = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const WEEKDAY_NAMES = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
/** « mardi 14 octobre » — sans dépendance à la locale du navigateur. */
const dateLabel = (d) => `${WEEKDAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
/** « 23 septembre » — une DATE, pas un décompte. Voir le voyant hors ligne. */
const dayMonth = (d) => `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
const capitalize = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const DAY_NAMES_SHORT = ["", "Lun", "Mar", "Mer", "Jeu", "Ven"];

// Calendrier Littoral canonique : 8 unités de Septembre à Avril (ni Mai ni Juin).
const MONTH_UNIT_MAP = [
  { month: "Septembre", unit: 1 },
  { month: "Octobre", unit: 2 },
  { month: "Novembre", unit: 3 },
  { month: "Décembre", unit: 4 },
  { month: "Janvier", unit: 5 },
  { month: "Février", unit: 6 },
  { month: "Mars", unit: 7 },
  { month: "Avril", unit: 8 },
];

// Créneaux qui ne sont pas des cours : récréation, pause déjeuner, étude surveillée.
// Cf. BREAK_TYPES dans schooladmin.js (subject_id « pause » ou « etude »).
const isBreakSlot = (sl) => !!sl && (sl.subject_id === "pause" || sl.subject_id === "etude");

/** Horodatage court en français : « 13 août, 14 h 22 ». Défini au niveau du
 *  MODULE — il existait un `fmtDate` local à la messagerie, invisible ailleurs,
 *  et l'appeler depuis la console superadmin plantait le rendu. */
function fmtStamp(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const jour = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${jour}, ${h} h ${m}`;
}

function getSubjectColor(subjectId) {
  return SUBJECTS.find(s => s.id === subjectId)?.color || "#6B7280";
}
function getSubjectIcon(subjectId) {
  return SUBJECTS.find(s => s.id === subjectId)?.icon || "📚";
}

// Turns a YouTube watch/short URL into an embeddable one. Non-YouTube URLs
// (or already-embeddable ones) pass through unchanged.
function getEmbedUrl(url) {
  if (!url) return "";
  if (url.includes("youtube.com/watch")) return url.replace("watch?v=", "embed/").split("&")[0];
  if (url.includes("youtu.be/")) return "https://www.youtube.com/embed/" + url.split("youtu.be/")[1].split("?")[0];
  if (url.includes("youtube.com/shorts/")) return url.replace("shorts/", "embed/").split("?")[0];
  return url;
}

// Returns true for YouTube/Vimeo/Dailymotion embeddable URLs, false for
// direct video files (.mp4, .webm …) that need a <video> tag instead.
function isEmbeddable(url) {
  if (!url) return false;
  return /youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com/i.test(url);
}

// SVG diagrams are vector: safe to scale up to fill the reading column.
// Raster photos (png/jpg) are NOT upscaled, to avoid blur.
function isSvg(url) {
  return !!url && /\.svg(\?|#|$)/i.test(url);
}

/* ──────────────────────────────────────────────────────────────────────────
 * TAILLES DE LA PROJECTION — les seuls nombres à toucher pour réajuster.
 *
 * Demande de Maxime, 2026-10-01 : au fond de la classe, le texte projeté
 * était trop petit pour des CM1, et l'écran restait aux trois quarts vide.
 * Premier essai le 2026-10-01 à ×2 et ×3 : vérifié à l'écran par Maxime,
 * jugé TROP GROS. Réglé à ×1,5 pour le corps et ×2 pour la trace écrite
 * (« à recopier », section bilan). ⭐ Ces valeurs-là ont été VUES sur une
 * vraie projection, pas calculées : ne pas les « corriger » au raisonnement.
 *
 * ⚠️ Ces facteurs multiplient l'échelle AUTOMATIQUE (`fitVw` ci-dessous, qui
 * réduit la taille quand la leçon est longue). Ils ne la remplacent pas :
 * une leçon de 6 000 signes reste plus petite qu'une leçon de 300, sinon
 * elle demanderait dix écrans de défilement.
 *
 * ⚠️ Les PLAFONDS ne sont pas décoratifs. Sans eux, une leçon très courte
 * monterait à ~124 px par lettre et n'afficherait plus qu'une trentaine de
 * caractères par ligne : illisible pour une autre raison. Si Maxime veut
 * encore plus gros, c'est le plafond qu'il faut lever, pas seulement le
 * facteur.
 *
 * 📏 Mesuré en base le 2026-10-01, pour ne pas régler à l'aveugle : les 171
 * leçons font de 1 594 à 6 499 signes — AUCUNE n'est dans les bandes
 * « courte » ni « moyenne ». Seules les deux dernières bandes servent
 * réellement, et les plafonds n'y mordent pas : les facteurs ×1,5 et ×2 sont
 * donc appliqués exactement. Les plafonds ne protègent qu'un cas qui
 * n'existe pas encore.
 * ────────────────────────────────────────────────────────────────────────── */
const PROJ_BODY_X = 1.5;      // corps du texte           (1 = taille d'avant)
const PROJ_COPY_X = 2;        // section « à recopier »   (1 = taille d'avant)
const PROJ_BODY_MAX_VW = 3.6; // plafond du corps, en vw  (~69 px sur 1920 px)
const PROJ_COPY_MAX_VW = 6.0; // plafond « à recopier »   (~115 px sur 1920 px)
const PROJ_BODY_MIN_PX = 28;  // plancher : écran étroit, où 1 vw ne vaut rien
const PROJ_COPY_MIN_PX = 40;
// Largeur de la colonne. Elle était à 1200 px (et le texte à 1000 px) : sur un
// vidéoprojecteur 1920, c'était 40 % de l'écran perdu en marges — la moitié du
// « trop de blanc » signalé par Maxime. Le reste vient de l'interligne, réduit
// ci-dessous puisque les lettres, elles, ont grossi.
const PROJ_MAX_W = 1760;
// La vidéo garde SON propre plafond, et il est plus bas que celui du texte :
// une vidéo 16/9 étalée sur 1760 px fait 990 px de haut et ne tient plus dans
// un écran de 1080 px. 1400 px → 787 px de haut, ça tient.
const PROJ_VIDEO_MAX_W = 1400;

/* ──────────────────────────────────────────────────────────────────────────
 * LE ZOOM DE LA PROJECTION — demande de Maxime, 2026-10-01.
 *
 * Les facteurs PROJ_BODY_X / PROJ_COPY_X ci-dessus sont un pari fait à
 * distance, sur une salle qu'on n'a jamais vue. Le zoom rend la main à
 * l'enseignante : elle ajuste devant sa classe, avec SON projecteur, et la
 * valeur est retenue sur l'appareil.
 *
 * ⚠️ LE ZOOM S'APPLIQUE APRÈS LES PLAFONDS, jamais avant. Si on le plaçait
 * avant, un appui sur « + » ne ferait RIEN dès que le plafond est atteint —
 * un bouton qui ne répond pas, et l'enseignante conclut que c'est cassé. Le
 * plafond borne la taille PAR DÉFAUT ; le zoom est la décision de l'humain
 * qui voit l'écran, et il passe devant.
 * ────────────────────────────────────────────────────────────────────────── */
// Bornes revues le 2026-10-01 après essai de Maxime sur une vraie projection :
// 70 %-200 % devient 50 %-150 %. Le haut descend parce que 200 % n'a jamais
// servi ; le bas descend parce qu'il veut pouvoir faire tenir plus de leçon à
// l'écran quand elle est longue. ⭐ Bornes réglées à l'usage, pas au calcul.
// ⚠️ Une valeur déjà enregistrée hors bornes sur un appareil est ramenée dans
// la plage au chargement (`clampZoom`) : un poste réglé à 200 % se retrouvera
// à 150 %, et c'est voulu.
const PROJ_ZOOM_MIN = 0.5;
const PROJ_ZOOM_MAX = 1.5;
const PROJ_ZOOM_STEP = 0.1;
const PROJ_ZOOM_KEY = "educam_proj_zoom";
// Arrondi au centième : sans lui, additionner 0,1 en virgule flottante finit
// par afficher « 110.00000000000001 % ».
// `Number.isFinite` plutôt que `|| 1` : avec `|| 1`, une valeur 0 — venue d'un
// stockage local abîmé — serait devenue 100 % au lieu d'être ramenée au
// plancher. Faux sans bruit, donc à éviter même quand c'est sans gravité.
const clampZoom = (z) => {
  const n = Number(z);
  const v = Number.isFinite(n) ? n : 1;
  return Math.round(Math.min(PROJ_ZOOM_MAX, Math.max(PROJ_ZOOM_MIN, v)) * 100) / 100;
};

/**
 * A lesson video, played from the copy stored on this device whenever there is
 * one.
 *
 * ⚠️ DEFINED AT MODULE LEVEL ON PURPOSE. A component declared inside a render
 * and mounted as <Component/> is a NEW type on every render, so React unmounts
 * and remounts it — which in this codebase has already cost three separate
 * focus-loss bugs (see the Index: « piège React récurrent »). Declared here, it
 * keeps its state, and the video keeps playing when the screen re-renders.
 *
 * The order of preference, and why:
 *  1. the file on this device — costs no data, works with no signal;
 *  2. a YouTube/Vimeo player — needs the network, nothing we can store;
 *  3. the direct URL over the network — works, but spends data every play;
 *  4. an honest notice — only when there is genuinely nothing to show.
 *
 * `ready` exists so that step 4 is never shown while we are still looking in
 * the local store. Announcing « online only » to a teacher who does have the
 * file, for the half-second the lookup takes, is exactly the kind of small lie
 * that destroys trust in the offline mode.
 */
function LessonVideo({ url, caption, online, variant = "reader", baseFontVw = 1 }) {
  const [localUrl, setLocalUrl] = useState(null);
  const [ready, setReady] = useState(false);
  // The projector is what the class actually looks at: wider, rounder, bigger
  // caption. Same logic, two skins — so a fix can never again land on one view
  // and miss the other.
  const proj = variant === "projector";

  useEffect(() => {
    let cancelled = false;
    let made = null;
    (async () => {
      if (OFFLINE_ENABLED && isDownloadableMedia(url)) {
        try {
          const blob = await loadMediaBlob(url);
          if (blob && !cancelled) {
            made = URL.createObjectURL(blob);
            setLocalUrl(made);
          }
        } catch (_) { /* no local copy is a normal state, not an error */ }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
      // Object URLs hold the whole file in memory until revoked.
      if (made) URL.revokeObjectURL(made);
    };
  }, [url]);

  const radius = proj ? 16 : 10;
  const shadow = proj ? "0 4px 24px rgba(0,0,0,0.1)" : "0 2px 12px rgba(0,0,0,0.08)";
  const videoStyle = { width: "100%", borderRadius: radius, display: "block", boxShadow: shadow };
  const captionStyle = proj
    ? { fontSize: `max(14px, ${baseFontVw * 0.7}vw)`, color: "#6B7280", marginTop: 12, textAlign: "center" }
    : { fontSize: "var(--ec-fs-3)", color: "#6B7280", marginTop: 6, textAlign: "center" };

  const frame = (inner) => (
    <div style={proj ? { width: "100%", maxWidth: PROJ_VIDEO_MAX_W, margin: "0 auto" } : undefined}>
      {inner}
      {caption && <div style={captionStyle}>{caption}</div>}
    </div>
  );

  const unavailable = () => (
    <div style={{
      background: "#F3F4F6", border: "1px dashed #D1D5DB", borderRadius: radius,
      padding: proj ? "40px 20px" : "24px 16px", textAlign: "center", color: "#6B7280",
    }}>
      <div style={{ fontSize: proj ? 40 : "var(--ec-fs-6)", marginBottom: proj ? 8 : 6 }} aria-hidden="true">🎬</div>
      <div style={{ fontSize: proj ? `max(16px, ${baseFontVw * 0.8}vw)` : "var(--ec-fs-3)", fontWeight: 700 }}>
        Vidéo disponible uniquement en ligne
      </div>
      <div style={{ fontSize: proj ? `max(13px, ${baseFontVw * 0.6}vw)` : "var(--ec-fs-2)", marginTop: 4, fontWeight: 400 }}>
        Téléchargez les leçons de la semaine pour l&apos;avoir hors ligne.
      </div>
    </div>
  );

  // Reserve the space rather than jumping the layout once the lookup lands.
  if (!ready) {
    return frame(
      <div style={{ background: "#F3F4F6", borderRadius: radius, height: proj ? 320 : 180 }} aria-hidden="true" />
    );
  }

  if (localUrl) {
    return frame(<video src={localUrl} controls playsInline style={videoStyle} />);
  }

  if (isEmbeddable(url)) {
    if (OFFLINE_ENABLED && !online) return frame(unavailable());
    return frame(
      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: radius, overflow: "hidden", boxShadow: shadow }}>
        <iframe
          src={getEmbedUrl(url)}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (OFFLINE_ENABLED && !online) return frame(unavailable());

  return frame(<video src={url} controls playsInline style={videoStyle} />);
}

// Renders **bold** segments (markdown-style) inside otherwise plain text.
// Headings like "**MON DEVOIR**" or "**À RECOPIER DANS TON CAHIER**" become bold.
function renderRichText(text) {
  if (!text) return null;
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    return m ? <strong key={i}>{m[1]}</strong> : part;
  });
}

/* ══════════════════════════════════════════════════════════════════════════
 * LA TRACE ÉCRITE EN CURSIVE — 2026-10-02
 *
 * Demande d'une enseignante, validée par Maxime : ce que les élèves RECOPIENT
 * (« À recopier dans ton cahier » / « Ce que je retiens ») et le devoir (« Mon
 * devoir » / « Mon défi ») s'affichent en écriture cursive scolaire, pour que
 * l'écran soit un vrai modèle d'écriture attachée. Le « Récapitulons » oral et
 * la ligne d'en-tête (avec son emoji) restent dans la police normale.
 *
 * Police : Borel (Rosalie Wagner, ANRT), licence SIL OFL 1.1 — fichier et
 * licence dans `src/app/fonts/`, déclarée dans `globals.css`. Servie par notre
 * propre site : la règle « aucune Google Font » est respectée.
 *
 * ⚠️ Borel n'a qu'UNE graisse. Le **gras** y devient un faux-gras baveux :
 * dans la trace, les passages en gras sont donc SOULIGNÉS, comme les titres
 * dans un cahier — jamais épaissis.
 *
 * ⚠️ Certaines anciennes leçons découpent la trace en plusieurs blocs de texte
 * (l'en-tête seul, puis « Leçon : … », puis « 1. … »). La cursive s'applique
 * donc À PARTIR du premier bloc d'en-tête et jusqu'à la fin de la section,
 * pas seulement au bloc qui porte l'en-tête. Voir `bilanCursiveFrom`.
 * ══════════════════════════════════════════════════════════════════════════ */
const CURSIVE_FONT = '"Borel", "Segoe Print", "Comic Sans MS", cursive';
const CURSIVE_HEADING = /(À RECOPIER|CE QUE JE RETIENS|MON DEVOIR|MON DÉFI|COPY IN YOUR NOTEBOOK|WHAT I REMEMBER|MY HOMEWORK|MY CHALLENGE)/;

/* LES PAGES DE CAHIER (images du Bilan) SONT MASQUÉES — 2026-10-02.
 * Décision de Maxime : le schéma « page de cahier » répétait le texte à
 * recopier, et les deux versions côte à côte embrouillaient les enfants. On
 * garde le texte (désormais en cursive). Les images restent en base et sur le
 * stockage : remettre `false` ici les fait revenir partout, sans rien
 * re-téléverser. Les schémas de maths et sciences restent visibles dans la
 * section Contenu de chaque leçon. */
const HIDE_BILAN_IMAGES = true;

// Index du premier bloc de texte du Bilan qui ouvre la trace ou le devoir
// (−1 s'il n'y en a pas : aucune cursive dans cette section).
function bilanCursiveFrom(blocks) {
  return (blocks || []).findIndex(
    (b) => b.block_type === "text" && CURSIVE_HEADING.test(String(b.text_content || "").split("\n")[0])
  );
}

// Texte d'un bloc de la trace : la ligne d'en-tête (si c'en est une) reste
// dans la police normale, le reste passe en cursive, le gras devient souligné.
function renderCursiveText(text) {
  if (!text) return null;
  const firstLine = text.split("\n")[0];
  const hasHeading = CURSIVE_HEADING.test(firstLine);
  const head = hasHeading ? firstLine : "";
  const body = hasHeading ? text.slice(firstLine.length) : text;
  return (
    <>
      {head && <span>{renderRichText(head)}</span>}
      <span style={{ fontFamily: CURSIVE_FONT, fontWeight: 400 }}>
        {body.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
          const m = part.match(/^\*\*([^*]+)\*\*$/);
          return m
            ? <span key={i} style={{ textDecoration: "underline", textUnderlineOffset: "0.18em", textDecorationThickness: "0.06em" }}>{m[1]}</span>
            : part;
        })}
      </span>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * L'ÉDITEUR D'EMPLOI DU TEMPS DE L'ENSEIGNANTE — 2026-10-01
 *
 * Décision de Maxime : l'emploi du temps appartient à l'ENSEIGNANTE. Jusqu'ici
 * il ne s'éditait que depuis l'écran de la direction (`schooladmin.js`) ; elle
 * n'en avait qu'une vue en lecture seule. Cet écran inverse cela.
 *
 * 🔴 AU NIVEAU MODULE, ET PAS AILLEURS. Ce composant a des hooks (`useState`).
 * Déclaré à l'intérieur du rendu de Dashboard, il serait une nouvelle identité
 * à chaque rendu : React démonterait tout le sous-arbre et le champ en cours
 * perdrait le focus à chaque frappe. C'est le piège déjà payé QUATRE fois sur
 * ce projet. Au niveau module, il se monte normalement en `<TimetableEditor/>`.
 *
 * CE QU'ELLE CHOISIT : le type de créneau, la matière, la sous-matière et la
 * DURÉE. Jamais une heure. Les heures de début se recalculent seules, en
 * cascade, depuis le début de journée.
 *
 * LES ANCRES (récréation, programme du matin, English, TIC) portent une heure
 * imposée par l'école. Le calcul s'y recale : s'il reste du temps avant une
 * ancre, la ligne l'annonce (« il reste 30 min ») ; si les leçons la
 * dépassent, elle le dit aussi. C'est là tout le modèle des « enveloppes » :
 * on ne l'impose pas, on le MONTRE.
 * ══════════════════════════════════════════════════════════════════════════ */

/* Les matières proposées à l'enseignante : TOUTES, anglais compris.
 *
 * ⚠️ L'anglais en avait été RETIRÉ le 2026-10-01, et c'était la mauvaise porte.
 * Corrigé le 2026-10-02 après essai avec l'enseignante : l'anglais figure bien
 * dans sa journée, elle doit donc pouvoir le poser dans son emploi du temps.
 * Ce qu'il ne faut pas, c'est que la PLATEFORME prétende fournir la leçon —
 * et cela se dit ailleurs, au bon endroit : `subject_coverage`, où l'anglais
 * est passé en `teacher_taught`. L'écran de leçon affiche alors « assuré par
 * un enseignant extérieur », exactement comme TIC, EPS, arts et les autres.
 *
 * ⭐ La règle : « cette matière n'est pas fournie par la plateforme » se dit
 * UNE fois, dans `subject_coverage`, pas en amputant des listes. */
const EDT_MATIERES_ENSEIGNANTE = SUBJECTS;

const EDT_DEBUT = "07:30";
const EDT_FIN = "14:30";
const EDT_DUREES = [15, 30, 45, 60, 75, 90];

// Les types non curriculaires. `ancre: true` = heure imposée par l'école, donc
// le recalcul s'y recale au lieu de la pousser.
const EDT_TYPES = [
  { key: "lecon", label: "Leçon", lecon: true },
  { key: "pause:recreation", label: "Récréation", nom: "Récréation", ancre: true },
  { key: "pause:programme", label: "Programme de l'école", nom: "Programme de l'école", ancre: true },
  { key: "pause:english", label: "English (enseignant extérieur)", nom: "English (enseignant extérieur)", ancre: true },
  { key: "pause:tic", label: "TIC", nom: "TIC", ancre: true },
  { key: "pause:evaluation", label: "Évaluation", nom: "Évaluation" },
  { key: "pause:revision", label: "Révision", nom: "Révision" },
];
const edtTypeByKey = (k) => EDT_TYPES.find((t) => t.key === k);
const edtKeyOf = (slot) =>
  slot.subject_id === "pause" ? `pause:${slot.component_id}` : "lecon";

const edtMin = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const edtHhmm = (mins) => {
  const m = Math.max(0, Math.round(mins));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const EDT_JOURS = [
  { n: 1, nom: "Lundi" }, { n: 2, nom: "Mardi" }, { n: 3, nom: "Mercredi" },
  { n: 4, nom: "Jeudi" }, { n: 5, nom: "Vendredi" },
];

/* ──────────────────────────────────────────────────────────────────────────
 * « CETTE SEMAINE SEULEMENT » — la couche d'exception, 2026-10-01.
 *
 * `timetable_slots` ne portait AUCUNE date : un jour de la semaine et un rang,
 * rien d'autre. « À partir de maintenant » y tenait déjà ; « cette semaine
 * seulement » n'avait nulle part où vivre. D'où la colonne `week_start` :
 *
 *   · NULL             → la semaine permanente, le modèle.
 *   · une date (lundi) → une exception, valable cette semaine-là et périmée
 *                        d'elle-même le lundi suivant.
 *
 * LA RÈGLE DE FUSION EST PAR JOURNÉE, PAS PAR CRÉNEAU. Si une journée porte la
 * moindre exception, elle REMPLACE entièrement la journée permanente. Un
 * mélange ligne à ligne serait imprévisible pour elle : elle a modifié « son
 * lundi », pas « le troisième créneau de son lundi ».
 * ────────────────────────────────────────────────────────────────────────── */

// Le lundi de la semaine d'une date, en "AAAA-MM-JJ".
function edtLundiIso(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));   // dimanche = 6 jours apres lundi
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function edtFusionneSemaine(rows, lundiIso) {
  const joursAvecException = new Set(
    (rows || []).filter((r) => r.week_start === lundiIso).map((r) => r.day_of_week));
  return (rows || []).filter((r) =>
    joursAvecException.has(r.day_of_week) ? r.week_start === lundiIso : !r.week_start);
}

/* ══════════════════════════════════════════════════════════════════════════
 * LE VOYANT DE RETARD — 2026-10-01
 *
 * Décision de Maxime : ce qui n'est pas enseigné dans le mois est REPORTÉ, pas
 * remis à zéro. Une remise à zéro dirait que la classe est à jour alors
 * qu'elle ne l'est pas. Le retard s'accumule donc, et c'est précisément
 * pourquoi le voyant doit être ACTIONNABLE à chaque fois : il dit QUOI
 * ajouter, pas seulement qu'on est en retard. Un voyant qu'on ne peut pas
 * suivre devient un voyant qu'on cesse de lire.
 *
 * 🔴 LE DÉNOMINATEUR SE COMPTE EN JOURS D'ÉCOLE, JAMAIS EN SEMAINES DE
 * CALENDRIER. Un mois à deux jours fériés annoncerait « vous rattraperez »
 * alors que c'est faux. `EDT_FERIES` est VIDE aujourd'hui et c'est voulu :
 * Maxime fournira les dates (fériés, début et fin de trimestre). Le calcul est
 * déjà bâti dessus, donc les ajouter sera une SAISIE et pas une réécriture.
 * ══════════════════════════════════════════════════════════════════════════ */

// Jours non travaillés, au format "AAAA-MM-JJ". À remplir quand les dates
// arrivent — rien d'autre ne change.
const EDT_FERIES = [];

// Le mois courant, au sens du PROGRAMME (Sept = unité 1 … Avril = unité 8).
// Hors année scolaire (mai à août) : pas de voyant, il n'y a pas de mois à
// rattraper. ⚠️ Cette correspondance suppose des mois pleins ; à revoir quand
// les dates de début et de fin de trimestre arriveront.
const EDT_UNITE_PAR_MOIS = { 8: 1, 9: 2, 10: 3, 11: 4, 0: 5, 1: 6, 2: 7, 3: 8 };
const edtUniteDuMois = (d) => EDT_UNITE_PAR_MOIS[d.getMonth()] || null;

/* 🔴 LE MOIS OÙ LA CLASSE COMMENCE SUR LA PLATEFORME.
 *
 * Le report (décision de Maxime : ce qui n'est pas enseigné reste dû) veut que
 * le voyant compte TOUT l'arriéré, pas seulement le mois courant — sinon il
 * sous-estime exactement ce que le report accumule.
 *
 * Mais il ne doit pas compter les mois d'AVANT le pilote. La classe n'a rien
 * enseigné sur la plateforme en septembre, pour la bonne raison qu'elle ne
 * l'utilisait pas : démarrer en annonçant « 21 leçons de retard » ferait du
 * voyant un décor dès le premier jour, et c'est précisément la panne qu'on
 * cherche à éviter.
 *
 * 2 = octobre, le mois du démarrage réel. À corriger si la classe démarre un
 * autre mois ; à NE PAS confondre avec l'unité en cours.
 *
 * ⚠️ CE NOMBRE SERT À DEUX ENDROITS, et il le faut : il est le PLANCHER de la
 * file d'attente (`getQueuedLesson`) autant que du voyant de retard. Confirmé
 * par Maxime le 2026-10-01 : l'année commence le lundi 5 octobre, à l'unité 2
 * « Le village, la ville ». Sans ce plancher, la file servait sagement la
 * première leçon non enseignée — c'est-à-dire SEPTEMBRE — le jour de la
 * rentrée. Un défaut qui ne lève aucune erreur : l'écran aurait simplement
 * affiché la mauvaise leçon, et personne ne l'aurait su avant la classe.
 */
const EDT_UNITE_DEPART = 2;

// Premier jour d'école de l'année (confirmé par Maxime : lundi 5 octobre 2026).
// Le voyant de retard ne compte pas les jours d'école qui le précèdent : ils
// gonfleraient la capacité de rattrapage d'un mois qui n'a pas commencé.
const EDT_DEBUT_ANNEE = new Date(2026, 9, 5);

const edtIsoJour = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Les jours d'école qui restent dans le mois en cours, aujourd'hui compris.
function edtJoursEcoleRestants(aujourdhui) {
  const out = [];
  // On ne compte jamais un jour d'avant la rentrée : il n'offre aucune
  // occasion d'enseigner, donc l'inclure ferait croire à une marge qui
  // n'existe pas.
  const depart = (aujourdhui < EDT_DEBUT_ANNEE) ? EDT_DEBUT_ANNEE : aujourdhui;
  const d = new Date(depart.getFullYear(), depart.getMonth(), depart.getDate());
  const mois = d.getMonth();
  while (d.getMonth() === mois) {
    const jour = d.getDay();                       // 0 = dimanche
    if (jour >= 1 && jour <= 5 && !EDT_FERIES.includes(edtIsoJour(d))) out.push(jour);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/**
 * Pour chaque sous-matière présente dans l'emploi du temps : ce qui reste dû
 * ce mois-ci, combien de fois le créneau reviendra d'ici la fin du mois, et
 * ce qu'il faudrait ajouter. `unite` = le mois en cours, au sens du programme.
 */
function edtCalculeRetard({ lessons, timetable, unite, subjects, aujourdhui }) {
  const joursRestants = edtJoursEcoleRestants(aujourdhui || new Date());
  const creneaux = (timetable || []).filter(
    (s) => s.subject_id && s.subject_id !== "pause" && s.subject_id !== "etude");

  // Une entrée par sous-matière réellement programmée.
  const parCle = new Map();
  creneaux.forEach((s) => {
    const cle = `${s.subject_id}·${s.component_id}`;
    if (!parCle.has(cle)) parCle.set(cle, { subject_id: s.subject_id, component_id: s.component_id, jours: [] });
    parCle.get(cle).jours.push(s.day_of_week);
  });

  const lignes = [];
  parCle.forEach((v) => {
    // Le REPORT : tout ce qui reste dû depuis le démarrage du pilote jusqu'au
    // mois en cours, et non le seul mois en cours. Une leçon d'octobre non
    // tenue est toujours due en novembre — c'est la décision « report, pas
    // remise à zéro », et la compter ici est la seule façon qu'elle soit vraie.
    const duMois = (lessons || []).filter((l) =>
      l.subject_id === v.subject_id && l.component_id === v.component_id &&
      l.unit_number >= EDT_UNITE_DEPART && l.unit_number <= unite);
    if (duMois.length === 0) return;               // matière sans contenu : rien à dire
    const du = duMois.filter((l) => !l.taught).length;
    if (du === 0) {
      lignes.push({ ...v, total: duMois.length, du: 0, occurrences: 0, manque: 0, etat: "ok" });
      return;
    }
    // Combien de fois ce créneau revient d'ici la fin du mois.
    const occurrences = joursRestants.reduce(
      (n, jour) => n + v.jours.filter((j) => j === jour).length, 0);
    const manque = Math.max(0, du - occurrences);
    const semaines = Math.max(1, Math.ceil(joursRestants.length / 5));
    const parSemaine = Math.ceil(manque / semaines);
    // Rattrapable ? On s'autorise au plus deux créneaux ajoutés par jour
    // d'école restant. Au-delà, ce n'est plus un problème d'emploi du temps.
    const capacite = joursRestants.length * 2;
    const matiere = (subjects || []).find((s) => s.id === v.subject_id);
    lignes.push({
      ...v,
      nomMatiere: matiere?.name || v.subject_id,
      nomComposante: matiere?.components.find((c) => c.id === v.component_id)?.name || v.component_id,
      total: duMois.length, du, occurrences, manque, parSemaine,
      etat: manque === 0 ? "ok" : (manque > capacite ? "perdu" : "retard"),
    });
  });

  lignes.sort((a, b) => b.manque - a.manque);
  return {
    lignes,
    enRetard: lignes.filter((l) => l.etat === "retard"),
    perdues: lignes.filter((l) => l.etat === "perdu"),
    joursRestants: joursRestants.length,
  };
}

/** Le voyant lui-même. Deux visages — voir l'en-tête ci-dessus. */
function RetardNotice({ retard, mois, vendrediLibre, onAjuster }) {
  if (!retard || (retard.enRetard.length === 0 && retard.perdues.length === 0)) return null;
  const perdu = retard.perdues.length > 0;

  return (
    <div style={{
      marginTop: 16, padding: "16px 18px", borderRadius: 12,
      background: perdu ? COLORS.card : COLORS.critBg,
      border: `1px solid ${perdu ? COLORS.negBrd : COLORS.critBrd}`,
      borderLeft: `5px solid ${perdu ? COLORS.neg : COLORS.crit}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: perdu ? COLORS.neg : COLORS.crit, flexShrink: 0 }} />
        <div style={{ fontSize: "var(--ec-fs-5)", fontWeight: 800, color: perdu ? COLORS.ink : COLORS.crit, letterSpacing: "-.01em" }}>
          {perdu
            ? `${mois} ne peut plus être rattrapé`
            : `Retard sur le programme de ${mois.toLowerCase()}`}
        </div>
      </div>

      {perdu ? (
        <>
          <div style={{ fontSize: "var(--ec-fs-3)", color: COLORS.ink2, marginTop: 10, lineHeight: 1.55 }}>
            Il reste {retard.joursRestants} jour{retard.joursRestants > 1 ? "s" : ""} d'école ce mois-ci,
            et trop de leçons dues pour qu'un emploi du temps y suffise.
            Ce n'est plus à vous de le résoudre.
          </div>
          <div style={{
            marginTop: 12, padding: "12px 14px", background: COLORS.panel,
            border: `1px solid ${COLORS.divider}`, borderRadius: 10,
            fontSize: "var(--ec-fs-3)", color: COLORS.ink2,
          }}>
            Le référent et l'équipe EduCam en sont informés. Les leçons non enseignées ne sont pas
            perdues : elles passent au mois suivant.
          </div>
        </>
      ) : (
        <>
          {retard.enRetard.slice(0, 3).map((l) => (
            <div key={`${l.subject_id}·${l.component_id}`} style={{
              marginTop: 10, padding: "12px 14px", background: COLORS.card,
              border: `1px solid ${COLORS.critBrd}`, borderRadius: 10,
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
                <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 800, color: COLORS.ink }}>{l.nomComposante}</div>
                <div style={{ fontSize: "var(--ec-fs-3)", fontWeight: 700, color: COLORS.neg }}>
                  {l.manque} leçon{l.manque > 1 ? "s" : ""} de retard
                </div>
              </div>
              <div style={{ fontSize: "var(--ec-fs-3)", color: COLORS.ink2, marginTop: 4 }}>
                Ajoutez <strong style={{ color: COLORS.ink }}>{l.parSemaine} créneau{l.parSemaine > 1 ? "x" : ""} par semaine</strong>
                {vendrediLibre ? ", ou utilisez un vendredi en rattrapage." : "."}
              </div>
            </div>
          ))}
          {onAjuster && (
            <button type="button" className="ec-btn" style={{ marginTop: 14 }} onClick={onAjuster}>
              Ajuster mon emploi du temps
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Recalcule les heures d'une journée. Une seule passe, de haut en bas.
 * Rend, pour chaque ligne : son début, sa fin, et l'écart constaté avant une
 * ancre (`libre` = minutes creuses avant une heure fixee par l'ecole).
 */
function edtRecalcule(lignes) {
  const finJour = edtMin(EDT_FIN);
  let curseur = edtMin(EDT_DEBUT);
  const out = [];
  for (const l of lignes) {
    const t = edtTypeByKey(l.kind);
    let libre = 0;
    if (t?.ancre && l.ancreDebut != null && curseur < l.ancreDebut) {
      libre = l.ancreDebut - curseur;
      curseur = l.ancreDebut;
    }
    /* 🔴 LA JOURNÉE S'ARRÊTE À 14:30 — ON NE MONTRE RIEN APRÈS.
     *
     * Décision de Maxime, 2026-10-01, après deux captures d'écran. D'abord
     * l'éditeur inventait des heures jusqu'à 23:10 ; puis il affichait ces
     * lignes sous l'étiquette « hors journée ». Les deux versions encombrent
     * l'écran d'une journée qui n'existe pas. Un créneau qui ne tient pas
     * dans la journée n'est tout simplement PAS une ligne de l'emploi du
     * temps : il disparaît de l'écran. Si elle veut un créneau de plus, elle
     * l'ajoute elle-même — et le bouton ne le permet que s'il reste du temps.
     *
     * ⚠️ Conséquence à connaître : une journée déjà trop chargée en base
     * (données de démonstration, ancien modèle) perd ses créneaux excédentaires
     * À L'ENREGISTREMENT, puisque l'enregistrement réécrit la journée à partir
     * de ce qui est affiché. C'est voulu — mais c'est une suppression, et elle
     * ne doit surprendre personne. */
    if (curseur + l.minutes > finJour) break;
    const debut = curseur;
    curseur += l.minutes;
    out.push({ ...l, debut, fin: curseur, libre });
  }
  return out;
}

function TimetableEditor({ teacher, timetable, subjects, online, onSaved, onBack, retard, moisCourant }) {
  const [jour, setJour] = useState(1);
  const [lignes, setLignes] = useState([]);
  const [avant, setAvant] = useState(null);          // une seule marche arrière
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Charge la journée demandée depuis l'emploi du temps en vigueur.
  useEffect(() => {
    const dujour = (timetable || [])
      .filter((s) => s.day_of_week === jour)
      .slice()
      .sort((a, b) => (a.slot_order || 0) - (b.slot_order || 0));
    setLignes(dujour.map((s, i) => ({
      uid: `${jour}-${i}-${s.id || "n"}`,
      kind: edtKeyOf(s),
      subject_id: s.subject_id,
      component_id: s.component_id,
      minutes: Math.max(15, (edtMin(s.end_time) || 0) - (edtMin(s.start_time) || 0) || 60),
      ancreDebut: edtMin(s.start_time),
    })));
    setAvant(null);
    setMsg(null);
  }, [jour, timetable]);

  const calc = edtRecalcule(lignes);
  const finJournee = calc.length ? calc[calc.length - 1].fin : edtMin(EDT_DEBUT);
  const resteFinJournee = edtMin(EDT_FIN) - finJournee;

  // Toute modification passe par ici : c'est le seul endroit qui mémorise
  // l'état précédent, donc le seul qui rend « annuler » fiable.
  const modifier = (fn) => {
    setAvant(lignes);
    setLignes(fn(lignes));
    setMsg(null);
  };

  const changeType = (uid, key) => modifier((prev) => prev.map((l) => {
    if (l.uid !== uid) return l;
    const t = edtTypeByKey(key);
    if (t?.lecon) {
      const s0 = subjects[0];
      return { ...l, kind: key, subject_id: s0.id, component_id: s0.components[0].id };
    }
    return { ...l, kind: key, subject_id: "pause", component_id: key.split(":")[1] };
  }));

  const changeMatiere = (uid, sid) => modifier((prev) => prev.map((l) =>
    l.uid === uid
      ? { ...l, subject_id: sid, component_id: (subjects.find((s) => s.id === sid)?.components[0]?.id || "") }
      : l));

  const changeChamp = (uid, champ, valeur) => modifier((prev) =>
    prev.map((l) => (l.uid === uid ? { ...l, [champ]: valeur } : l)));

  /* ⚠️ LE NOUVEAU CRÉNEAU PREND LA PLUS GRANDE DURÉE QUI TIENT ENCORE.
     Signalé par Maxime le 2026-10-02, en direct avec l'enseignante : arrivée à
     13:45 avec 45 minutes devant elle, elle appuyait sur « Ajouter un créneau »
     et RIEN n'apparaissait. Le bouton était pourtant actif.
     La cause : la ligne était créée à 60 min par défaut, et la coupe à 14:30
     (`edtRecalcule`) l'écartait aussitôt — sans erreur, sans message. Le pire
     des défauts : un bouton qui répond en apparence et ne fait rien.
     On calcule donc d'abord la place restante, et on y loge la plus grande
     durée possible (45, 30 ou 15). S'il ne reste pas même 15 minutes, le
     bouton est désactivé en amont. */
  const ajouter = () => modifier((prev) => {
    const s0 = subjects[0];
    const dejaPose = edtRecalcule(prev);
    const finCourante = dejaPose.length ? dejaPose[dejaPose.length - 1].fin : edtMin(EDT_DEBUT);
    const reste = edtMin(EDT_FIN) - finCourante;
    const duree = EDT_DUREES.filter((d) => d <= reste).pop();
    if (!duree) return prev;
    return [...prev, {
      uid: `n-${Date.now()}`, kind: "lecon",
      subject_id: s0.id, component_id: s0.components[0].id,
      minutes: duree, ancreDebut: null,
    }];
  });
  const retirer = (uid) => modifier((prev) => prev.filter((l) => l.uid !== uid));

  const annuler = () => { if (avant) { setLignes(avant); setAvant(null); setMsg(null); } };

  /* ────────────────────────────────────────────────────────────────────────
     ENREGISTRER — UNE SEULE JOURNÉE, et jamais par « tout supprimer ».
     L'écran de la direction efface tout l'emploi du temps puis le réinsère :
     une coupure au milieu, et la semaine est perdue. Ici on écrit les lignes
     de CETTE journée par `upsert` sur l'index unique
     (owner_teacher_id, day_of_week, slot_order), PUIS on retire la queue
     devenue inutile si la journée a raccourci.
     ⚠️ L'ORDRE COMPTE. Upsert d'abord, suppression ensuite : si la seconde
     échoue il reste des créneaux en trop — visible, réparable. L'inverse
     laisserait une journée vide.
     ──────────────────────────────────────────────────────────────────────── */
  const enregistrer = async (portee) => {
    if (!online) { setMsg({ t: "Enregistrement impossible sans réseau. Réessayez une fois connectée.", tone: "err" }); return; }
    // `portee` : "semaine" = une exception pour la semaine en cours seulement,
    // "toujours" = le modèle permanent. Une exception porte le lundi de la
    // semaine ; le modèle porte NULL.
    const lundi = portee === "semaine" ? edtLundiIso(new Date()) : null;
    setSaving(true); setMsg(null);
    try {
      const rows = calc.map((l, i) => {
        const t = edtTypeByKey(l.kind);
        const matiere = subjects.find((s) => s.id === l.subject_id);
        return {
          level: teacher.level, day_of_week: jour, slot_order: i + 1,
          start_time: edtHhmm(l.debut), end_time: edtHhmm(l.fin),
          subject_id: t?.lecon ? l.subject_id : "pause",
          component_id: t?.lecon ? l.component_id : l.kind.split(":")[1],
          subject_name: t?.lecon ? (matiere?.name || null) : t.nom,
          component_name: t?.lecon
            ? (matiere?.components.find((c) => c.id === l.component_id)?.name || null)
            : "",
          school_id: teacher.school_id,
          // owner_teacher_id et week_start sont posés par la fonction côté
          // base — ne pas les envoyer d'ici : ils y seraient ignorés, et les
          // écrire donnerait l'illusion qu'on peut les choisir.
        };
      });
      /* ✅ UN SEUL APPEL, UNE SEULE TRANSACTION (2026-10-02).
       *
       * 🔴 Ce qu'il y avait avant et pourquoi ça échouait : un
       * `upsert ... onConflict` sur les colonnes (owner_teacher_id,
       * day_of_week, slot_order, week_start), alors que l'index unique porte
       * sur une EXPRESSION — `coalesce(week_start,'1900-01-01')` — parce qu'en
       * SQL deux NULL ne sont jamais « égaux » et qu'un index sur la colonne
       * nue ne protégerait pas le modèle permanent. PostgreSQL ne peut pas
       * relier les deux et refuse avec **42P10**. « À partir de maintenant »
       * échouait donc à tous les coups, « cette semaine seulement » passait
       * (insertion simple). Reproduit en base, pas deviné.
       *
       * `educam_save_timetable_day` efface la journée pour CETTE portée puis
       * la réécrit — le tout dans le corps d'une fonction, donc **une seule
       * transaction** : si l'insertion échoue, la suppression est annulée avec
       * elle. Une journée ne peut plus se retrouver vide ni à moitié écrite,
       * ce que deux requêtes depuis le navigateur ne pouvaient pas garantir.
       *
       * `owner_teacher_id` est forcé à `auth.uid()` côté base : la charge utile
       * envoyée d'ici ne peut pas désigner l'emploi du temps de quelqu'un
       * d'autre. */
      const { error } = await supabase.rpc("educam_save_timetable_day", {
        p_day: jour,
        p_week_start: lundi,
        p_rows: rows,
      });
      if (error) throw error;

      setAvant(null);
      setMsg({
        t: lundi
          ? "Enregistré pour cette semaine seulement. Lundi prochain, votre emploi du temps habituel revient."
          : "Enregistré. C'est votre emploi du temps habituel à partir de maintenant.",
        tone: "ok",
      });
      if (onSaved) await onSaved();
    } catch (_) {
      /* ⚠️ Message HONNÊTE. L'ancien disait « Rien n'a été perdu » : faux, et
         Maxime l'a vu le 2026-10-02 — l'enseignante rafraîchissait la page et
         sa journée avait disparu. Ce qui reste à l'écran n'est PAS enregistré.
         Ne jamais rassurer sur ce qu'on n'a pas vérifié. */
      setMsg({
        t: "L'enregistrement a échoué. Votre journée est encore affichée mais PAS enregistrée : "
         + "ne quittez pas la page et réessayez.",
        tone: "err",
      });
    }
    setSaving(false);
  };

  const cellSel = {
    width: "100%", minHeight: 44, boxSizing: "border-box", padding: "9px 10px",
    fontSize: "var(--ec-fs-3)", fontWeight: 600, color: COLORS.ink,
    background: COLORS.card, border: `1px solid ${COLORS.border2}`, borderRadius: 10,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className="ec-h1">Modifier mon emploi du temps</h1>
          <p className="ec-sub">
            Vous choisissez les matières et les durées. Les heures se recalculent seules.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="ec-btn ec-btn--ghost" onClick={onBack}>Retour</button>
          <button type="button" className="ec-btn ec-btn--ghost" onClick={annuler} disabled={!avant}>
            Annuler ma dernière modification
          </button>
        </div>
      </div>

      <RetardNotice retard={retard} mois={moisCourant} vendrediLibre={true} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        {EDT_JOURS.map((j) => (          <button
            key={j.n}
            type="button"
            onClick={() => setJour(j.n)}
            aria-current={jour === j.n}
            style={{
              minHeight: 44, padding: "10px 18px", borderRadius: 10, cursor: "pointer",
              fontFamily: "inherit", fontSize: "var(--ec-fs-3)", fontWeight: 700,
              border: `1px solid ${jour === j.n ? COLORS.g700 : COLORS.border}`,
              background: jour === j.n ? COLORS.g700 : COLORS.card,
              color: jour === j.n ? "#FFFFFF" : COLORS.ink2,
            }}
          >
            {j.nom}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{
          marginTop: 14, padding: "12px 14px", borderRadius: 10,
          background: msg.tone === "ok" ? COLORS.g50 : COLORS.critBg,
          border: `1px solid ${msg.tone === "ok" ? COLORS.g200 : COLORS.critBrd}`,
          color: msg.tone === "ok" ? COLORS.good : COLORS.crit,
          fontSize: "var(--ec-fs-3)", fontWeight: 700,
        }}>{msg.t}</div>
      )}

      <Card style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
        {calc.length === 0 && (
          <div style={{ padding: 22, fontSize: "var(--ec-fs-3)", color: COLORS.ink3 }}>
            Aucun créneau ce jour-là. Ajoutez-en un ci-dessous.
          </div>
        )}

        {calc.map((l) => {
          const t = edtTypeByKey(l.kind);
          const matiere = subjects.find((s) => s.id === l.subject_id);
          return (
            <Fragment key={l.uid}>
              {l.libre > 0 && (
                <div style={{
                  padding: "7px 18px", background: COLORS.warnBg,
                  fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.warn,
                }}>
                  {l.libre} min libres avant {t?.nom || "ce créneau"}
                </div>
              )}
              <div style={{
                display: "grid",
                gridTemplateColumns: "92px 110px minmax(0,1fr) minmax(0,1fr) 44px",
                gap: 10, alignItems: "center", padding: "12px 18px",
                borderTop: `1px solid ${COLORS.divider}`,
                background: t?.ancre ? COLORS.panel : COLORS.card,
              }}>
                <div style={{ fontSize: "var(--ec-fs-3)", fontWeight: 700, color: COLORS.ink }}>
                  {edtHhmm(l.debut)}
                </div>

                <select
                  aria-label={`Durée du créneau de ${edtHhmm(l.debut)}`}
                  style={cellSel}
                  value={l.minutes}
                  onChange={(e) => changeChamp(l.uid, "minutes", Number(e.target.value))}
                >
                  {/* Seules les durées qui TIENNENT encore sont proposées : on ne
                      peut donc pas fabriquer un créneau qui déborde. La durée
                      actuelle reste dans la liste même si elle ne tient plus,
                      sinon le menu afficherait une valeur absente de ses options. */}
                  {EDT_DUREES.filter((d) => d <= (edtMin(EDT_FIN) - l.debut) || d === l.minutes)
                    .map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>

                <select
                  aria-label={`Type du créneau de ${edtHhmm(l.debut)}`}
                  style={cellSel}
                  value={l.kind}
                  onChange={(e) => changeType(l.uid, e.target.value)}
                >
                  {EDT_TYPES.map((tt) => <option key={tt.key} value={tt.key}>{tt.label}</option>)}
                </select>

                {t?.lecon ? (
                  <div style={{ display: "flex", gap: 8, minWidth: 0 }}>
                    <select
                      aria-label={`Matière du créneau de ${edtHhmm(l.debut)}`}
                      style={{ ...cellSel, flex: "1 1 0" }}
                      value={l.subject_id}
                      onChange={(e) => changeMatiere(l.uid, e.target.value)}
                    >
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select
                      aria-label={`Sous-matière du créneau de ${edtHhmm(l.debut)}`}
                      style={{ ...cellSel, flex: "1 1 0" }}
                      value={l.component_id}
                      onChange={(e) => changeChamp(l.uid, "component_id", e.target.value)}
                    >
                      {(matiere?.components || []).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ fontSize: "var(--ec-fs-3)", color: COLORS.ink3, fontWeight: 600 }}>
                    {t?.ancre ? "Horaire fixé par l'école" : "Pas de leçon à projeter"}
                  </div>
                )}

                <button
                  type="button"
                  aria-label={`Retirer le créneau de ${edtHhmm(l.debut)}`}
                  onClick={() => retirer(l.uid)}
                  style={{
                    minHeight: 44, minWidth: 44, borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${COLORS.border2}`, background: COLORS.card,
                    color: COLORS.ink2, fontSize: "var(--ec-fs-4)", fontWeight: 700,
                  }}
                >×</button>
              </div>

              {l.minutes < 60 && t?.lecon && (
                <div style={{
                  padding: "0 18px 10px 212px", fontSize: "var(--ec-fs-2)", color: COLORS.warn,
                }}>
                  {l.minutes} min : une leçon complète en demande environ 60.
                </div>
              )}
            </Fragment>
          );
        })}

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 14, padding: "14px 18px", borderTop: `1px solid ${COLORS.divider}`,
          background: COLORS.panel, flexWrap: "wrap",
        }}>
          <div style={{ fontSize: "var(--ec-fs-3)", fontWeight: 700, color: resteFinJournee < 0 ? COLORS.crit : COLORS.ink2 }}>
            {resteFinJournee > 0
              ? `Fin à ${edtHhmm(finJournee)} — ${resteFinJournee} min libres avant ${EDT_FIN}`
              : `La journée est complète : elle se termine à ${EDT_FIN}`}
          </div>
          <button
            type="button"
            className="ec-btn ec-btn--ghost"
            onClick={ajouter}
            disabled={resteFinJournee < EDT_DUREES[0]}
          >
            Ajouter un créneau
          </button>
        </div>
      </Card>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, maxWidth: 560 }}>
          Gardez-vous ce {EDT_JOURS.find((j) => j.n === jour)?.nom.toLowerCase()} pour cette semaine,
          ou devient-il votre {EDT_JOURS.find((j) => j.n === jour)?.nom.toLowerCase()} habituel ?
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="ec-btn ec-btn--ghost"
            onClick={() => enregistrer("semaine")}
            disabled={saving}
          >
            {saving ? "…" : "Cette semaine seulement"}
          </button>
          <button
            type="button"
            className="ec-btn"
            onClick={() => enregistrer("toujours")}
            disabled={saving}
          >
            {saving ? "Enregistrement…" : "À partir de maintenant"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * LA BOÎTE DE DIALOGUE VERS L'ADMINISTRATEUR — 2026-10-01
 *
 * Demande de Maxime : une fenêtre flottante, présente sur TOUTES les pages,
 * par laquelle un utilisateur lui écrit directement. Surtout les parents — les
 * enseignants ont d'autres moyens — mais ouverte à tous.
 *
 * 🔴 CE QUI TIENT LA CONFIDENTIALITÉ, C'EST `school_id` À NULL, PAS L'ÉCRAN.
 * La politique `messages read scoped` laisse un directeur lire tout message
 * portant le `school_id` de son école. Sans `school_id`, cette branche ne
 * s'applique jamais : seuls l'expéditeur, le destinataire et l'administrateur
 * lisent. Vérifié en base le 2026-10-01 en se faisant passer pour un référent :
 * 0 ligne. **Ne JAMAIS ajouter de `school_id` à ces messages** — ce serait
 * rendre tout le fil visible à l'école, rétroactivement et en silence.
 *
 * Le message est ADRESSÉ à l'administrateur (`recipient_id`), et pas laissé
 * sans destinataire : c'est ce qui fait qu'il arrive dans sa messagerie et que
 * `send-direct-message` sait quel numéro notifier.
 *
 * 🔴 AU NIVEAU MODULE : ce composant a des hooks. Déclaré dans le rendu, il
 * serait une identité neuve à chaque frappe et le champ perdrait le focus —
 * le piège React payé quatre fois sur ce projet.
 * ══════════════════════════════════════════════════════════════════════════ */

function AdminChat({ moiId, online, pushToast, usurpation }) {
  const [ouvert, setOuvert] = useState(false);
  const [fil, setFil] = useState([]);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [adminId, setAdminId] = useState(null);
  const basRef = useRef(null);

  // Le fil complet : tout ce qui circule entre cette personne et
  // l'administration, c'est-à-dire tout message sans école où elle est
  // expéditrice ou destinataire. La RLS a déjà restreint la lecture ; ce
  // filtre ne fait qu'écarter les messages de l'école.
  const charger = async () => {
    if (!moiId) return;
    const { data } = await supabase.from("messages").select("*")
      .is("school_id", null)
      .or(`sender_id.eq.${moiId},recipient_id.eq.${moiId}`)
      .order("created_at", { ascending: true });
    setFil(data || []);
  };

  useEffect(() => {
    if (!ouvert) return;
    charger();
    supabase.rpc("educam_support_admin").then(({ data }) => setAdminId(data || null));
  }, [ouvert, moiId]);

  // Toujours montrer le dernier message : un fil qui s'ouvre en haut oblige à
  // faire défiler pour voir la réponse qu'on attendait.
  useEffect(() => {
    if (ouvert && basRef.current) basRef.current.scrollTop = basRef.current.scrollHeight;
  }, [ouvert, fil.length]);

  const envoyer = async () => {
    const corps = texte.trim();
    if (!corps || envoi) return;
    if (usurpation) {
      pushToast("Vous agissez en tant qu'une autre personne : l'envoi est désactivé.", "error");
      return;
    }
    if (!online) { pushToast("Pas de réseau. Réessayez une fois connectée.", "error"); return; }
    if (!adminId) { pushToast("Destinataire introuvable. Réessayez dans un instant.", "error"); return; }
    setEnvoi(true);
    try {
      // Le premier message d'un échange EST la racine du fil : on fixe son id
      // nous-mêmes pour que `thread_id` vaille `id` sans second aller-retour.
      const racine = fil.find((m) => m.thread_id)?.thread_id || newId();
      const { data, error } = await supabase.from("messages").insert({
        id: fil.length === 0 ? racine : undefined,
        sender_id: moiId,
        recipient_id: adminId,
        audience: "admin",
        school_id: null,          // 🔴 voir l'en-tête : c'est la confidentialité
        student_id: null,
        thread_id: racine,
        subject: "Communiquer avec la plateforme",
        body: corps,
      }).select().single();
      if (error) throw error;
      setTexte("");
      setFil((prev) => [...prev, data]);
      // La notification WhatsApp est un PLUS, jamais une dépendance : le
      // message est déjà parti. On n'échoue pas si elle échoue.
      notifyDirectMessage({ messageId: data.id }).catch(() => {});
    } catch (e) {
      /* ⚠️ Distinguer un REFUS d'un incident. Un refus de la politique (42501)
         ne se répare pas en réessayant : dire « réessayez » envoie la personne
         appuyer dix fois sur un bouton qui ne marchera jamais. C'est ce qui est
         arrivé le 2026-10-01 pendant un essai en « Agir en tant que ». */
      const refus = e?.code === "42501" || /row-level security|policy/i.test(String(e?.message || ""));
      pushToast(
        refus
          ? "Envoi refusé : ce compte n'a pas le droit d'écrire ici."
          : "Impossible d'envoyer. Rien n'est perdu, réessayez.",
        "error");
    }
    setEnvoi(false);
  };

  if (!moiId) return null;

  return (
    <>
      {!ouvert && (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          aria-label="Communiquer avec la plateforme"
          className="ec-adminchat"
          style={{
            minHeight: 56, minWidth: 56, padding: "0 20px", borderRadius: 28,
            border: `1px solid ${COLORS.g700}`, background: COLORS.g500, color: "#FFFFFF",
            fontFamily: "inherit", fontSize: "var(--ec-fs-3)", fontWeight: 700,
            boxShadow: SHADOW.md, cursor: "pointer",
          }}
        >
          Nous écrire
        </button>
      )}

      {ouvert && (
        <div className="ec-adminchat" style={{
          width: "min(380px, calc(100vw - 32px))",
          display: "flex", flexDirection: "column",
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: 14, boxShadow: SHADOW.md, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 10, padding: "12px 14px", background: COLORS.g700,
          }}>
            <div>
              <div style={{ fontSize: "var(--ec-fs-3)", fontWeight: 800, color: "#FFFFFF" }}>
                Communiquer avec la plateforme
              </div>
              <div style={{ fontSize: "var(--ec-fs-1)", color: COLORS.g100 }}>
                Votre école ne voit pas ces messages.
              </div>
            </div>
            <button
              type="button" onClick={() => setOuvert(false)} aria-label="Fermer"
              style={{
                minHeight: 40, minWidth: 40, borderRadius: 10, cursor: "pointer",
                border: "1px solid rgba(255,255,255,.35)", background: "transparent",
                color: "#FFFFFF", fontSize: "var(--ec-fs-4)", fontWeight: 700,
              }}
            >×</button>
          </div>

          <div ref={basRef} style={{ flexGrow: 1, overflowY: "auto", padding: 14, background: COLORS.panel }}>
            {fil.length === 0 ? (
              <div style={{ fontSize: "var(--ec-fs-3)", color: COLORS.ink3, padding: "8px 2px" }}>
                Posez votre question ici. Elle arrive directement à l'équipe
                d'EduCam — pas à votre école — et la réponse revient dans cette
                même fenêtre.
              </div>
            ) : fil.map((m) => {
              const demoi = m.sender_id === moiId;
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: demoi ? "flex-end" : "flex-start", marginBottom: 9 }}>
                  <div style={{
                    maxWidth: "85%", padding: "9px 12px", borderRadius: 12,
                    background: demoi ? COLORS.g50 : COLORS.card,
                    border: `1px solid ${demoi ? COLORS.g200 : COLORS.border}`,
                  }}>
                    <div style={{ fontSize: "var(--ec-fs-1)", fontWeight: 700, color: COLORS.ink3, textTransform: "uppercase", letterSpacing: ".06em" }}>
                      {demoi ? "Vous" : "Administration"}
                    </div>
                    <div style={{ fontSize: "var(--ec-fs-3)", color: COLORS.ink, marginTop: 2, whiteSpace: "pre-wrap" }}>
                      {m.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {usurpation && (
            <div style={{
              padding: "10px 14px", background: COLORS.warnBg,
              borderTop: `1px solid ${COLORS.border}`,
              fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.warn,
            }}>
              Vous agissez en tant qu'une autre personne. Vous pouvez lire l'échange,
              pas écrire à sa place.
            </div>
          )}

          <div style={{ padding: 12, borderTop: `1px solid ${COLORS.divider}`, display: "flex", gap: 8, alignItems: "flex-end" }}>
            <label htmlFor="ec-adminchat" className="ec-sr">Votre message</label>
            <textarea
              id="ec-adminchat"
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={2}
              disabled={usurpation}
              placeholder={usurpation ? "Envoi désactivé" : "Votre message…"}
              style={{
                flexGrow: 1, resize: "none", minHeight: 44, padding: "10px 12px",
                fontFamily: "inherit", fontSize: "var(--ec-fs-3)", color: COLORS.ink,
                border: `1px solid ${COLORS.border2}`, borderRadius: 10, background: COLORS.card,
              }}
            />
            <button
              type="button" className="ec-btn" onClick={envoyer}
              disabled={envoi || usurpation || !texte.trim()}
              style={{ minHeight: 44 }}
            >
              {envoi ? "…" : "Envoyer"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Dashboard({ teacher, parent, onLogout, impersonating, impersonationName, onExitImpersonation, onImpersonate }) {
  // Only admins may edit base content; everyone else is a read-only reviewer
  // who can leave feedback. Defaults to reviewer if role is missing.
  const isAdmin = teacher?.role === "admin";
  // The on-site "référent" shares the school-director experience for now, but is
  // a DISTINCT role so its access can be restricted independently later. Every
  // director-scoped check below treats referent like school_admin; isReferent is
  // kept for labels and any future divergence. (RLS mirrors this: educam_is_school_admin()
  // returns true for role IN ('school_admin','referent').)
  const isReferent = PROFILES_ENABLED && teacher?.role === "referent";
  const isSchoolAdmin = PROFILES_ENABLED && (teacher?.role === "school_admin" || teacher?.role === "referent");
  const isParent = PROFILES_ENABLED && !!parent;

  // Parent mode: the WHOLE curriculum of the linked class, each lesson tagged as
  // taught (full access) or not-yet-taught (preview — the exercise & "à recopier"
  // sections are locked). Parents can look ahead and practise, but the "do the
  // work" sections stay locked until the teacher has taught the lesson.
  const [parentLessons, setParentLessons] = useState([]);
  const [parentTaughtIds, setParentTaughtIds] = useState(() => new Set());
  const [parentStudent, setParentStudent] = useState(null);   // the linked child
  const [parentResults, setParentResults] = useState([]);      // the child's daily results
  // ---- Unified inbox (parents AND teachers) ----
  const [inbox, setInbox] = useState([]);                      // messages received by the current user
  // Qui a écrit : { [id]: { nom, role } }. Rempli après coup, parce que la
  // table `messages` ne porte qu'un `sender_id` et qu'un expéditeur peut être
  // un ENSEIGNANT ou un PARENT — deux tables différentes, donc pas de jointure
  // unique possible. Vide tant que la recherche n'a pas répondu : l'affichage
  // retombe alors sur l'ancien libellé, jamais sur un blanc.
  const [senderNames, setSenderNames] = useState({});
  const [adminReply, setAdminReply] = useState("");            // reponse de l'administrateur dans un fil
  const [adminSending, setAdminSending] = useState(false);
  const [openMsg, setOpenMsg] = useState(null);                // the message opened in the reading pane

  // ─── ÉCHANGES DE L'ÉCOLE (direction et référent) — LOT D ───────────────────
  // Demande de la direction : être au courant de toute communication
  // enseignant → parent. C'est une VUE, pas un envoi : rien n'est dupliqué,
  // aucun second destinataire n'est créé. La direction avait DÉJÀ le droit de
  // lire les messages de son école ; c'est simplement l'application qui ne le
  // demandait jamais (sa boîte ne charge que `recipient_id = moi`).
  //
  // ⚠️ Ces messages ne passent JAMAIS par `openMessage()`. Cette fonction écrit
  // `read_at`, l'accusé de lecture DU DESTINATAIRE. Si la consultation par la
  // direction le remplissait, l'enseignante verrait « lu » alors que le parent
  // n'a rien ouvert, et la liste « parents à relancer » cesserait de le
  // signaler. D'où un volet de lecture séparé (`openExchange`) et une table
  // `exchange_marks` pour « jusqu'où la direction avait lu ».
  const [exchanges, setExchanges] = useState([]);
  const [openExch, setOpenExch] = useState(null);
  const [exchSeenAt, setExchSeenAt] = useState(null);
  useEffect(() => {
    if (!isParent || !parent?.student_id) {
      setParentLessons([]); setParentTaughtIds(new Set());
      setParentStudent(null); setParentResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      // Resolve the linked CHILD → its class (teacher) and level.
      const { data: st } = await supabase.from("students")
        .select("id, full_name, teacher_id, school_id").eq("id", parent.student_id).maybeSingle();
      if (cancelled) return;
      setParentStudent(st || null);
      const teacherId = st?.teacher_id || null;
      let lvl = "cm1";
      if (teacherId) {
        const { data: t } = await supabase.from("teachers").select("level").eq("id", teacherId).maybeSingle();
        lvl = t?.level || "cm1";
      }
      // Point the calendar/programme tabs at the child's level.
      setSelectedLevel(LEVELS.find((l) => l.id === lvl) || LEVELS[2]);
      // All lessons of the level · the teacher's taught marks · the child's results.
      // (Messages are loaded by the dedicated inbox effect below, shared with teachers.)
      const [{ data: all }, { data: taught }, { data: results }] = await Promise.all([
        supabase.from("lessons")
          // `parent_tip` n'est demandée QUE si le drapeau est levé : sélectionner
          // une colonne absente fait échouer la requête entière, pas seulement
          // ce champ. Voir claude-parent-tip.sql.
          .select("id, subject_id, component_id, unit_number, week_number, title, theme, objective"
            + (PARENT_TIP_ENABLED ? ", parent_tip" : "")).eq("level", lvl),
        teacherId
          ? supabase.from("lessons_taught").select("lesson_id, taught_at").eq("teacher_id", teacherId)
          : Promise.resolve({ data: [] }),
        supabase.from("daily_results")
          .select("score, total, difficulty, result_date, lesson_id, lessons(title, subject_id)")
          .eq("student_id", parent.student_id).order("result_date", { ascending: false }),
      ]);
      if (cancelled) return;
      const taughtMap = new Map((taught || []).map((r) => [r.lesson_id, r.taught_at]));
      const merged = (all || []).map((l) => ({
        ...l, taught: taughtMap.has(l.id), taught_at: taughtMap.get(l.id) || null,
      }));
      merged.sort((a, b) =>
        (a.unit_number || 0) - (b.unit_number || 0) ||
        (a.week_number || 0) - (b.week_number || 0) ||
        (a.subject_id || "").localeCompare(b.subject_id || ""));
      setParentLessons(merged);
      // A lesson is "unlocked" for the parent if the teacher marked it taught OR
      // the child has a daily result on it (evaluated ⇒ definitely done in class).
      const taughtSet = new Set(taughtMap.keys());
      (results || []).forEach((r) => { if (r.lesson_id != null) taughtSet.add(r.lesson_id); });
      setParentTaughtIds(taughtSet);
      setParentResults(results || []);
    })();
    return () => { cancelled = true; };
  }, [isParent, parent?.student_id, parent?.id]);

  // ---- Inbox loader (shared by parents and teachers) ----
  useEffect(() => {
    if (!PROFILES_ENABLED) { setInbox([]); return; }
    let cancelled = false;
    (async () => {
      let q = null;
      if (isParent && parent?.student_id) {
        q = supabase.from("messages").select("*")
          .or(`student_id.eq.${parent.student_id},recipient_id.eq.${parent.id}`);
      } else if (!isParent && teacher?.id) {
        // ⚠️ `eq` et non `or` : un administrateur reçoit les messages de la
        // boîte de dialogue comme n'importe quel autre message, parce qu'ils
        // lui sont ADRESSÉS (recipient_id). C'est exactement pourquoi ils
        // portent un destinataire au lieu d'être laissés anonymes.
        q = supabase.from("messages").select("*").eq("recipient_id", teacher.id);
      }
      if (!q) { if (!cancelled) setInbox([]); return; }
      // Cached: the messagerie should still show what arrived before the
      // network went, rather than looking like an empty mailbox.
      const key = isParent ? `inbox_p_${parent?.id}` : `inbox_t_${teacher?.id}`;
      const data = await cachedQuery(key, () => q.order("created_at", { ascending: false }));
      if (!cancelled) setInbox(data || []);
    })();
    return () => { cancelled = true; };
  }, [isParent, parent?.student_id, parent?.id, teacher?.id]);

  // ---- Qui a écrit ? (2026-10-02) ----
  // Signalé par Maxime en recevant le premier message de la boîte de dialogue :
  // « doesn't reference the sender, so am not able to recognize who is sending
  // the message ». L'écran affichait « École » pour tout le monde — le libellé
  // était déduit de l'AUDIENCE et de l'école de celui qui REGARDE, jamais de
  // l'expéditeur. Avec un seul canal école→administration ça passait ; avec une
  // boîte de dialogue ouverte à tous, c'est devenu faux pour tout le monde.
  //
  // ⚠️ VOLONTAIREMENT SANS CACHE HORS LIGNE. On aurait pu ranger ces noms à
  // côté de la boîte de réception, mais cela aurait changé la FORME de l'entrée
  // en cache, donc obligé à en changer le NOM — le piège payé le 2026-09-30.
  // Comme l'absence de nom retombe proprement sur l'ancien libellé, le gain ne
  // valait pas le risque. Sans réseau, on lit « École » comme avant.
  useEffect(() => {
    const ids = Array.from(new Set((inbox || []).map((m) => m.sender_id).filter(Boolean)))
      .filter((id) => !senderNames[id]);
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const trouve = {};
      try {
        const { data: ens } = await supabase.from("teachers")
          .select("id, full_name, role").in("id", ids);
        (ens || []).forEach((t) => {
          // « plateforme » et non « administration » : c'est la qualité affichée
          // À CÔTÉ DU NOM, donc lue par des parents et des enseignants. Dans une
          // école, « l'administration » désigne la direction — exactement la
          // confusion que Maxime a signalée le 2026-10-02 sur le titre du canal.
          const role = t.role === "admin" ? "plateforme"
            : t.role === "school_admin" ? "direction"
            : t.role === "referent" ? "référent"
            : "enseignant";
          trouve[t.id] = { nom: t.full_name || "Membre du personnel", role };
        });
      } catch (_) {}
      // Les parents vivent dans une AUTRE table. On ne cherche que ceux qui
      // n'ont pas été trouvés côté personnel, pour ne pas demander pour rien.
      const restants = ids.filter((id) => !trouve[id]);
      if (restants.length) {
        try {
          const { data: par } = await supabase.from("parents")
            .select("id, full_name").in("id", restants);
          (par || []).forEach((p) => {
            trouve[p.id] = { nom: p.full_name || "Parent", role: "parent" };
          });
        } catch (_) {}
      }
      // ⚠️ On n'écrit QUE si on a trouvé quelque chose. Sans ce garde-fou,
      // l'effet se redéclencherait en boucle sur un expéditeur introuvable.
      if (!cancelled && Object.keys(trouve).length) {
        setSenderNames((prev) => ({ ...prev, ...trouve }));
      }
    })();
    return () => { cancelled = true; };
    // Dépendance sur `inbox` SEULEMENT, à dessein. `senderNames` est lu pour
    // savoir qui reste à chercher, mais l'ajouter ici ferait repasser l'effet à
    // chaque nom trouvé. Ce n'est pas une boucle — la liste d'identifiants
    // serait vide et l'effet s'arrêterait aussitôt — mais c'est du bruit pour
    // rien. Si un contrôle de dépendances le signale, ne pas « corriger ».
  }, [inbox]);

  // Open a message in the reading pane, marking it read on first open.
  const openMessage = (m) => {
    setOpenMsg(m);
    if (m && !m.read_at) {
      const now = new Date().toISOString();
      // Offline this used to fail silently, so the message looked read on this
      // machine and stayed unread everywhere else — and the director's
      // "parents à relancer" list would keep flagging a parent who had read it.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueue({ kind: "read", table: "messages", op: "update",
                  payload: { read_at: now }, match: { id: m.id } }).then(refreshPending).catch(() => {});
      } else {
        supabase.from("messages").update({ read_at: now }).eq("id", m.id);
      }
      setInbox((prev) => prev.map((x) => (x.id === m.id ? { ...x, read_at: now } : x)));
    }
  };
  const unreadCount = inbox.filter((m) => !m.read_at).length;

  /* Répondre dans un fil de la boîte de dialogue. La réponse part vers
     l'expéditeur d'origine, garde le `thread_id` du fil (ou, pour un fil
     ancien sans racine, prend l'id du message auquel on répond) et ne porte
     🔴 AUCUN `school_id`. */
  const repondreAdmin = async (m) => {
    const corps = adminReply.trim();
    if (!corps || adminSending) return;
    if (!online) { pushToast("Pas de réseau. Réessayez une fois connecté.", "error"); return; }
    setAdminSending(true);
    try {
      const { data, error } = await supabase.from("messages").insert({
        sender_id: teacher.id,
        recipient_id: m.sender_id,
        audience: "admin",
        school_id: null,
        student_id: null,
        thread_id: m.thread_id || m.id,
        subject: m.subject || "Réponse de la plateforme",
        body: corps,
      }).select().single();
      if (error) throw error;
      setAdminReply("");
      pushToast("Réponse envoyée.", "success");
      notifyDirectMessage({ messageId: data.id }).catch(() => {});
    } catch (_) {
      pushToast("Impossible d'envoyer la réponse. Réessayez.", "error");
    }
    setAdminSending(false);
  };

  // ---- LOT D : charger les échanges enseignant → parent de l'école ----------
  // Tout est fait par `educam_school_exchanges` : le contrôle de rôle, le
  // filtrage des messages de l'administrateur (décision de Maxime) et les noms
  // de l'expéditeur et de l'élève. L'écran ne décide de rien — un enseignant
  // qui appellerait cette fonction reçoit une liste vide.
  //
  // Mis en cache comme le reste des écrans de direction, pour rester
  // consultable après une coupure. Ce sont des messages de l'école, pas des
  // coordonnées : le refus de mise en cache ne concerne que les numéros.
  const loadExchanges = async () => {
    if (!isSchoolAdmin || !teacher?.school_id) { setExchanges([]); return; }
    // ⚠️ Clé par PERSONNE (`teacher.id`), pas par école. Le cache hors ligne
    // vit dans l'IndexedDB du navigateur, qui ne connaît pas les comptes : une
    // clé par école aurait laissé un enseignant se connectant sur le même
    // portable relire les échanges mis en cache par le directeur. C'est la même
    // raison qui fait que les clés de la boîte de réception portent déjà
    // `inbox_t_<id>` et non l'école.
    const rows = await cachedQuery(`exchanges_${teacher.id}`, () =>
      supabase.rpc("educam_school_exchanges", { p_school: teacher.school_id })
    );
    setExchanges(rows || []);
  };

  // « Jusqu'où avais-je lu ? » — lu une fois, puis reposé en quittant l'écran.
  // Jamais dans `messages.read_at` : voir le commentaire de l'état.
  const loadExchangeMark = async () => {
    if (!teacher?.id) return;
    const { data } = await supabase.from("exchange_marks")
      .select("last_seen_at").eq("viewer_id", teacher.id).eq("scope", "school_exchanges").maybeSingle();
    setExchSeenAt(data?.last_seen_at || null);
  };

  const touchExchangeMark = async () => {
    if (!teacher?.id) return;
    // `upsert` et pas `insert` : la deuxième visite ne doit pas échouer sur la
    // clé primaire. Sans réseau, on ne met rien en file d'attente — un repère
    // de lecture rejoué trois jours plus tard dirait le contraire de la vérité.
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    await supabase.from("exchange_marks").upsert(
      { viewer_id: teacher.id, scope: "school_exchanges", last_seen_at: new Date().toISOString() },
      { onConflict: "viewer_id,scope" }
    );
  };

  // Ouvrir un échange : on affiche, et c'est TOUT. Aucune écriture sur le
  // message. Si un jour quelqu'un ajoute ici un `update` sur `messages`,
  // l'accusé de lecture du parent devient faux — voir l'état plus haut.
  // Reçoit un GROUPE — `{ key, head, members }` — et non un message, depuis que
  // les envois à plusieurs familles sont pliés en une seule entrée.
  const openExchange = (group) => setOpenExch(group);

  // Nombre de messages non encore vus par ce directeur. Sert à la pastille du
  // rail ; l'écran lui-même compte les ENVOIS (voir `newGroups`), parce qu'une
  // annonce à douze familles est une nouveauté et non douze.
  const exchNew = exchSeenAt
    ? exchanges.filter((m) => m.created_at && m.created_at > exchSeenAt).length
    : exchanges.length;

  // ---- Compose a new message (teacher / director / referent / superadmin) ----
  // Recipients depend on the sender's role:
  //  • teacher            → a parent of a pupil in THEIR class
  //  • director / referent → any parent OR any teacher of THEIR school
  //  • superadmin (admin)  → any pupil's parent OR any staff member, any school
  // Parents don't compose. RLS enforces the same scoping server-side.
  const openComposer = async () => {
    setComposeOpen(true);
    setCMsg(""); setCRecipient(""); setCRecipients([]);
    setCQuery("");   // un filtre laissé d'un message précédent cacherait la liste
    setCConfirm(null); setCNotifyWa(true);
    setCAudience("parent");
    if (isParent) return;
    const scope = isAdmin ? "all" : isSchoolAdmin ? `s${teacher?.school_id}` : `t${teacher?.id}`;

    // ⚠️ All three reads are cached. Without this the composer is unusable
    // offline: the lists of pupils and colleagues come back empty, so there is
    // nobody to address a message to.
    // ⚠️ Clé de cache en `_v3` : la requête a changé de FORME deux fois
    // (`has_parent_contact`, puis `access_code`). Sans changement de clé, une
    // entrée mise en cache avant serait resservie sans les nouveaux champs, et
    // l'écran mentirait sans lever d'erreur — « 0 recevront un WhatsApp » alors
    // que tous en ont un. **Une entrée de cache change de nom quand sa forme
    // change**, sinon le cache sert une vérité périmée.
    const st = await cachedQuery(`compose_students_v3_${scope}`, () => {
      let sq = supabase.from("students")
        .select("id, full_name, teacher_id, school_id, has_parent_contact, access_code");
      if (isAdmin) { /* every school */ }
      else if (isSchoolAdmin) sq = sq.eq("school_id", teacher?.school_id || "");
      else sq = sq.eq("teacher_id", teacher?.id || ""); // plain teacher: own class only
      return sq;
    });
    setCStudents(st || []);

    // Which parent account belongs to which pupil. Resolved HERE, while we can,
    // because the send path needs it and cannot look it up without a network.
    const ids = (st || []).map((s) => s.id);
    if (ids.length) {
      const par = await cachedQuery(`compose_parents_${scope}`, () =>
        supabase.from("parents").select("id, student_id").in("student_id", ids));
      const map = {};
      (par || []).forEach((p) => { if (p.student_id && !map[p.student_id]) map[p.student_id] = p.id; });
      setCParentByStudent(map);
    } else {
      setCParentByStudent({});
    }

    // ─── DE QUOI DISTINGUER DEUX HOMONYMES (2026-09-30) ──────────────────────
    // Signalé par Maxime, capture à l'appui : la liste affichait huit « Achille »
    // dont quatre noms en DOUBLE EXACT. Un nom seul ne dit pas à qui on écrit —
    // et se tromper de famille, c'est envoyer à un parent un message sur
    // l'enfant d'un autre.
    //
    // On charge donc la classe (via son enseignant) et, pour l'administrateur
    // qui voit plusieurs écoles, le nom de l'école. Les deux lectures sont mises
    // en cache comme le reste du composeur : sans réseau, la liste doit rester
    // lisible, pas seulement présente.
    const teacherIds = Array.from(new Set((st || []).map((s) => s.teacher_id).filter(Boolean)));
    if (teacherIds.length) {
      const cls = await cachedQuery(`compose_classes_${scope}`, () =>
        supabase.from("teachers").select("id, full_name, class_label, level").in("id", teacherIds));
      const map = {};
      (cls || []).forEach((t) => { map[t.id] = t; });
      setCClassByTeacher(map);
    } else {
      setCClassByTeacher({});
    }

    // L'école ne sert à distinguer que si l'expéditeur en voit plusieurs — donc
    // l'administrateur seulement. Un directeur n'a qu'une école : l'afficher
    // serait du bruit sur chaque ligne.
    if (isAdmin) {
      const schoolIds = Array.from(new Set((st || []).map((s) => s.school_id).filter(Boolean)));
      if (schoolIds.length > 1) {
        const sc = await cachedQuery(`compose_schools_${scope}`, () =>
          supabase.from("schools").select("id, name").in("id", schoolIds));
        const map = {};
        (sc || []).forEach((x) => { map[x.id] = x.name; });
        setCSchoolById(map);
      } else setCSchoolById({});
    } else setCSchoolById({});

    // Staff the sender may write to (directors/referents + admin only).
    if (isSchoolAdmin || isAdmin) {
      const stf = await cachedQuery(`compose_staff_${scope}`, () => {
        let tq = supabase.from("teachers").select("id, full_name, role, school_id");
        if (isSchoolAdmin && !isAdmin) tq = tq.eq("school_id", teacher?.school_id || "");
        return tq;
      });
      setCStaff((stf || []).filter((t) => t.role !== "admin" && t.id !== teacher?.id));
    } else {
      setCStaff([]);
    }
  };

  // ─── COMMENT UN ÉLÈVE EST DÉSIGNÉ DANS LE COMPOSEUR ────────────────────────
  // « Achille KAMGA » ne suffit pas : la base en contient plusieurs, dans des
  // classes différentes, et parfois avec le MÊME nom exact. On ajoute donc ce
  // qui distingue vraiment, et rien de plus :
  //
  //   · la classe (son libellé, sinon le niveau, sinon le nom de l'enseignant) ;
  //   · l'école, pour l'administrateur seul — un directeur n'en a qu'une ;
  //   · et, en DERNIER RECOURS, le code parent de l'élève, quand deux lignes
  //     restent malgré tout identiques. C'est la seule chose unique par élève.
  //
  // Le code n'apparaît QUE dans ce cas : l'afficher partout encombrerait la
  // liste, et il n'expose rien de nouveau (la direction voit tous les codes dans
  // « Gérer l'école », l'enseignante ceux de sa classe).
  const composeStudentLabels = () => {
    const out = {};
    const base = {};
    const count = {};
    for (const s of cStudents) {
      const t = cClassByTeacher[s.teacher_id];
      const klass = t && (t.class_label || (t.level ? String(t.level).toUpperCase() : null) || t.full_name);
      const school = cSchoolById[s.school_id];
      const parts = [s.full_name || "Élève"];
      if (school) parts.push(school);
      if (klass) parts.push(klass);
      const label = parts.join(" · ");
      base[s.id] = label;
      count[label] = (count[label] || 0) + 1;
    }
    for (const s of cStudents) {
      const label = base[s.id];
      out[s.id] = count[label] > 1 && s.access_code
        ? `${label} · code ${s.access_code}`
        : label;
    }
    return out;
  };

  // Les destinataires retenus : plusieurs élèves pour l'audience parent, une
  // seule personne pour le personnel.
  const composeTargets = () =>
    cAudience === "parent" ? cRecipients : (cRecipient ? [cRecipient] : []);

  // Le bouton « Envoyer » passe par ici. Au-delà d'UN destinataire, on demande
  // une confirmation en affichant les nombres : un message envoyé ne se rappelle
  // pas, chaque envoi WhatsApp coûte et compte dans la note de qualité du numéro
  // chez Meta, et 246 élèves sont en base — une fausse manœuvre sur « cocher
  // tous » serait chère et irréparable.
  const askSendMessage = () => {
    const targets = composeTargets();
    if (!cSubject.trim() || !cBody.trim() || targets.length === 0) return;
    if (targets.length === 1 || cConfirm) { sendNewMessage(); return; }
    const withPhone = cAudience === "parent"
      ? targets.filter((id) => (cStudents.find((s) => s.id === id) || {}).has_parent_contact).length
      : targets.length;
    setCConfirm({ families: targets.length, wa: (WHATSAPP_ENABLED && cNotifyWa) ? withPhone : 0 });
  };

  const sendNewMessage = async () => {
    const targets = composeTargets();
    if (!cSubject.trim() || !cBody.trim() || targets.length === 0) return;
    setCSending(true); setCMsg(""); setCConfirm(null);

    // ⚠️ The sender used to come from `supabase.auth.getUser()` — which is a
    // SERVER call, not a local read. Offline it returned nothing and the
    // message would have been saved with NO SENDER at all. The signed-in
    // profile is already in hand, and `teachers.id` IS the auth user id.
    const senderId = (isParent ? parent?.id : teacher?.id) || null;
    if (!senderId) { setCMsg("Session introuvable. Reconnectez-vous."); setCSending(false); return; }

    // UNE LIGNE PAR DESTINATAIRE — voir le commentaire de `cRecipients`. Elles
    // partagent `batch_id` quand il y en a plusieurs, pour rester reconnaissables
    // comme un seul envoi dans l'écran « Échanges de l'école ».
    const batchId = targets.length > 1 ? newId() : null;
    const base = {
      sender_id: senderId, subject: cSubject.trim(), body: cBody.trim(),
      link_url: cLink.trim() || null,
      created_at: new Date().toISOString(), // when it was written, not when it synced
      batch_id: batchId,
    };

    // Chaque ligne est COMPLÈTE ici, identifiant inclus, donc elle peut être
    // écrite maintenant ou rejouée plus tard sans rien demander au serveur.
    const rows = targets.map((target) => {
      if (cAudience === "parent") {
        const stu = cStudents.find((s) => s.id === target);
        return {
          ...base, id: newId(), audience: "parent", student_id: target,
          // Resolved when the composer opened, so this works without a network.
          recipient_id: cParentByStudent[target] || null,
          school_id: stu?.school_id || teacher?.school_id || null,
        };
      }
      const st = cStaff.find((t) => t.id === target);
      return {
        ...base, id: newId(),
        audience: (st?.role === "school_admin" || st?.role === "referent") ? "school_admin" : "teacher",
        recipient_id: target,
        school_id: st?.school_id || teacher?.school_id || null,
      };
    });

    const notifyWanted = WHATSAPP_ENABLED && (cAudience !== "parent" || cNotifyWa);
    const offlineNow = typeof navigator !== "undefined" && !navigator.onLine;

    // Queue the messages, and the nudges behind them. Order matters: the queue
    // drains oldest-first, so each row exists before the Edge Function is asked
    // to notify anyone about it.
    //
    // ⚠️ UNE ENTRÉE DE FILE PAR LIGNE, jamais un tableau dans une seule entrée :
    // la file rejoue chaque entrée telle quelle, et si l'une échoue on ne veut
    // pas perdre les onze autres avec elle.
    const hold = async () => {
      for (const r of rows) {
        await enqueue({ kind: "message", table: "messages", op: "insert", payload: r });
      }
      // Notify whoever it was written to — parent OR colleague. Uses the DIRECT
      // template, which names the sender, so a message a person wrote never
      // arrives looking like an automatic lesson notice.
      if (notifyWanted) {
        for (const r of rows) {
          await enqueue({
            kind: "notify", op: "invoke", fn: "send-direct-message",
            body: { message_id: r.id },
            bestEffort: true, // a nudge must never hold up a teacher's marks
          });
        }
      }
      refreshPending();
    };

    if (offlineNow) {
      try { await hold(); }
      catch (_) { setCMsg("Erreur lors de l'envoi. Réessayez."); setCSending(false); return; }
    } else {
      // ⚠️ TOUT OU RIEN : une insertion multiple qui viole la règle d'écriture
      // sur UNE ligne échoue en ENTIER. C'est voulu — mieux vaut ne rien envoyer
      // que la moitié d'une annonce. La liste ne propose de toute façon que les
      // élèves que l'expéditeur a le droit d'adresser.
      const { error } = await supabase.from("messages").insert(rows);
      if (error) {
        // Online but it did not land — keep it rather than lose what was typed.
        try { await hold(); }
        catch (_) { setCMsg("Erreur lors de l'envoi. Réessayez."); setCSending(false); return; }
      } else if (notifyWanted) {
        // Un envoi APRÈS l'autre, pas tous en parallèle : trente appels
        // simultanés à Meta, c'est ce qui fait chuter la note de qualité d'un
        // numéro. Non attendu, pour ne pas figer l'écran pendant la série.
        (async () => {
          for (const r of rows) {
            try { await notifyDirectMessage({ messageId: r.id }); } catch (_) {}
          }
        })();
      }
    }

    logActivity({
      actorId: senderId, actorRole: teacher?.role || "teacher",
      schoolId: rows[0].school_id, eventType: "message_sent",
      detail: rows.length > 1 ? `${rows[0].subject} (${rows.length} familles)` : rows[0].subject,
    });

    const sansCompte = rows.filter((r) => r.audience === "parent" && !r.recipient_id).length;
    setCMsg(offlineNow
      ? (rows.length > 1
        ? `${rows.length} messages gardés ✓ — ils partiront au retour du réseau.`
        : "Message gardé ✓ — il partira au retour du réseau.")
      : (rows.length > 1
        ? `Envoyé à ${rows.length} familles ✓${sansCompte ? ` — ${sansCompte} verront le message dès leur inscription.` : ""}`
        : (sansCompte
          ? "Message enregistré ✓ — le parent le verra dès son inscription."
          : "Message envoyé ✓")));

    setCSubject(""); setCBody(""); setCLink("");
    setCRecipient(""); setCRecipients([]); setCQuery("");
    setCSending(false);
  };

  // Log a "login" activity event once per app load (teacher or parent).
  const loggedLogin = useRef(false);
  useEffect(() => {
    if (!PROFILES_ENABLED || loggedLogin.current) return;
    const id = isParent ? parent?.id : teacher?.id;
    if (!id) return;
    loggedLogin.current = true;
    logActivity({
      actorId: id,
      actorRole: isParent ? "parent" : (teacher?.role || "teacher"),
      schoolId: isParent ? parentStudent?.school_id : (teacher?.school_id || schoolContext?.id),
      eventType: "login",
    });
  }, [isParent, teacher?.id, parent?.id, parentStudent?.school_id]);

  const [selectedLevel, setSelectedLevel] = useState(
    LEVELS.find(l => l.id === teacher?.level) || LEVELS[2]
  );
  const [screen, setScreenRaw] = useState("home");
  // Pile de navigation. Auparavant le retour faisait `setScreen(tab)`, or `tab`
  // vaut « calendar » par défaut : le bouton Retour renvoyait donc vers
  // l'emploi du temps au lieu de l'écran précédent. On mémorise l'écran quitté.
  const screenRef = useRef("home");
  const histRef = useRef([]);
  const setScreen = (next) => {
    if (next !== screenRef.current) {
      histRef.current.push(screenRef.current);
      if (histRef.current.length > 24) histRef.current.shift();
      screenRef.current = next;
    }
    setScreenRaw(next);
  };
  /** Retour à l'écran précédent, ou à l'accueil s'il n'y en a pas. */
  const goBack = () => {
    const prev = histRef.current.pop() || "home";
    screenRef.current = prev;
    setScreenRaw(prev);
  };

  // ---- LOT D : entrée et sortie de l'écran « Échanges de l'école » ----------
  // Placé ICI et pas avec les autres chargeurs, volontairement : cet effet a
  // `screen` dans ses dépendances, or les dépendances sont évaluées PENDANT le
  // rendu. Déclaré avant `const [screen, …]`, il lèverait une erreur de zone
  // morte à chaque rendu — l'écran entier serait blanc. Ne pas le remonter.
  //
  // On lit le repère AVANT la liste, sinon tout apparaîtrait comme nouveau le
  // temps d'un rendu. Le repère n'est reposé qu'en QUITTANT l'écran : les
  // pastilles « Nouveau » restent donc visibles pendant toute la visite, au lieu
  // de s'effacer sous les yeux du directeur.
  useEffect(() => {
    if (!PROFILES_ENABLED || screen !== "exchanges" || !isSchoolAdmin) return;
    let cancelled = false;
    (async () => {
      await loadExchangeMark();
      if (!cancelled) await loadExchanges();
    })();
    return () => { cancelled = true; touchExchangeMark(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, teacher?.id, teacher?.school_id, isSchoolAdmin]);
  const [tab, setTab] = useState("calendar");
  // Onglet d'ouverture de l'écran Résultats : "entry" (saisie) par défaut,
  // "class" quand on arrive depuis une tuile « Moyenne de classe » / « Élèves à
  // suivre ». Onglet d'ouverture du journal d'activité (admin).
  const [resultsTab, setResultsTab] = useState("entry");
  const [activityTab, setActivityTab] = useState("teachers");
  const openResults = (t = "entry") => { setResultsTab(t); setScreen("results"); };
  const openActivity = (t = "teachers") => { setActivityTab(t); setScreen("activitylog"); };

  // Responsive breakpoint: phones/small screens (≤640px) get tuned layouts.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Scroll restoration: remember where the reader was in the list when they
  // open a lesson, so "Retour" brings them back to that exact spot.
  const listScrollY = useRef(0);
  const pendingRestore = useRef(false);

  useEffect(() => {
    if (screen === "lesson") {
      // Start a freshly-opened lesson at the top.
      window.scrollTo(0, 0);
    } else if (pendingRestore.current && (screen === "programme" || screen === "calendar" || screen === "home")) {
      pendingRestore.current = false;
      const y = listScrollY.current;
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
    }
  }, [screen]);

  const backFromLesson = () => {
    pendingRestore.current = true;
    setEditMode(false);
    setScreen(isParent ? "home" : tab);
  };

  // Review feedback state
  const [lessonFeedback, setLessonFeedback] = useState([]); // this teacher's feedback for the open lesson
  const [feedbackOpenFor, setFeedbackOpenFor] = useState(null); // section id, or "lesson", or null
  const [fbRating, setFbRating] = useState(0);
  const [fbComment, setFbComment] = useState("");
  const [fbSaving, setFbSaving] = useState(false);

  // Calendar state
  const [selectedUnit, setSelectedUnit] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);

  // Programme state
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [programmeView, setProgrammeView] = useState("subjects"); // subjects, components, topics
  const [progQuery, setProgQuery] = useState(""); // recherche dans le programme

  // Leçon impossible à ouvrir : { id, reason: "offline" | "missing" } | null
  const [blockedLesson, setBlockedLesson] = useState(null);

  // Copie de sécurité laissée par un enregistrement interrompu, s'il y en a une.
  const [orphanBackup, setOrphanBackup] = useState(null);

  // Les écrans affichaient une liste vide pendant le chargement, ce qui, sur
  // connexion lente, ressemble à une panne plutôt qu'à une attente.
  const [loadingData, setLoadingData] = useState(true);

  // Retours d'action visibles : remplace les `catch (_) {}` muets.
  const { pushToast, ToastViewport } = useToasts();

  // Lesson state
  const [collapsedSections, setCollapsedSections] = useState({}); // {} = every section expanded
  const [currentLesson, setCurrentLesson] = useState(null);
  const [lessonSections, setLessonSections] = useState([]);
  const [sectionBlocks, setSectionBlocks] = useState({}); // { [section_id]: [block, ...] in order }
  const [lessonExercises, setLessonExercises] = useState([]);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [lessonPassed, setLessonPassed] = useState(false);
  // "Leçon enseignée" — teacher marks a lesson as taught (unlocks it for parents later).
  const [lessonTaught, setLessonTaught] = useState(false);
  const [taughtSaving, setTaughtSaving] = useState(false);
  const [projectorMode, setProjectorMode] = useState(false);
  // ⚠️ LE ZOOM VIT ICI, ET PAS DANS `ProjectorView`. Cette fonction n'utilise
  // AUCUN hook, volontairement : c'est ce qui permet de l'APPELER
  // (`{ProjectorView()}`) au lieu de la monter en `<ProjectorView/>`. Un
  // `useState` à l'intérieur ferait d'elle un composant remonté à chaque
  // rendu — le piège React déjà payé QUATRE fois sur ce projet. Ne pas
  // déplacer cette ligne vers le bas.
  const [projZoom, setProjZoom] = useState(1);
  // Relu depuis l'appareil APRÈS le premier rendu. Lire le stockage local dans
  // la valeur initiale de `useState` casserait le rendu côté serveur de Next,
  // et le stockage peut lever une exception en navigation privée — d'où le
  // try/catch, et une valeur par défaut qui marche sans lui.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PROJ_ZOOM_KEY);
      if (saved) setProjZoom(clampZoom(parseFloat(saved)));
    } catch (_) {}
  }, []);
  const projectorScrollRef = useRef(null); // the scrollable projector panel (for pointer/keyboard scrolling)
  // Presenter mode: the lesson runs in a SECOND window (on the projector) while
  // the teacher keeps working on the laptop. `presenting` = this is the laptop
  // control side; `isPresentWindow` = this IS the projector window (opened with
  // ?present=<lessonId>).
  const [presenting, setPresenting] = useState(false);
  const presenterWinRef = useRef(null);
  const projectorChanRef = useRef(null); // BroadcastChannel to the projector window
  const [isPresentWindow] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return new URLSearchParams(window.location.search).has("present"); } catch (_) { return false; }
  });

  // Inline edit state
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editObjective, setEditObjective] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editSections, setEditSections] = useState([]);
  const [editExercises, setEditExercises] = useState([]);
  const [editQuizQuestions, setEditQuizQuestions] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editUploadingKey, setEditUploadingKey] = useState(null);

  // Data
  const [timetable, setTimetable] = useState([]);
  const [topics, setTopics] = useState([]);
  const [availableLessons, setAvailableLessons] = useState([]);
  // Couverture par matière : 'covered' (leçons sur la plateforme) vs
  // 'teacher_taught' (conçue et enseignée directement par l'enseignant·e).
  // Une matière teacher_taught masque ses sous-sections et affiche un message,
  // pour ne pas laisser croire que des leçons sont « à venir ».
  const [coverage, setCoverage] = useState({}); // { [subject_id]: { status, message } }
  const isTeacherTaught = (subjectId) => coverage[subjectId]?.status === "teacher_taught";
  const coverageMessage = (subjectId) =>
    coverage[subjectId]?.message ||
    "Cette matière n'est pas encore couverte par la plateforme. Elle est conçue et enseignée directement par l'enseignant(e).";

  // Profiles mode: the teacher's school (name/role), resolved on load.
  const [schoolContext, setSchoolContext] = useState(null);

  // ---- Message composer (role-aware; parents don't compose) ----
  const [composeOpen, setComposeOpen] = useState(false);
  const [cAudience, setCAudience] = useState("parent"); // 'parent' | 'staff'
  const [cRecipient, setCRecipient] = useState("");     // student_id (parent) or teacher_id (staff)
  const [cSubject, setCSubject] = useState("");
  const [cBody, setCBody] = useState("");
  const [cLink, setCLink] = useState("");
  const [cSending, setCSending] = useState(false);
  const [cMsg, setCMsg] = useState("");
  const [cStudents, setCStudents] = useState([]);       // pupils the sender may write about
  const [cStaff, setCStaff] = useState([]);             // teachers/directors the sender may write to
  // Filtre du choix du destinataire. Ajouté le 2026-09-30 : la liste était une
  // liste déroulante ordinaire, et dans une liste déroulante on ne TAPE pas —
  // le navigateur ne fait que sauter à la première lettre. Avec 246 élèves en
  // base, il fallait dérouler à la main pour trouver un enfant.
  const [cQuery, setCQuery] = useState("");

  // ─── ENVOI À PLUSIEURS FAMILLES (2026-09-30, demande de Maxime) ─────────────
  // Un message ne peut PAS être « adressé à douze parents » en une seule ligne :
  // chaque parent a besoin de la sienne, avec son propre `read_at`. Sinon le
  // premier parent qui ouvre marquerait le message lu pour les onze autres, et
  // la liste « parents à relancer » deviendrait fausse. Douze familles = douze
  // lignes, même texte, reliées par `batch_id`.
  const [cClassByTeacher, setCClassByTeacher] = useState({}); // id enseignant → { full_name, class_label, level }
  const [cSchoolById, setCSchoolById] = useState({});          // id école → nom (administrateur seulement)
  const [cRecipients, setCRecipients] = useState([]);   // audience parent : plusieurs élèves
  const [cNotifyWa, setCNotifyWa] = useState(true);     // prévenir aussi par WhatsApp
  // Résumé en attente de confirmation, dès qu'il y a plus d'un destinataire.
  // Un message envoyé ne se rappelle pas, et chaque envoi WhatsApp coûte.
  const [cConfirm, setCConfirm] = useState(null);
  // pupil id → parent account id. Resolved while the composer opens (online) so
  // a message written later without a network can still name its recipient.
  const [cParentByStudent, setCParentByStudent] = useState({});

  // ⚠️ RACINE DE TOUT L'ÉCRAN DIRECTEUR / RÉFÉRENT.
  // Cette lecture d'UNE ligne décide si `schoolContext` existe, et tous les
  // panneaux de l'école reçoivent ensuite `school={schoolContext}`. Sans réseau,
  // la requête ne se résolvait jamais : `schoolContext` restait null, et le
  // tableau de bord de l'école, « Gestion de l'école » et « Activité » se
  // gardaient derrière leur `if (!school?.id) return` — écran vide, alors que
  // leurs propres données étaient bel et bien en cache. Un cache ne sert à rien
  // si personne ne va le chercher. (Trouvé le 2026-09-29 en étendant le mode
  // hors ligne à la direction.)
  useEffect(() => {
    if (!PROFILES_ENABLED || !teacher?.school_id) { setSchoolContext(null); return; }
    let cancelled = false;
    cachedQueryMeta(`school_${teacher.school_id}`, () =>
      supabase.from("schools").select("id, name, staff_code").eq("id", teacher.school_id).maybeSingle()
    ).then(({ data }) => { if (!cancelled) setSchoolContext(data || null); });
    return () => { cancelled = true; };
  }, [teacher?.school_id]);

  // Admin super-console (Stage 1): manage ANY school.
  const [adminSchools, setAdminSchools] = useState([]);
  const [adminSchool, setAdminSchool] = useState(null);            // school being managed
  const [adminSchoolView, setAdminSchoolView] = useState("gestion"); // "gestion" | "dash"
  const [adminSchoolsLoading, setAdminSchoolsLoading] = useState(false);
  const [adminTeachers, setAdminTeachers] = useState([]);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolRegion, setNewSchoolRegion] = useState("Littoral");
  const [newSchoolCode, setNewSchoolCode] = useState("");
  const [adminSchoolMsg, setAdminSchoolMsg] = useState("");
  const [adminSchoolStudents, setAdminSchoolStudents] = useState([]); // students of the open school (act-as parent)

  // ---- Console « Utilisateurs » (superadmin) : l'annuaire des comptes -------
  // Un compte est soit une ligne `teachers` (enseignant / directeur / référent /
  // superadmin), soit une ligne `parents`. Les deux tables portent `phone` et
  // `contact_email` : des COORDONNÉES, pas des identifiants de connexion.
  // L'adresse de connexion vit dans auth.users et n'est PAS modifiable ici —
  // cela demanderait une clé de service (« lot 2 », volontairement reporté).
  const [adminUsers, setAdminUsers] = useState(null);          // null = jamais chargé
  const [adminUserSchools, setAdminUserSchools] = useState([]); // pour le sélecteur d'école
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersQuery, setAdminUsersQuery] = useState("");
  const [adminUsersFilter, setAdminUsersFilter] = useState("all");
  const [adminUserDraft, setAdminUserDraft] = useState(null);   // la ligne en cours d'édition
  const [adminUserMsg, setAdminUserMsg] = useState("");
  const [adminUserSaving, setAdminUserSaving] = useState(false);

  // Offline mode: network status, which lessons are downloaded, and download progress.
  const [online, setOnline] = useState(true);
  const [cachedIds, setCachedIds] = useState([]);
  const [dl, setDl] = useState(null); // { done, total, bytes, finished } | null
  // Has the service worker actually precached the app shell? Downloaded lessons
  // are NOT the same thing: without the shell the app cannot open at all
  // offline, so the "Hors ligne prêt" badge must wait for both.
  const [shellReady, setShellReady] = useState(false);
  // How many writes are sitting in the outbox waiting for a network.
  const [pending, setPending] = useState(0);
  // True when the queue cannot go out because the login has expired — network
  // or not. Distinct from being offline, and it needs a different message.
  const [syncBlocked, setSyncBlocked] = useState(false);
  const refreshPending = async () => {
    try { setPending(await queueCount()); } catch (_) { /* never break the screen */ }
  };

  // ---- Statistiques de la plateforme (accueil administrateur) -------------
  // Quatre compteurs seulement : `head: true` ne rapatrie aucune ligne.
  /* ------------------------------------------------------------------------
     RÉSEAU (superadministrateur) — ce que la console montre en tête.
     Tout se calcule à partir de `activity_log` sur 30 jours, plus la liste des
     écoles et la vue `educam_coverage`. Une seule salve de requêtes.
     Le journal est PLAFONNÉ : au-delà, la console dirait « 0 connexion » pour
     des écoles actives, ce qui serait pire que ne rien dire. Le plafond est
     donc annoncé à l'écran quand il mord.
     ------------------------------------------------------------------------ */
  const ACT_CAP = 10000;
  const [adminStats, setAdminStats] = useState(null);
  useEffect(() => {
    if (!isAdmin) { setAdminStats(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const day = 86400000;
        const iso = (d) => new Date(Date.now() - d * day).toISOString();
        const since30 = iso(30), since14 = iso(14), since7 = iso(7);

        const head = async (table) => {
          const { count: c } = await supabase.from(table).select("id", { count: "exact", head: true });
          return c || 0;
        };

        const [schoolsR, teachersR, acts, cov, students, lessons, parents] = await Promise.all([
          supabase.from("schools").select("id, name, region").order("name"),
          supabase.from("teachers").select("id, school_id, role"),
          supabase.from("activity_log")
            .select("actor_id, actor_role, school_id, created_at")
            .gte("created_at", since30)
            .order("created_at", { ascending: false })
            .limit(ACT_CAP),
          supabase.from("educam_coverage").select("school_id, lessons_taught, lessons_expected"),
          head("students"), head("lessons"), head("parents"),
        ]);
        if (cancelled) return;

        const schoolRows = schoolsR.data || [];
        const teacherRows = teachersR.data || [];
        const actRows = acts.data || [];
        const covRows = cov.error ? [] : (cov.data || []);

        // Adoption — une personne compte une fois, quel que soit son nombre d'actions.
        const uniq = (rows, pred) => new Set(rows.filter(pred).map((r) => r.actor_id)).size;
        const isStaff = (r) => r.actor_role === "teacher" || r.actor_role === "school_admin";
        const teachers7 = uniq(actRows, (r) => isStaff(r) && r.created_at >= since7);
        const parents30 = uniq(actRows, (r) => r.actor_role === "parent");
        const schools7 = new Set(actRows.filter((r) => r.school_id && r.created_at >= since7).map((r) => r.school_id)).size;

        // Histogramme : 14 seaux d'un jour, du plus ancien au plus récent.
        const bins = Array.from({ length: 14 }, () => 0);
        const t0 = Date.now() - 14 * day;
        actRows.forEach((r) => {
          const t = Date.parse(r.created_at);
          if (!Number.isFinite(t) || t < t0) return;
          const i = Math.min(13, Math.floor((t - t0) / day));
          bins[i] += 1;
        });
        const events14 = actRows.filter((r) => r.created_at >= since14).length;

        // Avancement par école : somme des leçons enseignées sur les leçons prévues.
        const covBySchool = {};
        covRows.forEach((c) => {
          const k = c.school_id;
          if (!k) return;
          if (!covBySchool[k]) covBySchool[k] = { taught: 0, expected: 0 };
          covBySchool[k].taught += c.lessons_taught || 0;
          covBySchool[k].expected += c.lessons_expected || 0;
        });

        const classesBySchool = {};
        teacherRows.forEach((t) => {
          if (t.school_id) classesBySchool[t.school_id] = (classesBySchool[t.school_id] || 0) + 1;
        });

        const seen7 = new Set(actRows.filter((r) => r.created_at >= since7).map((r) => r.school_id));
        const table = schoolRows.map((sc) => {
          const c = covBySchool[sc.id];
          return {
            id: sc.id,
            name: sc.name,
            region: sc.region || "—",
            classes: classesBySchool[sc.id] || 0,
            pct: c && c.expected > 0 ? Math.round((c.taught / c.expected) * 100) : null,
            active: seen7.has(sc.id),
          };
        });

        setAdminStats({
          schools: schoolRows.length,
          schoolsActive: schools7,
          teachers: teacherRows.length,
          teachers7,
          parents, parents30,
          students, lessons,
          table, bins, events14,
          coverageMissing: !!cov.error,
          capped: actRows.length >= ACT_CAP,
        });
      } catch (_) {
        if (!cancelled) setAdminStats(null);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  /* ------------------------------------------------------------------------
     APERÇU DU PROCHAIN COURS — deux petites requêtes, une par changement de
     leçon : le plan de la séance (titres réels des sections) et le fait de
     savoir si elle est déjà marquée enseignée. Rien n'est inventé : la
     maquette montrait une « section en cours », état qui n'existe nulle part
     dans le produit — on affiche donc le PLAN, pas une progression fictive.
     ------------------------------------------------------------------------ */
  const [heroPlan, setHeroPlan] = useState({ id: null, sections: [], taught: false });

  // ---- Anomalies (superadministrateur) -------------------------------------
  // Lues dans la vue `educam_anomalies` (claude-anomalies.sql). Tant que le
  // fichier SQL n'est pas exécuté, la vue n'existe pas : la requête échoue, et
  // l'écran le DIT au lieu d'afficher un zéro rassurant qui serait faux.
  const [anomalies, setAnomalies] = useState(null); // null = en cours · false = vue absente
  useEffect(() => {
    if (!isAdmin) { setAnomalies(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("educam_anomalies")
        .select("kind, severity, actor_id, school_id, at, title, detail")
        .order("at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (cancelled) return;
      setAnomalies(error ? false : (data || []));
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  // ---- Statistiques de la classe (accueil enseignant) ----------------------
  // Lues dans `educam_class_averages` (vue d'agrégation appliquée en base) :
  // une ligne par enseignant, au lieu des quelques milliers de `daily_results`
  // qu'il fallait tirer pour recalculer la même chose dans le navigateur.
  const [classStats, setClassStats] = useState(null);
  // `null` alone could not tell "still loading" from "gave up", so the tiles
  // showed « chargement… » forever once offline. These two say which it is, and
  // when the numbers on screen were actually read.
  const [classStatsAt, setClassStatsAt] = useState(null);
  const [classStatsSettled, setClassStatsSettled] = useState(false);
  useEffect(() => {
    if (!PROFILES_ENABLED || isParent || isAdmin || !teacher?.id) {
      setClassStats(null); setClassStatsAt(null); setClassStatsSettled(false); return;
    }
    let cancelled = false;
    (async () => {
      const meta = await cachedQueryMeta(`classstats_${teacher.id}`, async () => {
        const [agg, stu] = await Promise.all([
          supabase.from("educam_class_averages")
            .select("students_evaluated, average_20, below_pass")
            .eq("teacher_id", teacher.id).maybeSingle(),
          supabase.from("students").select("id", { count: "exact", head: true })
            .eq("teacher_id", teacher.id),
        ]);
        if (agg.error) return { error: agg.error };
        const r = agg.data;
        return { data: {
          students: stu.count || 0,
          evaluated: r?.students_evaluated || 0,
          avg20: r?.average_20 != null ? Number(r.average_20) : null,
          atRisk: r?.below_pass || 0,
        } };
      });
      if (cancelled) return;
      setClassStats(meta.data || null);
      setClassStatsAt(meta.fresh ? null : meta.cachedAt); // only stamp stale data
      setClassStatsSettled(true);
    })();
    return () => { cancelled = true; };
  }, [teacher?.id, isParent, isAdmin]);

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    Promise.all([fetchTimetable(), fetchTopics(), fetchAllLessons(), fetchCoverage()])
      .finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, [selectedLevel, parentStudent?.teacher_id]);

  useEffect(() => {
    if (!OFFLINE_ENABLED || typeof navigator === "undefined") return;
    setOnline(navigator.onLine);

    // Empty the outbox and say what happened. Silence after a teacher has been
    // working offline is the one thing that would stop her trusting the queue.
    const sync = async () => {
      const res = await drainQueue();
      await refreshPending();
      // The offline access (7 days) and the Supabase login are two different
      // clocks: the first can outlive the second. When that happens the queue
      // CANNOT go out, however good the network — and the banner promising
      // "elle partira au retour du réseau" becomes a promise we cannot keep.
      setSyncBlocked(!!res?.noSession);
      if (res?.sent) {
        pushToast(`${res.sent} saisie${res.sent > 1 ? "s" : ""} envoyée${res.sent > 1 ? "s" : ""} ✓`, "success");
      } else if (res?.failed && !res.sent) {
        pushToast("Vos saisies sont gardées — l'envoi a échoué, nouvel essai bientôt.", "error");
      }
    };

    const on = () => {
      setOnline(true);
      // Le réseau revient : on rafraîchit les listes — et on le DIT.
      // Auparavant la synchronisation était totalement silencieuse.
      Promise.all([fetchTimetable(), fetchTopics(), fetchAllLessons(), fetchCoverage()])
        .then(() => pushToast("Connexion rétablie · contenu synchronisé", "success"))
        .catch(() => pushToast("Connexion rétablie, mais la synchronisation a échoué.", "error"));
      sync();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("educam:queued", refreshPending);
    getCachedLessonIds().then(setCachedIds);
    isShellCached().then(setShellReady);
    refreshPending();
    // Anything left over from a previous session goes out now, on this load.
    if (navigator.onLine) sync();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("educam:queued", refreshPending);
    };
  }, [selectedLevel]);

  const fetchTimetable = async () => {
    // Profiles mode: a teacher reads their OWN class timetable; a parent reads
    // their CHILD's class timetable; otherwise the shared level timetable.
    const parentTeacherId = isParent ? parentStudent?.teacher_id : null;
    const usePerClass = PROFILES_ENABLED && teacher?.school_id && teacher?.id;
    let key, run;
    if (parentTeacherId) {
      key = "timetable_owner_" + parentTeacherId + "_" + edtLundiIso(new Date());
      run = () => supabase.from("timetable_slots").select("*")
        .eq("owner_teacher_id", parentTeacherId)
        .or(`week_start.is.null,week_start.eq.${edtLundiIso(new Date())}`)
        .order("day_of_week").order("slot_order");
    } else if (usePerClass) {
      key = "timetable_owner_" + teacher.id + "_" + edtLundiIso(new Date());
      run = () => supabase.from("timetable_slots").select("*")
        .eq("owner_teacher_id", teacher.id)
        .or(`week_start.is.null,week_start.eq.${edtLundiIso(new Date())}`)
        .order("day_of_week").order("slot_order");
    } else {
      key = "timetable_" + selectedLevel.id;
      run = () => supabase.from("timetable_slots").select("*")
        .eq("level", selectedLevel.id).order("day_of_week").order("slot_order");
    }
    const data = await cachedQuery(key, run);
    // ⚠️ LA CLÉ DE CACHE PORTE LA SEMAINE. Une entrée mise en cache lundi et
    // resservie la semaine suivante rejouerait l'exception de la semaine
    // passée comme si elle était en vigueur. Le piège de cache payé le
    // 2026-09-30 : une entrée change de nom quand sa FORME change, et ici la
    // forme dépend de la semaine. (La clé est construite plus haut avec
    // `edtLundiIso`.)
    setTimetable(edtFusionneSemaine(data || [], edtLundiIso(new Date())));
  };

  const fetchTopics = async () => {
    const data = await cachedQuery("topics_" + selectedLevel.id, () =>
      supabase.from("curriculum_topics").select("*").eq("level", selectedLevel.id));
    setTopics(data || []);
  };

  // Statut de couverture par matière (config globale, indépendante du niveau).
  const fetchCoverage = async () => {
    const data = await cachedQuery("subject_coverage", () =>
      supabase.from("subject_coverage").select("subject_id, status, message"));
    const map = {};
    (data || []).forEach((r) => { map[r.subject_id] = r; });
    setCoverage(map);
  };

  const fetchAllLessons = async () => {
    const data = await cachedQuery("lessons_" + selectedLevel.id, () =>
      supabase.from("lessons").select("id, subject_id, component_id, level, unit_number, week_number, title")
        .eq("level", selectedLevel.id));
    // Enrich each lesson with its "taught" state, keyed on the TEACHER OF RECORD
    // for the class being viewed — the exact same owner the timetable itself is
    // keyed on above (parent → their child's class teacher; everyone else → the
    // teacher whose class this is: yourself if you're the teacher, or the teacher
    // a school-admin / superadmin entered via "act as"). Keying on the owner (not
    // the whole school, and not the viewer's own id) means a school with two
    // classes of the same level shows each class's own taught progress — no
    // merge — because each class has a different owner_teacher_id. RLS still
    // scopes the read: a teacher may read own marks, a parent their child's
    // teacher's, an admin anyone's. Live query; offline it fails soft and
    // everything reads as not taught, which is acceptable.
    const ownerTeacherId = isParent
      ? (parentStudent?.teacher_id || null)
      : (teacher?.id || null);
    let taughtSet = new Set();
    if (ownerTeacherId) {
      try {
        const { data: tg } = await supabase.from("lessons_taught")
          .select("lesson_id").eq("teacher_id", ownerTeacherId);
        taughtSet = new Set((tg || []).map((r) => r.lesson_id));
      } catch (_) {}
    }
    setAvailableLessons((data || []).map((l) => ({ ...l, taught: taughtSet.has(l.id) })));
  };

  // Download every lesson scheduled this week (current unit + week), images
  // included, videos excluded. Only used when offline mode is enabled.
  const handleDownloadWeek = async () => {
    const ids = Array.from(new Set(
      (timetable || [])
        .map((s) => getQueuedLesson(s.subject_id, s.component_id))
        .filter(Boolean)
        .map((l) => l.id)
    ));
    if (ids.length === 0) { setDl({ done: 0, total: 0, finished: true, empty: true }); return; }
    setDl({ done: 0, total: ids.length });
    const res = await downloadWeek(ids, (done, total) => setDl({ done, total }));
    setCachedIds(await getCachedLessonIds());
    // Re-check the shell too: by now the worker has almost certainly finished
    // precaching, and this is the moment the teacher looks at the badge.
    setShellReady(await isShellCached());
    setDl({ done: res.total, total: res.total, finished: true, ...res });
  };

  /* ------------------------------------------------------------------------
     TOP-UP SILENCIEUX — les leçons de la semaine se téléchargent toutes seules.

     Le bouton « Télécharger » reste, mais il ne doit plus être la seule voie :
     une enseignante qui oublie d'appuyer dessus arrive en classe sans réseau
     avec RIEN. Le geste le plus important de la plateforme ne peut pas dépendre
     d'une mémoire.

     Économe par construction : `downloadWeek` compare la signature du contenu
     et ne retélécharge les images que des leçons NOUVELLES ou MODIFIÉES. Après
     la première fois, un passage ne coûte que quelques petites requêtes.

     Ne s'exécute qu'une fois par (niveau · unité · semaine) et par session, et
     jamais pendant un téléchargement manuel. En cas d'échec on relâche le
     verrou : le prochain retour de réseau réessaiera.
     ------------------------------------------------------------------------ */
  const autoTopUpRef = useRef("");
  useEffect(() => {
    if (!OFFLINE_ENABLED || isParent || isAdmin) return;
    if (!online) return;
    if (dl && !dl.finished) return;                 // a manual download is running
    if (!teacher?.id || !(timetable || []).length) return;

    // ⚠️ 2026-10-01 — LA CLÉ DOIT SUIVRE LA FILE, PAS LE CALENDRIER.
    // Avant la file d'attente, la clé était `niveau·unité·semaine` : elle
    // changeait quand l'enseignante changeait de semaine, et c'était le bon
    // repère puisque le contenu d'un créneau dépendait de la semaine.
    // Désormais le contenu dépend de ce qui RESTE À ENSEIGNER : marquer une
    // leçon enseignée fait avancer la file sans toucher ni l'unité ni la
    // semaine. Avec l'ancienne clé, les leçons suivantes ne se seraient donc
    // JAMAIS préchargées — et l'enseignante serait arrivée en classe sans
    // réseau avec un créneau vide. La clé est maintenant la LISTE des leçons
    // à avoir sous la main : elle change exactement quand la file avance.
    const ids = Array.from(new Set(
      (timetable || [])
        .map((s) => getQueuedLesson(s.subject_id, s.component_id))
        .filter(Boolean)
        .map((l) => l.id)
    ));
    if (ids.length === 0) return;

    const key = `${selectedLevel?.id}·${ids.slice().sort((a, b) => a - b).join(",")}`;
    if (autoTopUpRef.current === key) return;
    autoTopUpRef.current = key;

    let cancelled = false;
    (async () => {
      try {
        await downloadWeek(ids);                    // no progress UI: this is silent
        if (cancelled) return;
        setCachedIds(await getCachedLessonIds());
        setShellReady(await isShellCached());
      } catch (_) {
        autoTopUpRef.current = "";                  // let a later reconnect retry
      }
    })();
    return () => { cancelled = true; };
  }, [online, timetable, availableLessons, selectedLevel?.id, teacher?.id, isParent, isAdmin, dl]);

  const getTopic = (unitNum, weekNum, subjectId, componentId) => {
    return topics.find(t => t.unit_number === unitNum && t.week_number === weekNum && t.subject_id === subjectId && t.component_id === componentId)
      || topics.find(t => t.unit_number === unitNum && t.week_number <= weekNum && t.subject_id === subjectId && t.component_id === componentId);
  };

  const getTopicsForComponent = (subjectId, componentId) => {
    return topics.filter(t => t.subject_id === subjectId && t.component_id === componentId)
      .sort((a, b) => a.unit_number - b.unit_number || a.week_number - b.week_number);
  };

  // Finds the lesson for a given subject/component/unit and (optionally) week.
  // A lesson row with no week_number is treated as week 1 so pre-migration
  // content keeps showing. Omitting weekNumber matches any lesson in the unit.
  const getLessonForTopic = (subjectId, componentId, unitNumber, weekNumber) => {
    return availableLessons.find(l =>
      l.subject_id === subjectId &&
      l.component_id === componentId &&
      l.unit_number === unitNumber &&
      (weekNumber == null || (l.week_number || 1) === weekNumber)
    );
  };

  /* ──────────────────────────────────────────────────────────────────────────
   * LA FILE D'ATTENTE — décision de Maxime, 2026-10-01.
   *
   * `getLessonForTopic` ci-dessus répond par ADRESSE : « la leçon de Grammaire
   * d'octobre, semaine 2 ». Si l'enseignante n'a pas tenu ce créneau-là cette
   * semaine-là, le calendrier avance et **elle ne rencontrera jamais cette
   * leçon** — sans le moindre message. La leçon n'est pas perdue en base : elle
   * est perdue pour elle.
   *
   * Un créneau demande désormais : « la PROCHAINE leçon de Grammaire que je
   * n'ai pas encore enseignée ». Prendre du retard RALENTIT la file, ne la
   * troue pas, et le report d'un mois sur l'autre devient naturel — la file ne
   * se vide pas au 31.
   *
   * ⚠️ `getLessonForTopic` RESTE, et doit rester : l'écran « Programme », où
   * l'enseignante parcourt le curriculum unité par unité, a besoin de l'adresse.
   * Seuls les CRÉNEAUX de l'emploi du temps passent par la file.
   *
   * 📏 `availableLessons` porte déjà tout le niveau, toutes unités confondues
   * (`fetchAllLessons` ne filtre pas sur l'unité) et chaque leçon y porte son
   * drapeau `taught`. La file ne coûte donc aucune requête de plus.
   *
   * L'ordre est celui du programme : unité, puis semaine, puis `id` pour que
   * deux leçons de même rang sortent toujours dans le même ordre.
   * ────────────────────────────────────────────────────────────────────────── */
  const getQueuedLesson = (subjectId, componentId) => {
    if (!subjectId || !componentId) return undefined;
    let next;
    for (const l of availableLessons) {
      if (l.subject_id !== subjectId || l.component_id !== componentId) continue;
      if (l.taught) continue;
      // Plancher : l'année commence à l'unité 2. Les unités antérieures ne
      // sont pas « en retard », elles sont HORS PÉRIMÈTRE — la classe ne les a
      // jamais abordées sur la plateforme. Sans cette ligne, la rentrée
      // s'ouvrirait sur une leçon de septembre.
      if ((l.unit_number || 0) < EDT_UNITE_DEPART) continue;
      if (!next) { next = l; continue; }
      const du = (l.unit_number || 0) - (next.unit_number || 0);
      if (du < 0) { next = l; continue; }
      if (du > 0) continue;
      const dw = (l.week_number || 1) - (next.week_number || 1);
      if (dw < 0) { next = l; continue; }
      if (dw > 0) continue;
      if ((l.id || 0) < (next.id || 0)) next = l;
    }
    return next;
  };

  // Combien de leçons restent dues dans cette sous-matière, toutes unités
  // confondues. Sert au voyant de retard et à l'écran de validation.
  const queueDepth = (subjectId, componentId) =>
    availableLessons.filter((l) =>
      l.subject_id === subjectId && l.component_id === componentId
      && !l.taught && (l.unit_number || 0) >= EDT_UNITE_DEPART).length;

  // Un créneau, une carte. La base a laissé passer des lignes en double —
  // quatre chemins d'écriture différents alimentent `timetable_slots` et aucun
  // index unique ne les en empêchait — et la journée du 15 août affichait le
  // même cours cinq fois de suite. `demo/demo-02-emploi-du-temps-reparation.sql`
  // pose l'index qui manque ; ce filtre est la ceinture par-dessus la bretelle,
  // parce qu'un écran qui se répète devant une salle ne se rattrape pas.
  const getDaySlots = (dayNum) => {
    const vus = new Set();
    return timetable.filter((s) => {
      if (s.day_of_week !== dayNum) return false;
      const cle = `${s.slot_order}|${s.start_time}|${s.subject_id}|${s.component_id}`;
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    });
  };

  // ---- Admin super-console: manage any school ----
  const loadAdminSchools = async () => {
    setAdminSchoolsLoading(true);
    const [{ data: sc }, { data: ts }] = await Promise.all([
      supabase.from("schools").select("id, name, region, staff_code").order("name"),
      supabase.from("teachers").select("id, full_name, role, school_id"),
    ]);
    const counts = {};
    (ts || []).forEach((t) => { if (t.school_id) counts[t.school_id] = (counts[t.school_id] || 0) + 1; });
    setAdminSchools((sc || []).map((s) => ({ ...s, classes: counts[s.id] || 0 })));
    setAdminTeachers(ts || []);
    setAdminSchoolsLoading(false);
  };
  const createSchool = async () => {
    if (!newSchoolName.trim()) return;
    setAdminSchoolMsg("");
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let gen = ""; for (let i = 0; i < 6; i++) gen += chars[Math.floor(Math.random() * chars.length)];
    const code = newSchoolCode.trim().toUpperCase() || gen;
    const { error } = await supabase.from("schools").insert({
      name: newSchoolName.trim(), region: newSchoolRegion.trim() || null, staff_code: code,
    });
    if (error) { setAdminSchoolMsg("Erreur : " + (error.message || "création impossible")); return; }
    setNewSchoolName(""); setNewSchoolCode(""); setAdminSchoolMsg("École créée ✓ (code " + code + ")");
    loadAdminSchools();
  };
  const assignTeacherToSchool = async (teacherId, schoolId) => {
    const { error } = await supabase.from("teachers").update({ school_id: schoolId }).eq("id", teacherId);
    if (!error) loadAdminSchools();
  };
  const loadAdminSchoolStudents = async (schoolId) => {
    const { data } = await supabase.from("students")
      .select("id, full_name, teacher_id, access_code").eq("school_id", schoolId).order("full_name");
    setAdminSchoolStudents(data || []);
  };
  const openAdminSchool = (s, viewKey) => {
    setAdminSchool(s); setAdminSchoolView(viewKey || "gestion"); loadAdminSchoolStudents(s.id);
  };

  // ---- Console « Utilisateurs » : charger l'annuaire ----
  // Deux tables lues en parallèle, fondues en UNE liste triée par nom : c'est la
  // vue « par personne » qui manquait (jusqu'ici on ne pouvait voir les comptes
  // qu'en passant par une école).
  const loadAdminUsers = async () => {
    setAdminUsersLoading(true);
    setAdminUserMsg("");
    const [{ data: ts, error: tErr }, { data: ps, error: pErr }, { data: sc }, { data: st }] =
      await Promise.all([
        supabase.from("teachers").select("id, full_name, role, school_id, class_label, level, phone, contact_email"),
        supabase.from("parents").select("id, full_name, student_id, phone, contact_email"),
        supabase.from("schools").select("id, name").order("name"),
        supabase.from("students").select("id, full_name"),
      ]);

    // Si `phone` / `contact_email` n'existent pas encore, PostgREST rejette la
    // requête ENTIÈRE (pas seulement la colonne absente) et la liste arrive
    // vide. On le dit, plutôt que d'afficher un annuaire vide et trompeur.
    const failed = tErr || pErr;
    if (failed) {
      setAdminUserMsg(
        "Erreur : " + (failed.message || "chargement impossible") +
        " — si le message parle d'une colonne inconnue, la migration claude-user-admin.sql n'a pas encore été exécutée."
      );
    }

    const childName = {};
    (st || []).forEach((s) => { childName[s.id] = s.full_name; });

    const rows = [
      ...(ts || []).map((t) => ({
        kind: "teacher", id: t.id,
        full_name: t.full_name || "", role: t.role || "teacher",
        school_id: t.school_id || "", class_label: t.class_label || "",
        level: t.level || "", phone: t.phone || "", contact_email: t.contact_email || "",
      })),
      ...(ps || []).map((p) => ({
        kind: "parent", id: p.id,
        full_name: p.full_name || "", role: "parent",
        student_id: p.student_id || null, child: childName[p.student_id] || null,
        phone: p.phone || "", contact_email: p.contact_email || "",
      })),
    ].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "fr"));

    setAdminUserSchools(sc || []);
    setAdminUsers(rows);
    setAdminUsersLoading(false);
  };

  // ---- Console « Utilisateurs » : enregistrer une fiche ----
  const saveAdminUser = async () => {
    const d = adminUserDraft;
    if (!d) return;
    setAdminUserSaving(true);
    setAdminUserMsg("");

    // Le numéro est normalisé AVANT écriture, et un numéro non reconnu est
    // REFUSÉ plutôt qu'enregistré tel quel : un numéro mal formé ne produit
    // aucune erreur visible le jour de l'envoi — la notification est simplement
    // refusée par Meta et le parent n'est jamais prévenu.
    let phoneToSave = null;
    if (String(d.phone || "").trim() !== "") {
      phoneToSave = normalizePhone(d.phone);
      if (!phoneToSave) {
        setAdminUserMsg("Erreur : numéro non reconnu. Format attendu : +237 6 90 00 00 00, ou 690000000 pour un numéro camerounais.");
        setAdminUserSaving(false);
        return;
      }
    }

    const patch = {
      full_name: String(d.full_name || "").trim() || null,
      phone: phoneToSave,
      contact_email: String(d.contact_email || "").trim() || null,
    };
    // Les champs de scolarité n'existent que sur un compte du personnel.
    if (d.kind === "teacher") {
      patch.role = d.role || "teacher";
      patch.school_id = d.school_id || null;
      patch.class_label = String(d.class_label || "").trim() || null;
      patch.level = d.level || null;
    }

    const { error } = await supabase
      .from(d.kind === "teacher" ? "teachers" : "parents")
      .update(patch)
      .eq("id", d.id);

    if (error) {
      setAdminUserMsg("Erreur : " + (error.message || "enregistrement impossible"));
      setAdminUserSaving(false);
      return;
    }

    // Toute modification d'un compte par le superadmin laisse une trace : c'est
    // une donnée d'enfant côté parent, et « qui a changé quoi, quand » doit
    // pouvoir se répondre (Article 12 du protocole pilote).
    logActivity({
      actorId: teacher?.id,
      actorRole: teacher?.role || "admin",
      schoolId: patch.school_id || null,
      eventType: "user_edit",
      detail: (patch.full_name || d.id) + " · " + (ROLE_LABELS[patch.role || d.role] || d.role),
    });

    setAdminUserDraft(null);
    setAdminUserSaving(false);
    setAdminUserMsg("Modifications enregistrées ✓");
    loadAdminUsers();
  };
  // ---- Stage 2: act as a teacher (class) or a pupil's parent ----
  const actAsTeacher = (t) => { if (onImpersonate) onImpersonate("teacher", t, t.full_name || "Enseignant"); };
  const actAsParent = async (student) => {
    if (!onImpersonate) return;
    const { data: p } = await supabase.from("parents").select("*").eq("student_id", student.id).limit(1);
    const profile = (p && p[0]) ? p[0] : { id: student.id, student_id: student.id, full_name: student.full_name };
    onImpersonate("parent", profile, student.full_name);
  };
  // Depuis le journal d'activité, les cartes ne portent qu'un objet de
  // statistiques (id + nom) — pas un profil complet. On va donc chercher la
  // ligne réelle avant d'ouvrir la vue « Agir en tant que ».
  const actAsTeacherById = async (id, name) => {
    if (!onImpersonate || id == null) return;
    const { data } = await supabase.from("teachers").select("*").eq("id", id).limit(1);
    const profile = (data && data[0]) ? data[0] : { id, full_name: name };
    onImpersonate("teacher", profile, profile.full_name || name || "Enseignant");
  };
  const actAsParentById = async (parentId, childName) => {
    if (!onImpersonate || parentId == null) return;
    const { data } = await supabase.from("parents").select("*").eq("id", parentId).limit(1);
    const profile = (data && data[0]) ? data[0] : { id: parentId, full_name: childName };
    onImpersonate("parent", profile, childName || profile.full_name || "Parent");
  };

  // ============ HORLOGE ET « PROCHAIN COURS » ============
  // Calculée dans un effet (et non au rendu) pour éviter tout écart entre le
  // rendu serveur et le rendu client.
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 60000); // la minute suffit
    return () => clearInterval(id);
  }, []);

  const toMinutes = (t) => {
    if (!t) return null;
    const [h, m] = String(t).split(":");
    const hh = Number(h), mm = Number(m || 0);
    return Number.isFinite(hh) ? hh * 60 + mm : null;
  };
  const fmtHour = (t) => (t ? String(t).slice(0, 5).replace(":", " h ") : "");

  // 1 = lundi … 5 = vendredi ; 0 le week-end (pas de cours).
  const todayDow = now ? (now.getDay() >= 1 && now.getDay() <= 5 ? now.getDay() : 0) : 0;
  const minutesNow = now ? now.getHours() * 60 + now.getMinutes() : 0;

  const todaySlots = (todayDow ? getDaySlots(todayDow) : [])
    .slice()
    .sort((a, b) => (a.slot_order || 0) - (b.slot_order || 0)
      || (toMinutes(a.start_time) || 0) - (toMinutes(b.start_time) || 0));

  // « Prochain cours » ne doit jamais annoncer une pause : on calcule sur les
  // seuls créneaux d'enseignement. L'agenda, lui, continue de surligner les
  // pauses « en cours » (calcul indépendant, plus bas, sur todaySlots).
  const lessonSlotsToday = todaySlots.filter((sl) => !isBreakSlot(sl));

  // Le créneau en cours, sinon le prochain à venir.
  const currentSlot = lessonSlotsToday.find((sl) => {
    const st = toMinutes(sl.start_time), en = toMinutes(sl.end_time);
    return st != null && en != null && minutesNow >= st && minutesNow < en;
  }) || null;
  const upcomingSlot = currentSlot || lessonSlotsToday.find((sl) => {
    const st = toMinutes(sl.start_time);
    return st != null && st > minutesNow;
  }) || null;
  const laterSlots = lessonSlotsToday.filter((sl) => {
    const st = toMinutes(sl.start_time);
    return st != null && upcomingSlot && st > (toMinutes(upcomingSlot.start_time) || 0);
  });

  const slotLesson = (sl) =>
    sl ? getQueuedLesson(sl.subject_id, sl.component_id) : null;

  /* Le voyant de retard. Calculé sur le MOIS EN COURS — pas sur le mois
     qu'elle est en train de consulter : un retard d'octobre ne disparaît pas
     parce qu'on feuillette novembre. Rien n'est affiché pour les parents, la
     direction ou l'administrateur : c'est son outil de pilotage à elle. */
  const uniteCourante = edtUniteDuMois(new Date());
  const moisCourant = MONTH_UNIT_MAP.find((m) => m.unit === uniteCourante)?.month || "";
  const retard = (!isParent && !isAdmin && !isSchoolAdmin && uniteCourante)
    ? edtCalculeRetard({
        lessons: availableLessons, timetable,
        unite: uniteCourante, subjects: SUBJECTS, aujourdhui: new Date(),
      })
    : null;

  const minutesUntil = upcomingSlot && !currentSlot
    ? (toMinutes(upcomingSlot.start_time) || 0) - minutesNow
    : null;

  /* ------------------------------------------------------------------------
     Chargement du plan de la séance et de l'état « enseignée » du prochain
     cours. Deux requêtes, une seule fois par leçon. Elles échouent en silence
     hors ligne : l'accueil doit rester lisible sans réseau.
     ------------------------------------------------------------------------ */
  const heroLessonId = upcomingSlot
    ? (getQueuedLesson(upcomingSlot.subject_id, upcomingSlot.component_id) || {}).id
    : null;

  useEffect(() => {
    if (isParent || isAdmin || !heroLessonId) { setHeroPlan({ id: null, sections: [], taught: false }); return undefined; }
    let cancelled = false;
    (async () => {
      // Cached so the home screen keeps its lesson plan without a network —
      // this card is the first thing a teacher looks at in the morning.
      const plan = await cachedQueryMeta(`heroplan_${teacher?.id || "x"}_${heroLessonId}`, async () => {
        const [sec, tgt] = await Promise.all([
          supabase.from("lesson_sections").select("title, section_type")
            .eq("lesson_id", heroLessonId).order("section_order").limit(4),
          teacher?.id
            ? supabase.from("lessons_taught").select("id")
              .eq("teacher_id", teacher.id).eq("lesson_id", heroLessonId).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        return { data: {
          sections: sec.error ? [] : (sec.data || []),
          taught: !!(tgt && tgt.data),
        } };
      });
      if (cancelled) return;
      setHeroPlan({
        id: heroLessonId,
        sections: plan.data?.sections || [],
        taught: !!plan.data?.taught,
      });
    })();
    return () => { cancelled = true; };
  }, [heroLessonId, teacher?.id, isParent, isAdmin]);

  /** Marque la leçon du prochain cours comme enseignée, sans passer par le
   *  lecteur — c'est le geste qui suit immédiatement le cours. */
  // ⚠️ SECOND mark-as-taught path — the one teachers actually reach for, since
  // it is right there on the dashboard after the lesson. It must queue offline
  // exactly like `toggleTaught` below; fixing only that one left this refusing
  // (caught 2026-09-13 by scanning the deployed bundle for the old message).
  const markHeroTaught = async (lesson) => {
    if (!teacher?.id || !lesson?.id || heroPlan.taught) return;
    const offlineNow = typeof navigator !== "undefined" && !navigator.onLine;
    const payload = {
      teacher_id: teacher.id, lesson_id: lesson.id,
      taught_at: new Date().toISOString(), // real time, not sync time
    };
    try {
      if (offlineNow) {
        await enqueue({
          kind: "taught", table: "lessons_taught", op: "upsert",
          onConflict: "teacher_id,lesson_id", payload,
        });
        refreshPending();
      } else {
        const { error } = await supabase.from("lessons_taught")
          .upsert(payload, { onConflict: "teacher_id,lesson_id" });
        if (error) throw error;
      }
    } catch (_) {
      pushToast("Impossible d'enregistrer. Réessayez dans un instant.", "error");
      return;
    }
    setHeroPlan((p) => ({ ...p, taught: true }));
    setAvailableLessons((prev) => prev.map((l) => (l.id === lesson.id ? { ...l, taught: true } : l)));
    pushToast(offlineNow
      ? "Leçon marquée enseignée — partira au retour du réseau."
      : "Leçon marquée enseignée", "success");
    logActivity({
      actorId: teacher.id, actorRole: teacher?.role || "teacher",
      schoolId: teacher?.school_id || schoolContext?.id,
      eventType: "mark_taught", lessonId: lesson.id, detail: lesson.title,
    });
  };

  /* ------------------------------------------------------------------------
     LOT 14 — DEUX HORLOGES DIFFÉRENTES, ET IL FAUT ARRÊTER DE LES MÉLANGER.

     Le voyant affichait un seul décompte — « Hors ligne prêt · 5 jours » —
     posé à côté du nombre de leçons téléchargées. Lu naturellement, cela dit
     que les leçons expirent dans cinq jours. C'est faux :

       · les LEÇONS téléchargées ne périment JAMAIS (aucune purge n'existe,
         et c'est une décision assumée — voir le §9.7 de la conception) ;
       · l'ACCÈS hors ligne, lui, périme au bout de 7 jours — et se recharge
         tout seul à chaque ouverture en ligne.

     On affiche donc deux phrases distinctes, et une DATE plutôt qu'un
     décompte : « jusqu'au 23 septembre » ne se périme pas entre le moment où
     l'écran est rendu et celui où l'enseignante le lit.
     ------------------------------------------------------------------------ */
  const grantUntil = (() => {
    if (!OFFLINE_ENABLED) return null;
    const g = getGrant();
    if (!g || !g.until) return null;
    return new Date(g.until);
  })();
  // Toujours utile pour l'alerte de fin d'accès — mais plus pour le voyant.
  const grantDaysLeft = grantUntil == null
    ? null
    : Math.max(0, Math.ceil((grantUntil.getTime() - Date.now()) / 86400000));

  // Jusqu'où va la couverture hors ligne, en (unité · semaine) : le plus loin
  // qu'on ait téléchargé. Calculé sur `availableLessons`, qui est lui-même en
  // cache — donc lisible sans réseau, comme le reste de cet écran.
  const offlineCoverage = (() => {
    if (!OFFLINE_ENABLED || !cachedIds.length || !availableLessons.length) return null;
    const have = new Set(cachedIds);
    let best = null;
    for (const l of availableLessons) {
      if (!have.has(l.id)) continue;
      const u = l.unit_number || 0;
      const w = l.week_number || 0;
      if (!best || u > best.unit || (u === best.unit && w > best.week)) best = { unit: u, week: w };
    }
    if (!best || !best.unit) return null;
    return { ...best, month: MONTH_UNIT_MAP[best.unit - 1]?.month || null };
  })();

  /** « jusqu'à la semaine 2 de Novembre » — ou null si on ne sait pas le dire. */
  const coverageLabel = offlineCoverage
    ? (offlineCoverage.month
        ? `jusqu'à la semaine ${offlineCoverage.week || 1} de ${offlineCoverage.month}`
        : `jusqu'à l'unité ${offlineCoverage.unit}, semaine ${offlineCoverage.week || 1}`)
    : null;

  // ============ INLINE EDIT FUNCTIONS ============
  const startInlineEdit = async () => {
    if (!currentLesson) return;
    // Un enregistrement précédent s'est-il interrompu sur cette leçon ?
    setOrphanBackup(pendingBackup(currentLesson.id));
    setEditTitle(currentLesson.title);
    setEditObjective(currentLesson.objective || "");
    setEditDuration(currentLesson.duration || "45 minutes");
    setEditError("");

    // Convert lessonSections + sectionBlocks into edit-friendly format
    if (lessonSections.length > 0) {
      setEditSections(lessonSections.map(s => {
        const blocks = (sectionBlocks[s.id] || []).map(b => ({
          block_type: b.block_type,
          text_content: b.text_content || "",
          media_url: b.media_url || "",
          caption: b.caption || "",
          alt_text: b.alt_text || "",
        }));
        return {
          type: s.section_type,
          title: s.title,
          icon: s.icon,
          blocks: blocks.length > 0 ? blocks : [emptyBlock("text")],
        };
      }));
    } else {
      setEditSections([{ type: "intro", title: "Introduction", icon: "💡", blocks: [emptyBlock("text")] }]);
    }

    // Convert exercises
    if (lessonExercises.length > 0) {
      setEditExercises(lessonExercises.map(ex => ({
        question: ex.question,
        type: ex.exercise_type,
        options: ex.options
          ? (typeof ex.options === "string" ? JSON.parse(ex.options) : ex.options).concat(["", "", "", ""]).slice(0, 4)
          : ["", "", "", ""],
        answer: ex.answer || "",
      })));
    } else {
      setEditExercises([{ question: "", type: "open", options: ["", "", "", ""], answer: "" }]);
    }

    // Load quiz questions
    const { data: quizData } = await supabase
      .from("readiness_questions")
      .select("*")
      .eq("lesson_id", currentLesson.id)
      .order("question_order");

    if (quizData && quizData.length > 0) {
      setEditQuizQuestions(quizData.map(q => ({
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
      })));
    } else {
      setEditQuizQuestions([{ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }]);
    }

    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditError("");
  };

  /* ============================================================
     SAUVEGARDE SÛRE DE L'ÉDITEUR DE LEÇON
     ------------------------------------------------------------
     L'enregistrement SUPPRIME les sections, blocs, exercices et questions
     avant de les réinsérer. Une coupure réseau au milieu — le cas nominal
     ici — laissait la leçon amputée, sans aucun avertissement.
     On prend donc un instantané complet AVANT toute suppression, on le
     conserve hors mémoire (le navigateur peut être fermé), et on le
     réinjecte si quoi que ce soit échoue.
     ============================================================ */

  // L'instantané et la restauration vivent dans `lib/lesson-backup.js` :
  // les deux éditeurs de la plateforme s'en servent (voir ce fichier).

  const handleInlineSave = async () => {
    setEditSaving(true);
    setEditError("");

    const lessonId = currentLesson.id;
    let snap = null;

    // Filet de sécurité : on capture l'existant AVANT de toucher à quoi que ce
    // soit, et on le dépose hors mémoire pour survivre à une fermeture d'onglet.
    try {
      snap = await takeBackup(lessonId);
    } catch (_) {
      setEditError("Impossible de sécuriser la leçon avant l'enregistrement. Vérifiez votre connexion et réessayez.");
      setEditSaving(false);
      return;
    }

    try {

      // Update lesson metadata
      const { error: updateError } = await supabase
        .from("lessons")
        .update({
          title: editTitle,
          objective: editObjective,
          duration: editDuration,
        })
        .eq("id", lessonId);
      if (updateError) throw updateError;

      // Wipe old children before re-inserting
      await supabase.from("lesson_sections").delete().eq("lesson_id", lessonId);
      await supabase.from("exercises").delete().eq("lesson_id", lessonId);
      await supabase.from("readiness_questions").delete().eq("lesson_id", lessonId);

      // Insert sections
      const sectionsToInsert = editSections.map((s, i) => ({
        lesson_id: lessonId,
        section_order: i + 1,
        section_type: s.type,
        title: s.title,
        icon: s.icon,
      }));

      const { data: insertedSections, error: sectionsError } = await supabase
        .from("lesson_sections")
        .insert(sectionsToInsert)
        .select();
      if (sectionsError) throw sectionsError;

      // Build and insert blocks
      const blocksToInsert = [];
      editSections.forEach((s, i) => {
        const sectionId = insertedSections[i]?.id;
        if (!sectionId) return;
        (s.blocks || []).forEach((b, j) => {
          const hasContent =
            (b.block_type === "text" && b.text_content && b.text_content.trim()) ||
            ((b.block_type === "image" || b.block_type === "video") && b.media_url && b.media_url.trim());
          if (!hasContent) return;
          blocksToInsert.push({
            section_id: sectionId,
            block_order: j + 1,
            block_type: b.block_type,
            text_content: b.block_type === "text" ? b.text_content : null,
            media_url: b.block_type !== "text" ? b.media_url : null,
            caption: b.caption && b.caption.trim() ? b.caption : null,
            alt_text: b.alt_text && b.alt_text.trim() ? b.alt_text : null,
          });
        });
      });

      if (blocksToInsert.length > 0) {
        const { error: blocksError } = await supabase.from("section_blocks").insert(blocksToInsert);
        if (blocksError) throw blocksError;
      }

      // Insert exercises
      const exercisesToInsert = editExercises
        .filter(ex => ex.question.trim())
        .map((ex, i) => ({
          lesson_id: lessonId,
          exercise_order: i + 1,
          question: ex.question,
          exercise_type: ex.type,
          options: ex.type === "choice" ? JSON.stringify(ex.options.filter(o => o.trim())) : null,
          answer: ex.answer || null,
        }));

      if (exercisesToInsert.length > 0) {
        const { error: exercisesError } = await supabase.from("exercises").insert(exercisesToInsert);
        if (exercisesError) throw exercisesError;
      }

      // Insert quiz questions
      const quizToInsert = editQuizQuestions
        .filter(q => q.question.trim())
        .map((q, i) => ({
          lesson_id: lessonId,
          question_order: i + 1,
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
        }));

      if (quizToInsert.length > 0) {
        const { error: quizError } = await supabase.from("readiness_questions").insert(quizToInsert);
        if (quizError) throw quizError;
      }

      // Tout est passé : l'instantané n'a plus lieu d'être.
      clearBackup(lessonId);

      setEditMode(false);
      await openLesson(lessonId);
      await fetchAllLessons();
      pushToast("Leçon enregistrée", "success");
    } catch (err) {
      // Échec en cours de route : on remet la leçon dans son état d'origine.
      const restored = await rollback(snap);

      setEditError(
        restored
          ? "L'enregistrement a échoué — la leçon a été remise dans son état précédent. Vos modifications sont toujours à l'écran : réessayez."
          : "L'enregistrement a échoué et la restauration automatique aussi. NE FERMEZ PAS cette page : une copie de sécurité est conservée, réessayez dès que la connexion revient."
      );
      pushToast(restored ? "Échec — leçon restaurée" : "Échec — copie de sécurité conservée", "error");
    }

    setEditSaving(false);
  };

  // Section helpers (inline edit)
  const eAddSection = () => {
    setEditSections([...editSections, { type: "content", title: "", icon: "📖", blocks: [emptyBlock("text")] }]);
  };
  const eUpdateSection = (index, field, value) => {
    const updated = [...editSections];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "type") {
      const typeInfo = SECTION_TYPES.find(t => t.id === value);
      updated[index].icon = typeInfo?.icon || "📖";
    }
    setEditSections(updated);
  };
  const eRemoveSection = (index) => {
    if (editSections.length > 1) setEditSections(editSections.filter((_, i) => i !== index));
  };

  // Block helpers (inline edit)
  const eAddBlock = (sIndex, type = "text") => {
    const updated = [...editSections];
    updated[sIndex] = { ...updated[sIndex], blocks: [...updated[sIndex].blocks, emptyBlock(type)] };
    setEditSections(updated);
  };
  const eUpdateBlock = (sIndex, bIndex, field, value) => {
    const updated = [...editSections];
    const blocks = [...updated[sIndex].blocks];
    blocks[bIndex] = { ...blocks[bIndex], [field]: value };
    updated[sIndex] = { ...updated[sIndex], blocks };
    setEditSections(updated);
  };
  const eRemoveBlock = (sIndex, bIndex) => {
    const updated = [...editSections];
    if (updated[sIndex].blocks.length > 1) {
      updated[sIndex] = { ...updated[sIndex], blocks: updated[sIndex].blocks.filter((_, i) => i !== bIndex) };
      setEditSections(updated);
    }
  };
  const eMoveBlock = (sIndex, bIndex, direction) => {
    const updated = [...editSections];
    const blocks = [...updated[sIndex].blocks];
    const newIndex = bIndex + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    [blocks[bIndex], blocks[newIndex]] = [blocks[newIndex], blocks[bIndex]];
    updated[sIndex] = { ...updated[sIndex], blocks };
    setEditSections(updated);
  };
  const eHandleImageUpload = async (sIndex, bIndex, file) => {
    if (!file) return;
    const key = `${sIndex}-${bIndex}`;
    setEditUploadingKey(key);
    setEditError("");
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("lesson-images").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("lesson-images").getPublicUrl(fileName);
      eUpdateBlock(sIndex, bIndex, "media_url", urlData.publicUrl);
    } catch (err) {
      setEditError("Erreur upload image: " + err.message);
    }
    setEditUploadingKey(null);
  };

  // Exercise helpers (inline edit)
  const eAddExercise = () => {
    setEditExercises([...editExercises, { question: "", type: "open", options: ["", "", "", ""], answer: "" }]);
  };
  const eUpdateExercise = (index, field, value) => {
    const updated = [...editExercises];
    updated[index] = { ...updated[index], [field]: value };
    setEditExercises(updated);
  };
  const eUpdateOption = (exIndex, optIndex, value) => {
    const updated = [...editExercises];
    const opts = [...updated[exIndex].options];
    opts[optIndex] = value;
    updated[exIndex] = { ...updated[exIndex], options: opts };
    setEditExercises(updated);
  };
  const eRemoveExercise = (index) => {
    if (editExercises.length > 1) setEditExercises(editExercises.filter((_, i) => i !== index));
  };

  // Quiz helpers (inline edit)
  const eAddQuiz = () => {
    setEditQuizQuestions([...editQuizQuestions, { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }]);
  };
  const eUpdateQuiz = (index, field, value) => {
    const updated = [...editQuizQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setEditQuizQuestions(updated);
  };
  const eRemoveQuiz = (index) => {
    if (editQuizQuestions.length > 1) setEditQuizQuestions(editQuizQuestions.filter((_, i) => i !== index));
  };

  const openLesson = async (lessonId, opts = {}) => {
    // When stepping between lessons (Précédent/Suivant) we keep the originally
    // saved list position so "Retour" still lands where the review started.
    if (!opts.keepListScroll) listScrollY.current = window.scrollY;
    setLoadingLesson(true);

    // Content bundle (lesson + sections + blocks + exercises). Offline mode:
    // fetch from the network, cache it, and fall back to the cache when offline.
    let bundle = null;
    try {
      bundle = await fetchLessonBundle(lessonId);
      if (OFFLINE_ENABLED) await saveLessonBundle(lessonId, bundle);
    } catch (_) {
      if (OFFLINE_ENABLED) bundle = await loadLessonBundle(lessonId);
    }
    if (!bundle) {
      // Hors ligne et leçon jamais téléchargée (ou identifiant invalide).
      // C'était l'échec le plus probable en classe : l'enseignante appuyait,
      // et il ne se passait strictement rien. On le dit désormais.
      setLoadingLesson(false);
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setBlockedLesson({
        id: lessonId,
        reason: offline ? "offline" : "missing",
      });
      return;
    }

    // Teacher-specific state (readiness pass + own feedback) stays online-only.
    let passed = false;
    let fb = [];
    let taught = false;
    const canReachTeacherData =
      teacher?.id && (typeof navigator === "undefined" || navigator.onLine);
    if (canReachTeacherData) {
      try {
        const { data: readiness } = await supabase.from("teacher_readiness").select("*")
          .eq("teacher_id", teacher.id).eq("lesson_id", lessonId).eq("passed", true).maybeSingle();
        passed = !!readiness;
        const { data: fbData } = await supabase.from("lesson_feedback").select("*")
          .eq("teacher_id", teacher.id).eq("lesson_id", lessonId);
        fb = fbData || [];
      } catch (_) {}
      // Whether this teacher has marked this lesson taught (own resilient query).
      try {
        const { data: t } = await supabase.from("lessons_taught").select("id")
          .eq("teacher_id", teacher.id).eq("lesson_id", lessonId).maybeSingle();
        taught = !!t;
      } catch (_) {}
    }

    setCurrentLesson(bundle.lesson);
    setLessonSections(bundle.sections || []);
    setSectionBlocks(bundle.blocksBySection || {});
    setLessonExercises(bundle.exercises || []);
    setCollapsedSections({}); // enter a lesson with every section expanded
    setLessonPassed(passed);
    setLessonTaught(taught);
    setLessonFeedback(fb);
    setFeedbackOpenFor(null);
    setScreen("lesson");
    setLoadingLesson(false);
    logActivity({
      actorId: isParent ? parent?.id : teacher?.id,
      actorRole: isParent ? "parent" : (teacher?.role || "teacher"),
      schoolId: isParent ? parentStudent?.school_id : (teacher?.school_id || schoolContext?.id),
      eventType: "lesson_open", lessonId, detail: bundle?.lesson?.title || null,
    });
  };

  // Toggle "Leçon enseignée" for the current teacher + lesson.
  //
  // Offline this used to simply refuse ("Hors ligne : impossible d'enregistrer
  // pour le moment"), which is exactly the wall we set out to remove. It now
  // goes into the outbox and leaves with the next sync.
  //
  // ⚠️ `taught_at` is sent EXPLICITLY. The column defaults to now(), so a lesson
  // taught on Monday and synced on Thursday would be recorded as Thursday.
  const toggleTaught = async () => {
    if (!teacher?.id || !currentLesson) return;
    const offlineNow = typeof navigator !== "undefined" && !navigator.onLine;
    setTaughtSaving(true);
    try {
      if (lessonTaught) {
        if (offlineNow) {
          await enqueue({
            kind: "untaught", table: "lessons_taught", op: "delete",
            match: { teacher_id: teacher.id, lesson_id: currentLesson.id },
          });
        } else {
          const { error } = await supabase.from("lessons_taught").delete()
            .eq("teacher_id", teacher.id).eq("lesson_id", currentLesson.id);
          if (error) throw error;
        }
        setLessonTaught(false);
        setAvailableLessons((prev) => prev.map((l) => (l.id === currentLesson.id ? { ...l, taught: false } : l)));
        logActivity({ actorId: teacher.id, actorRole: teacher?.role || "teacher", schoolId: teacher?.school_id || schoolContext?.id, eventType: "unmark_taught", lessonId: currentLesson.id, detail: currentLesson.title });
      } else {
        const payload = {
          teacher_id: teacher.id, lesson_id: currentLesson.id,
          taught_at: new Date().toISOString(),
        };
        if (offlineNow) {
          await enqueue({
            kind: "taught", table: "lessons_taught", op: "upsert",
            onConflict: "teacher_id,lesson_id", payload,
          });
        } else {
          const { error } = await supabase.from("lessons_taught")
            .upsert(payload, { onConflict: "teacher_id,lesson_id" });
          if (error) throw error;
        }
        setLessonTaught(true);
        setAvailableLessons((prev) => prev.map((l) => (l.id === currentLesson.id ? { ...l, taught: true } : l)));
        logActivity({ actorId: teacher.id, actorRole: teacher?.role || "teacher", schoolId: teacher?.school_id || schoolContext?.id, eventType: "mark_taught", lessonId: currentLesson.id, detail: currentLesson.title });
      }
      if (offlineNow) {
        pushToast("Enregistré hors ligne — partira au retour du réseau.", "success");
        refreshPending();
      }
    } catch (_) {
      // L'enseignante croyait sa leçon marquée alors que l'écriture avait échoué.
      pushToast("Impossible d'enregistrer. Réessayez dans un instant.", "error");
    }
    setTaughtSaving(false);
  };

  // Ordered list of the EXISTING lessons in the current lesson's component
  // (across all its units) so Précédent/Suivant can step through them without
  // returning to the list. Empty weeks are skipped because availableLessons
  // only holds lessons that actually exist.
  const getAdjacentLessons = () => {
    if (!currentLesson) return { prev: null, next: null };
    const siblings = (availableLessons || [])
      .filter(l => l.subject_id === currentLesson.subject_id && l.component_id === currentLesson.component_id)
      .sort((a, b) => (a.unit_number - b.unit_number) || ((a.week_number || 1) - (b.week_number || 1)));
    const idx = siblings.findIndex(l => l.id === currentLesson.id);
    if (idx === -1) return { prev: null, next: null };
    return {
      prev: idx > 0 ? siblings[idx - 1] : null,
      next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
    };
  };

  const goToLesson = async (lesson) => {
    if (!lesson) return;
    setEditMode(false);
    await openLesson(lesson.id, { keepListScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- Review feedback helpers ----
  const openFeedback = (target) => {
    const existing = (lessonFeedback || []).find(f =>
      target === "lesson" ? f.section_id == null : f.section_id === target
    );
    setFbRating(existing?.rating || 0);
    setFbComment(existing?.comment || "");
    setFeedbackOpenFor(target);
  };

  const submitFeedback = async (sectionId, sectionTitle) => {
    if (!fbComment.trim() && !fbRating) { setFeedbackOpenFor(null); return; }
    setFbSaving(true);
    const row = {
      teacher_id: teacher?.id,
      lesson_id: currentLesson.id,
      section_id: sectionId,          // null for whole-lesson
      section_title: sectionTitle || null,
      rating: fbRating || null,
      comment: fbComment.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const existing = (lessonFeedback || []).find(f =>
      sectionId == null ? f.section_id == null : f.section_id === sectionId
    );
    if (existing) {
      await supabase.from("lesson_feedback").update(row).eq("id", existing.id);
    } else {
      await supabase.from("lesson_feedback").insert(row);
    }
    // Refresh this teacher's feedback for the lesson
    const { data: fb } = await supabase
      .from("lesson_feedback")
      .select("*")
      .eq("teacher_id", teacher?.id)
      .eq("lesson_id", currentLesson.id);
    setLessonFeedback(fb || []);
    logActivity({ actorId: teacher?.id, actorRole: teacher?.role || "teacher", schoolId: teacher?.school_id || schoolContext?.id, eventType: "feedback", lessonId: currentLesson.id, detail: currentLesson.title });
    setFbSaving(false);
    setFeedbackOpenFor(null);
    setFbRating(0);
    setFbComment("");
  };

  const feedbackFor = (sectionId) =>
    (lessonFeedback || []).find(f =>
      sectionId == null ? f.section_id == null : f.section_id === sectionId
    );

  // Renders the reviewer comment + rating control for a section (or the whole
  // lesson when sectionId is null). Admins don't see it — they edit instead.
  const renderFeedback = (sectionId, sectionTitle) => {
    if (isAdmin || isParent) return null;
    const target = sectionId == null ? "lesson" : sectionId;
    const isOpen = feedbackOpenFor === target;
    const existing = feedbackFor(sectionId);
    const Stars = ({ value, onPick }) => (
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} onClick={onPick ? () => onPick(n) : undefined}
            style={{ fontSize: "var(--ec-fs-5)", cursor: onPick ? "pointer" : "default", color: n <= value ? "#F59E0B" : "#D1D5DB", lineHeight: 1 }}>★</span>
        ))}
      </div>
    );

    if (isOpen) {
      return (
        <div style={{ marginTop: 12, background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: "var(--ec-fs-2)", fontWeight: 700, color: "#5B21B6", marginBottom: 8 }}>Votre retour</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: "var(--ec-fs-3)", color: "#6B7280" }}>Note :</span>
            <Stars value={fbRating} onPick={setFbRating} />
          </div>
          <textarea value={fbComment} onChange={e => setFbComment(e.target.value)}
            placeholder="Votre commentaire sur cette section…" rows={3}
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #D1D5DB", borderRadius: 8, fontSize: "var(--ec-fs-3)", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={() => setFeedbackOpenFor(null)} disabled={fbSaving}
              style={{ padding: "8px 16px", background: "white", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: "var(--ec-fs-3)", fontWeight: 600, color: "#374151", cursor: "pointer" }}>Annuler</button>
            <button onClick={() => submitFeedback(sectionId, sectionTitle)} disabled={fbSaving}
              style={{ padding: "8px 18px", background: fbSaving ? "#9CA3AF" : "#7C3AED", color: "white", border: "none", borderRadius: 8, fontSize: "var(--ec-fs-3)", fontWeight: 700, cursor: fbSaving ? "default" : "pointer" }}>
              {fbSaving ? "Envoi…" : "Enregistrer"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ marginTop: 12 }}>
        {existing ? (
          <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Stars value={existing.rating || 0} />
                <span style={{ fontSize: "var(--ec-fs-2)", color: "#16A34A", fontWeight: 600 }}>Retour enregistré</span>
              </div>
              {existing.comment && <div style={{ fontSize: "var(--ec-fs-3)", color: "#4B5563", marginTop: 4 }}>{existing.comment}</div>}
            </div>
            <button onClick={() => openFeedback(target)}
              style={{ padding: "6px 12px", background: "white", border: "1px solid #DDD6FE", borderRadius: 6, fontSize: "var(--ec-fs-2)", fontWeight: 600, color: "#7C3AED", cursor: "pointer", whiteSpace: "nowrap" }}>Modifier</button>
          </div>
        ) : (
          <button onClick={() => openFeedback(target)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "white", border: "1px dashed #C4B5FD", borderRadius: 8, fontSize: "var(--ec-fs-3)", fontWeight: 600, color: "#7C3AED", cursor: "pointer" }}>
            💬 Commenter cette section
          </button>
        )}
      </div>
    );
  };

  const openLessonBySubject = async (subjectId, componentId, unitNumber) => {
    const lesson = getLessonForTopic(subjectId, componentId, unitNumber);
    if (lesson) openLesson(lesson.id);
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setScreen(newTab);
    if (newTab === "programme") setProgrammeView("subjects");
  };

  // ============ HEADER ============
  // ============ EN-TÊTE ============
  const Header = () => (
    <header style={{
      background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`,
      padding: isMobile ? "10px 14px" : "12px 24px",
      display: "flex", alignItems: "center", gap: 10,
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <button
        onClick={() => { setScreen(isParent ? "home" : tab); setProgrammeView("subjects"); }}
        aria-label="Revenir à l'écran principal"
        style={{
          display: "flex", alignItems: "center", gap: 10, minWidth: 0,
          background: "none", border: 0, padding: 0, textAlign: "left",
        }}
      >
        <span aria-hidden="true" className="ec-hide-wide" style={{
          width: 34, height: 34, borderRadius: 9, flex: "none",
          background: COLORS.g500, color: "#fff", display: "grid", placeItems: "center",
          fontWeight: 800, fontSize: "var(--ec-fs-3)",
        }}>EC</span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0 }}>
          <span className="ec-hide-wide" style={{ color: COLORS.ink, fontSize: "var(--ec-fs-4)", fontWeight: 700 }}>EduCam</span>
          {PROFILES_ENABLED && schoolContext?.name && (
            <span style={{
              color: COLORS.ink3, fontSize: "var(--ec-fs-1)", fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: isMobile ? 150 : 260,
            }}>{schoolContext.name}</span>
          )}
        </span>
      </button>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {OFFLINE_ENABLED && (!online || !isMobile) && (
          /* Étiquette lisible, et non plus une pastille de couleur avec info-bulle :
             les info-bulles n'existent pas au tactile. Sur mobile, l'espace est
             réservé au seul état actionnable — hors ligne. */
          <Badge tone={online ? "brand" : "warn"}>
            <span aria-hidden="true" style={{
              width: 7, height: 7, borderRadius: 999,
              background: online ? COLORS.g500 : COLORS.warn,
            }} />
            {online ? "En ligne" : "Hors ligne"}
          </Badge>
        )}

        {PROFILES_ENABLED && (isParent || (!isAdmin && teacher?.id)) && (
          <div style={{ position: "relative", flex: "none" }}>
            <IconButton
              label={unreadCount > 0 ? `Messages, ${unreadCount} non lu(s)` : "Messages"}
              onClick={() => { setOpenMsg(null); setScreen("messages"); }}
            >
              ✉️
            </IconButton>
            {unreadCount > 0 && (
              <span aria-hidden="true" style={{
                position: "absolute", top: -3, right: -3, background: COLORS.crit,
                color: "#fff", fontSize: "var(--ec-fs-1)", fontWeight: 800, minWidth: 18, height: 18,
                borderRadius: 9, display: "inline-flex", alignItems: "center",
                justifyContent: "center", padding: "0 4px", border: `2px solid ${COLORS.card}`,
              }}>{unreadCount}</span>
            )}
          </div>
        )}

        {isParent && <Badge tone="neutral">Espace parent</Badge>}

        <IconButton
          label="Se déconnecter"
          onClick={async () => { await supabase.auth.signOut(); onLogout(); }}
        >
          ⏻
        </IconButton>
      </div>
    </header>
  );

  // ============ NAVIGATION BASSE ============
  // Présente pour TOUS les rôles (les parents en étaient privés sur l'accueil),
  // avec une zone sûre pour la barre gestuelle Android.
  const BottomNav = () => {
    // Le rail de gauche est PERMANENT sur tous les écrans : il porte donc
    // toutes les destinations du rôle, et non plus seulement trois. Les accès
    // rapides qui vivaient en bas de l'accueil sont remontés ici.
    // `phone: true` = visible aussi dans la barre basse du téléphone, qui
    // reste volontairement courte (5 entrées maximum, cibles de 52 px).
    const go = (s2, t) => () => {
      if (t) setTab(t);
      if (s2 === "programme") setProgrammeView("subjects");
      if (s2 === "results") setResultsTab("entry");
      if (s2 === "activitylog") setActivityTab("teachers");
      setScreen(s2);
    };

    let groups;
    if (isParent) {
      groups = [
        { sect: "Mon enfant", items: [
          { key: "home", icon: "⌂", label: "Accueil", phone: true, onClick: go("home") },
          { key: "results", icon: "✓", label: "Résultats", phone: true, onClick: go("results") },
          { key: "programme", icon: "◈", label: "Programme", phone: true, onClick: go("programme", "programme") },
          { key: "calendar", icon: "▤", label: "Emploi du temps", phone: false, onClick: go("calendar", "calendar") },
        ] },
        { sect: "Échanges", items: [
          { key: "messages", icon: "✉", label: "Messagerie", phone: true, onClick: go("messages") },
        ] },
      ];
    } else if (isAdmin) {
      groups = [
        { sect: "Plateforme", items: [
          { key: "home", icon: "⌂", label: "Accueil", phone: true, onClick: go("home") },
          { key: "adminschools", icon: "⌗", label: "Écoles", phone: true, onClick: () => { setScreen("adminschools"); loadAdminSchools(); } },
          { key: "adminusers", icon: "◍", label: "Utilisateurs", phone: true, onClick: () => { setScreen("adminusers"); loadAdminUsers(); } },
          { key: "admin", icon: "✎", label: "Gestion des leçons", phone: true, onClick: go("admin") },
        ] },
        { sect: "Contenu", items: [
          { key: "programme", icon: "◈", label: "Programme", phone: true, onClick: go("programme", "programme") },
          { key: "calendar", icon: "▤", label: "Emploi du temps", phone: false, onClick: go("calendar", "calendar") },
        ] },
        { sect: "Suivi", items: [
          { key: "activitylog", icon: "◔", label: "Activité", phone: false, onClick: go("activitylog") },
          { key: "messages", icon: "✉", label: "Messagerie", phone: false, onClick: go("messages") },
        ] },
      ];
    } else if (isSchoolAdmin) {
      groups = [
        { sect: "Mon école", items: [
          { key: "home", icon: "⌂", label: "Tableau de bord", phone: true, onClick: go("home") },
          { key: "schooladmin", icon: "☰", label: "Gérer l'école", phone: true, onClick: go("schooladmin") },
          { key: "calendar", icon: "▤", label: "Emploi du temps", phone: true, onClick: go("calendar", "calendar") },
          { key: "programme", icon: "◈", label: "Programme", phone: false, onClick: go("programme", "programme") },
        ] },
        { sect: "Suivi", items: [
          { key: "results", icon: "✓", label: "Résultats", phone: true, onClick: go("results") },
          { key: "activitylog", icon: "◔", label: "Activité", phone: false, onClick: go("activitylog") },
          { key: "messages", icon: "✉", label: "Messagerie", phone: false, onClick: go("messages") },
          // Lot D — la vue des échanges, direction et référent uniquement.
          { key: "exchanges", icon: "⇄", label: "Échanges de l'école", phone: false, onClick: go("exchanges") },
        ] },
      ];
    } else {
      groups = [
        { sect: "Ma classe", items: [
          { key: "home", icon: "⌂", label: "Accueil", phone: true, onClick: go("home") },
          { key: "calendar", icon: "▤", label: isMobile ? "Horaire" : "Emploi du temps", phone: true, onClick: go("calendar", "calendar") },
          { key: "programme", icon: "◈", label: "Programme", phone: true, onClick: go("programme", "programme") },
        ] },
        { sect: "Suivi", items: [
          ...(PROFILES_ENABLED ? [{ key: "results", icon: "✓", label: "Résultats", phone: true, onClick: go("results") }] : []),
          ...(PROFILES_ENABLED ? [{ key: "messages", icon: "✉", label: "Messagerie", phone: true, onClick: go("messages") }] : []),
        ] },
      ];
    }
    groups = groups.filter((g) => g.items.length > 0);

    // Identité affichée au pied du rail (masquée sur téléphone par le CSS).
    const who = isParent
      ? (parent?.full_name || "Parent")
      : (teacher?.full_name || "Enseignant");
    const whoSub = isParent
      ? (parentStudent?.full_name ? `Parent de ${parentStudent.full_name}` : "Espace parent")
      : [selectedLevel?.name, isAdmin ? "administration" : isReferent ? "référent" : isSchoolAdmin ? "direction" : "enseignant"]
          .filter(Boolean).join(" · ");
    const initials = (who || "?").split(" ").filter(Boolean).slice(0, 2)
      .map((w) => w[0]).join("").toUpperCase();

    // Le parent n'a que quatre destinations : sur ordinateur une barre haute
    // suffit, un rail permanent de 250 px lui présenterait surtout du vide.
    // Sur téléphone — son usage principal — rien ne change.
    return (
      <nav className={`ec-bottomnav${isParent ? " ec-bottomnav--parent" : ""}`} aria-label="Navigation principale">
        <div className="ec-nav-brand" aria-hidden="true">
          <span>EC</span>
          <span>
            <b>EduCam</b>
            <i>{schoolContext?.name || "École"}</i>
          </span>
        </div>

        {groups.map((g) => (
          <Fragment key={g.sect}>
            <div className="ec-nav-sect" aria-hidden="true">{g.sect}</div>
            {g.items.map((it) => (
              <button
                key={it.key}
                onClick={it.onClick}
                className={it.phone ? undefined : "ec-nav-wideonly"}
                aria-current={screen === it.key ? "page" : undefined}
              >
                <span aria-hidden="true" className="ec-nav-ico">{it.icon}</span>
                <span style={{ whiteSpace: "nowrap" }}>{it.label}</span>
                {it.key === "messages" && unreadCount > 0 && (
                  <span className="ec-nav-pill">{unreadCount}</span>
                )}
              </button>
            ))}
          </Fragment>
        ))}

        <div className="ec-nav-foot">
          <span aria-hidden="true">{initials}</span>
          <span style={{ minWidth: 0 }}>
            <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{who}</b>
            <i style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{whoSub}</i>
          </span>
        </div>
      </nav>
    );
  };

  // ============ MESSAGES INBOX (parents + teachers) ============
  // ============ MESSAGERIE — deux volets sur grand écran ============
  // Sur ordinateur, la liste et la lecture cohabitent : ouvrir un message ne
  // fait plus disparaître la boîte. Sur téléphone, où deux volets ne tiennent
  // pas, le comportement d'avant est conservé — la lecture remplace la liste.
  const MessagesInbox = () => {
    // Le NOM d'abord ; à défaut, exactement l'ancien libellé. Écrit dans cet
    // ordre exprès : si la recherche échoue — hors ligne, droits refusés,
    // compte supprimé — l'écran revient au comportement d'avant au lieu
    // d'afficher un vide ou un identifiant technique.
    const senderLabel = (m) =>
      senderNames[m.sender_id]?.nom
      || (m.audience === "teacher" ? "Administration" : (schoolContext?.name || "École"));
    // La qualité de l'expéditeur, quand on la connaît : un nom seul ne suffit
    // pas toujours à savoir à qui on répond.
    const senderMeta = (m) => {
      const r = senderNames[m.sender_id]?.role;
      return r ? `${senderLabel(m)} · ${r}` : senderLabel(m);
    };
    const fmtDate = (s) => (s || "").slice(0, 10);
    const lessonLink = (m) => m.link_url && /^\d+$/.test(m.link_url);

    const unread = inbox.filter((m) => !m.read_at);
    const read = inbox.filter((m) => m.read_at);

    const Row = (m) => (
      <ListRow
        key={m.id}
        icon={senderLabel(m).slice(0, 1).toUpperCase()}
        iconColor={m.read_at ? undefined : COLORS.g500}
        title={m.subject || "Sans objet"}
        meta={`${senderMeta(m)} · ${fmtDate(m.created_at)}`}
        onClick={() => openMessage(m)}
        style={openMsg?.id === m.id ? { borderColor: COLORS.g500, background: COLORS.g50 } : undefined}
        right={m.read_at ? undefined : <Badge tone="brand">Nouveau</Badge>}
      >
        <span style={{
          display: "block", fontSize: FONT.sm, color: COLORS.ink2, marginTop: 5,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {m.body}
        </span>
      </ListRow>
    );

    const list = (
      <>
        {inbox.length === 0 ? (
          <Card>
            <EmptyState icon="📭" title="Aucun message">
              {isParent
                ? "L'école n'a pas encore envoyé de message vous concernant."
                : "Vous n'avez reçu aucun message pour le moment."}
            </EmptyState>
          </Card>
        ) : (
          <>
            {unread.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <CardLabel>Nouveaux ({unread.length})</CardLabel>
                <div style={{ display: "grid", gap: 8 }}>{unread.map(Row)}</div>
              </div>
            )}
            {read.length > 0 && (
              <div>
                <CardLabel>Historique</CardLabel>
                <div style={{ display: "grid", gap: 8 }}>{read.map(Row)}</div>
              </div>
            )}
          </>
        )}
      </>
    );

    const m = openMsg;
    const detail = m ? (
      <Card>
        {/* Le retour n'a de sens que sur téléphone : sur ordinateur la liste
            est restée affichée à côté. */}
        <button
          onClick={() => setOpenMsg(null)}
          className="ec-link ec-hide-wide"
          style={{ minHeight: 40, marginBottom: 14, textDecoration: "none", color: COLORS.ink2 }}
        >
          ‹ Retour à la boîte de réception
        </button>
        <h1 style={{ fontSize: FONT.lg, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.25 }}>
          {m.subject || "Sans objet"}
        </h1>
        <div style={{
          display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap",
          paddingBottom: 15, marginTop: 14, marginBottom: 16,
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <span aria-hidden="true" style={{
            width: 36, height: 36, borderRadius: 999, flex: "none",
            background: COLORS.g50, color: COLORS.g600,
            display: "grid", placeItems: "center", fontSize: FONT.md, fontWeight: 800,
          }}>
            {senderLabel(m).slice(0, 1).toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: FONT.md, fontWeight: 700, color: COLORS.ink }}>{senderLabel(m)}</div>
            <div style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 2 }}>
              {senderNames[m.sender_id]?.role
                ? `${senderNames[m.sender_id].role} · ${fmtDate(m.created_at)}`
                : fmtDate(m.created_at)}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: FONT.base, color: "#22262C", lineHeight: 1.65,
          whiteSpace: "pre-wrap", maxWidth: "66ch",
        }}>
          {m.body}
        </div>
        {m.link_url && (
          <div style={{ marginTop: 20 }}>
            {lessonLink(m) ? (
              <Button onClick={() => openLesson(Number(m.link_url))}>Ouvrir la leçon</Button>
            ) : (
              <a href={m.link_url} target="_blank" rel="noreferrer" className="ec-link" style={{ fontSize: FONT.md }}>
                Ouvrir le lien ↗
              </a>
            )}
          </div>
        )}

        {/* RÉPONSE À UN MESSAGE DE LA BOÎTE DE DIALOGUE (2026-10-01).
            Seulement pour l'administrateur, et seulement sur un message qui
            vient de ce canal (`audience === "admin"`). La réponse reste dans
            le MÊME fil et, surtout, SANS `school_id` : c'est lui qui tient la
            confidentialité vis-à-vis de la direction. L'ajouter ici ouvrirait
            tout l'échange à l'école, rétroactivement. */}
        {isAdmin && m.audience === "admin" && m.sender_id && (
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${COLORS.border}` }}>
            <CardLabel>Répondre</CardLabel>
            <label htmlFor="ec-admin-reply" className="ec-sr">Votre réponse</label>
            <textarea
              id="ec-admin-reply"
              value={adminReply}
              onChange={(e) => setAdminReply(e.target.value)}
              rows={3}
              placeholder="Votre réponse arrive dans sa fenêtre de dialogue…"
              style={{
                width: "100%", boxSizing: "border-box", resize: "vertical", marginTop: 8,
                padding: "11px 13px", fontFamily: "inherit", fontSize: FONT.md, color: COLORS.ink,
                border: `1px solid ${COLORS.border2}`, borderRadius: 10, background: COLORS.card,
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <Button onClick={() => repondreAdmin(m)} disabled={adminSending || !adminReply.trim()}>
                {adminSending ? "Envoi…" : "Envoyer la réponse"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    ) : (
      <Card>
        <EmptyState icon="✉" title="Aucun message ouvert">
          Choisissez un message dans la liste pour le lire ici.
        </EmptyState>
      </Card>
    );

    return (
      <div>
        <h1 className="ec-h1">Boîte de réception</h1>
        <p className="ec-sub">
          {isParent ? "Les messages de l'école au sujet de votre enfant." : "Vos messages."}
        </p>

        {/* LOT D — l'autre moitié de l'avertissement, ne pas retirer.
            Les parents ne rédigent pas de message, donc la phrase ne peut pas
            vivre sur le composeur : elle vit ici, là où ils lisent. Les deux
            côtés doivent savoir, sinon la vue de la direction devient une
            surveillance non annoncée. */}
        {isParent && (
          <p style={{
            fontSize: FONT.sm, color: COLORS.ink2, lineHeight: 1.55, marginTop: 12,
            background: COLORS.g50, border: `1px solid ${COLORS.g200}`,
            borderRadius: 8, padding: "10px 12px",
          }}>
            La direction de l'école a accès aux messages échangés entre les
            enseignants et les parents.
          </p>
        )}

        {!isParent && (
          <div style={{ marginTop: 14 }}>
            {!composeOpen ? (
              <Button onClick={openComposer}>✉ Nouveau message</Button>
            ) : (
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                  <CardLabel>Nouveau message</CardLabel>
                  <button className="ec-link" style={{ color: COLORS.ink3 }} onClick={() => { setComposeOpen(false); setCMsg(""); }}>Fermer</button>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(isSchoolAdmin || isAdmin) && (
                    <label style={{ display: "block" }}>
                      <span style={{ display: "block", fontSize: FONT.sm, fontWeight: 700, color: COLORS.ink2, marginBottom: 4 }}>Destinataire</span>
                      <select className="ec-input" value={cAudience}
                        onChange={(e) => { setCAudience(e.target.value); setCRecipient(""); setCQuery(""); }}>
                        <option value="parent">Un parent d'élève</option>
                        <option value="staff">{isAdmin ? "Un membre du personnel (enseignant / direction)" : "Un enseignant de l'école"}</option>
                      </select>
                    </label>
                  )}
                  {/* ─── CHOIX DU DESTINATAIRE — champ de recherche + liste filtrée ───
                      Corrigé le 2026-09-30 sur signalement de Maxime. C'était une
                      liste déroulante `<select>` ordinaire : on ne peut pas y TAPER
                      un nom, le navigateur saute seulement à la première lettre. Avec
                      246 élèves, il fallait dérouler à la main.

                      Le `<select>` est CONSERVÉ pour le choix lui-même — on ne filtre
                      que ce qu'il contient. C'est volontaire : il reste utilisable au
                      clavier, et sur téléphone il ouvre le sélecteur natif d'Android
                      et d'iOS, qu'aucune liste faite maison n'égale.

                      ⚠️ Le champ de recherche ne doit PAS perdre le focus à chaque
                      frappe. Il le garde parce que `MessagesInbox` est APPELÉE
                      (`MessagesInbox()`) et non montée en `<MessagesInbox/>`, et que
                      son état vit dans le composant parent. Piège React déjà payé
                      quatre fois : ne pas transformer ce bloc en composant défini
                      dans le render. */}
                  {(() => {
                    const staffLabel = (t) =>
                      (t.full_name || t.id)
                      + (t.role === "school_admin" ? " · directeur" : t.role === "referent" ? " · référent" : " · enseignant");
                    const isParentAudience = cAudience === "parent";
                    const source = isParentAudience ? cStudents : cStaff;
                    // Nom + classe (+ école, + code parent en dernier recours) :
                    // voir `composeStudentLabels`. La recherche porte sur ce
                    // libellé complet, donc taper « CM1 A » filtre la classe
                    // entière, et taper un code trouve l'élève directement.
                    const studentLabels = isParentAudience ? composeStudentLabels() : null;
                    const labelOf = isParentAudience
                      ? ((s) => studentLabels[s.id] || s.full_name || "")
                      : staffLabel;

                    const q = cQuery.trim().toLowerCase();
                    const shown = q ? source.filter((x) => labelOf(x).toLowerCase().includes(q)) : source;

                    // Recherche affichée seulement quand elle sert : sous une dizaine
                    // d'entrées, un champ de plus est du bruit.
                    const searchable = source.length > 8;

                    const label = (
                      <span style={{ display: "block", fontSize: FONT.sm, fontWeight: 700, color: COLORS.ink2, marginBottom: 4 }}>
                        {isParentAudience
                          ? (isSchoolAdmin || isAdmin ? "Familles destinataires (le parent lié de chaque élève recevra le message)" : "Élèves de votre classe (le parent de chacun recevra le message)")
                          : "Destinataire"}
                      </span>
                    );

                    if (source.length === 0) {
                      return (
                        <div>
                          {label}
                          <div style={{ fontSize: FONT.sm, color: COLORS.ink3 }}>
                            {isParentAudience ? "Aucun élève à afficher." : "Aucun destinataire à afficher."}
                          </div>
                        </div>
                      );
                    }

                    const search = searchable && (
                      <input
                        className="ec-input"
                        type="search"
                        value={cQuery}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCQuery(value);
                          setCConfirm(null);   // le résumé confirmé ne vaut plus rien si la liste change
                          // Audience personnel : un seul destinataire, donc un
                          // résultat unique se choisit tout de suite. Fait ICI, dans
                          // le gestionnaire de saisie, et jamais pendant le rendu —
                          // un effet de bord au rendu se rejouerait à chaque passage.
                          if (isParentAudience) return;
                          const vq = value.trim().toLowerCase();
                          if (!vq) return;
                          const m = source.filter((x) => labelOf(x).toLowerCase().includes(vq));
                          if (m.length === 1) setCRecipient(m[0].id);
                          else if (cRecipient && !m.some((y) => y.id === cRecipient)) setCRecipient("");
                        }}
                        placeholder={isParentAudience ? "Tapez un nom d'élève pour filtrer…" : "Tapez un nom pour filtrer…"}
                        aria-label={isParentAudience ? "Rechercher un élève" : "Rechercher un destinataire"}
                        style={{ marginBottom: 6 }}
                      />
                    );

                    // ─── PERSONNEL : un seul destinataire, liste déroulante ─────────
                    // Le `<select>` natif est conservé : il reste utilisable au clavier
                    // et ouvre le sélecteur d'Android et d'iOS sur téléphone.
                    if (!isParentAudience) {
                      const selected = source.find((x) => x.id === cRecipient);
                      const list = (selected && !shown.some((x) => x.id === selected.id))
                        ? [selected, ...shown]   // le choix courant reste visible hors filtre
                        : shown;
                      return (
                        <label style={{ display: "block" }}>
                          {label}
                          {search}
                          <select className="ec-input" value={cRecipient} onChange={(e) => setCRecipient(e.target.value)}>
                            <option value="">— choisir un destinataire —</option>
                            {list.map((x) => <option key={x.id} value={x.id}>{labelOf(x)}</option>)}
                          </select>
                          {searchable && q && (
                            <span style={{ display: "block", fontSize: FONT.sm, color: shown.length === 0 ? COLORS.crit : COLORS.ink3, marginTop: 4 }}>
                              {shown.length === 0 ? "Aucun nom ne correspond."
                                : shown.length === 1 ? "1 résultat — déjà sélectionné."
                                  : `${shown.length} résultats`}
                            </span>
                          )}
                        </label>
                      );
                    }

                    // ─── FAMILLES : plusieurs destinataires, cases à cocher ─────────
                    // Pas de `<select multiple>` : sur téléphone comme sur ordinateur
                    // il exige de garder Ctrl enfoncé et se dé-sélectionne au moindre
                    // clic de travers. Des cases à cocher ne trompent personne.
                    const picked = new Set(cRecipients);
                    const shownIds = shown.map((s) => s.id);
                    const allShownPicked = shownIds.length > 0 && shownIds.every((id) => picked.has(id));
                    const withPhone = cRecipients.filter(
                      (id) => (source.find((s) => s.id === id) || {}).has_parent_contact).length;

                    const toggle = (id) => {
                      setCConfirm(null);
                      setCRecipients((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
                    };
                    const toggleAllShown = () => {
                      setCConfirm(null);
                      setCRecipients((prev) => allShownPicked
                        ? prev.filter((id) => !shownIds.includes(id))
                        : Array.from(new Set([...prev, ...shownIds])));
                    };

                    return (
                      <div>
                        {label}
                        {search}

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                          <button className="ec-link" onClick={toggleAllShown} style={{ fontSize: FONT.sm, fontWeight: 700 }}>
                            {allShownPicked
                              ? `Décocher les ${shownIds.length} affichés`
                              : `Cocher les ${shownIds.length} affichés${q ? "" : " (toute la liste)"}`}
                          </button>
                          {cRecipients.length > 0 && (
                            <button className="ec-link" onClick={() => { setCRecipients([]); setCConfirm(null); }}
                              style={{ fontSize: FONT.sm, color: COLORS.ink3 }}>
                              Tout décocher
                            </button>
                          )}
                        </div>

                        <div style={{
                          maxHeight: 220, overflowY: "auto",
                          border: `1px solid ${COLORS.g200}`, borderRadius: 8, padding: 4,
                        }}>
                          {shown.length === 0 ? (
                            <div style={{ fontSize: FONT.sm, color: COLORS.crit, padding: "8px 10px" }}>
                              Aucun nom ne correspond.
                            </div>
                          ) : shown.map((s) => (
                            <label key={s.id} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "7px 10px", borderRadius: 6, cursor: "pointer",
                              background: picked.has(s.id) ? COLORS.g50 : "transparent",
                            }}>
                              <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)}
                                style={{ width: 17, height: 17, flex: "0 0 auto" }} />
                              <span style={{ fontSize: FONT.md, color: COLORS.ink, flex: 1, minWidth: 0 }}>
                                {/* Le nom en gras, ce qui le distingue en discret :
                                    on lit d'abord l'élève, la classe ne sert qu'à
                                    trancher entre homonymes. */}
                                <strong style={{ fontWeight: 650 }}>{s.full_name}</strong>
                                {labelOf(s) !== s.full_name && (
                                  <span style={{ color: COLORS.ink3, fontWeight: 400 }}>
                                    {labelOf(s).slice((s.full_name || "").length)}
                                  </span>
                                )}
                              </span>
                              {/* Pas de numéro = message dans l'application seulement.
                                  Dit ici, pas découvert après l'envoi. */}
                              {!s.has_parent_contact && (
                                <span style={{ fontSize: FONT.sm, color: COLORS.ink3, flex: "0 0 auto" }}>
                                  pas de numéro
                                </span>
                              )}
                            </label>
                          ))}
                        </div>

                        <span style={{ display: "block", fontSize: FONT.sm, color: COLORS.ink2, marginTop: 6, fontWeight: 650 }}>
                          {cRecipients.length === 0
                            ? "Aucune famille sélectionnée."
                            : `${cRecipients.length} famille${cRecipients.length > 1 ? "s" : ""} sélectionnée${cRecipients.length > 1 ? "s" : ""}`}
                          {cRecipients.length > 0 && WHATSAPP_ENABLED && cNotifyWa && (
                            <span style={{ color: COLORS.ink3, fontWeight: 400 }}>
                              {" · "}{withPhone} recevra{withPhone > 1 ? "ont" : ""} un WhatsApp
                              {cRecipients.length - withPhone > 0 ? `, ${cRecipients.length - withPhone} sans numéro` : ""}
                            </span>
                          )}
                        </span>

                        {WHATSAPP_ENABLED && (
                          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer" }}>
                            <input type="checkbox" checked={cNotifyWa}
                              onChange={(e) => { setCNotifyWa(e.target.checked); setCConfirm(null); }}
                              style={{ width: 17, height: 17 }} />
                            <span style={{ fontSize: FONT.sm, color: COLORS.ink2 }}>
                              Prévenir aussi par WhatsApp — sinon le message n'existe que dans l'application
                            </span>
                          </label>
                        )}
                      </div>
                    );
                  })()}
                  <input className="ec-input" placeholder="Objet" value={cSubject} onChange={(e) => setCSubject(e.target.value)} maxLength={140} />
                  <textarea className="ec-input" placeholder="Votre message…" value={cBody} onChange={(e) => setCBody(e.target.value)} rows={5} style={{ resize: "vertical" }} />
                  {/* LOT D — AVERTISSEMENT OBLIGATOIRE, ne pas retirer.
                      La direction peut lire les messages enseignant → parent.
                      Une surveillance non annoncée est un problème, pas une
                      fonctionnalité : la phrase doit être visible AU MOMENT
                      d'écrire, pas enfouie dans un règlement. Elle ne s'affiche
                      pas pour l'administrateur, dont les messages sont exclus de
                      cette vue, ni pour la direction elle-même. */}
                  {cAudience === "parent" && !isAdmin && !isSchoolAdmin && (
                    <p style={{
                      fontSize: FONT.sm, color: COLORS.ink2, lineHeight: 1.55,
                      background: COLORS.g50, border: `1px solid ${COLORS.g200}`,
                      borderRadius: 8, padding: "10px 12px", margin: 0,
                    }}>
                      La direction de votre école a accès aux messages échangés entre
                      les enseignants et les parents.
                    </p>
                  )}
                  {cAudience === "parent" && (
                    <input className="ec-input" placeholder="Lien (n° de leçon ou URL) — optionnel" value={cLink} onChange={(e) => setCLink(e.target.value)} />
                  )}
                  {/* Confirmation d'un envoi groupé — elle dit les NOMBRES, parce
                      qu'un message envoyé ne se rappelle pas et que chaque envoi
                      WhatsApp coûte. Toute modification de la sélection l'efface :
                      un résumé confirmé ne doit jamais survivre à ce qu'il décrit. */}
                  {cConfirm && (
                    <div style={{
                      border: `1px solid ${COLORS.g200}`, background: COLORS.g50,
                      borderRadius: 8, padding: "12px 14px",
                    }}>
                      <p style={{ fontSize: FONT.md, color: COLORS.ink, margin: 0, lineHeight: 1.5, fontWeight: 650 }}>
                        Envoyer ce message à <strong>{cConfirm.families} familles</strong> ?
                      </p>
                      <p style={{ fontSize: FONT.sm, color: COLORS.ink2, margin: "6px 0 0", lineHeight: 1.5 }}>
                        {cConfirm.wa > 0
                          ? <>Cela déclenchera <strong>{cConfirm.wa} envoi{cConfirm.wa > 1 ? "s" : ""} WhatsApp</strong>. Un message envoyé ne peut pas être rappelé.</>
                          : <>Aucun WhatsApp ne partira — le message n'existera que dans l'application.</>}
                      </p>
                      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                        <Button onClick={sendNewMessage} disabled={cSending}>
                          {cSending ? "Envoi…" : `Confirmer l'envoi à ${cConfirm.families} familles`}
                        </Button>
                        <Button variant="ghost" onClick={() => setCConfirm(null)}>Revenir</Button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Button onClick={askSendMessage}
                      disabled={cSending || !!cConfirm || !cSubject.trim() || !cBody.trim() || composeTargets().length === 0}>
                      {cSending ? "Envoi…"
                        : composeTargets().length > 1 ? `Envoyer à ${composeTargets().length} familles`
                          : "Envoyer"}
                    </Button>
                    {cMsg && <span style={{ fontSize: FONT.sm, fontWeight: 700, color: cMsg.startsWith("Erreur") ? COLORS.crit : COLORS.g600 }}>{cMsg}</span>}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        <div className="ec-grid" style={{ marginTop: 18 }}>
          {/* Quand un message est ouvert, la liste disparaît sur téléphone
              seulement ; le volet de lecture, lui, n'apparaît sur téléphone
              que s'il y a quelque chose à lire. */}
          <div className={`ec-c5${openMsg ? " ec-deskonly" : ""}`}>{list}</div>
          <div className={`ec-c7${openMsg ? "" : " ec-deskonly"}`}>{detail}</div>
        </div>
      </div>
    );
  };

  // ============ ÉCHANGES DE L'ÉCOLE (direction et référent) — LOT D ============
  // Demande de la direction : voir toute communication enseignant → parent.
  //
  // ⚠️ AUCUNE ÉCRITURE ICI. Ce volet n'appelle jamais `openMessage()`, qui pose
  // `read_at` — l'accusé de lecture DU PARENT. Le seul repère écrit est
  // `exchange_marks`, propre à chaque directeur. Si quelqu'un ajoute un jour un
  // `update` sur `messages` dans cette vue, l'enseignante verra « lu » sur des
  // messages que le parent n'a jamais ouverts.
  //
  // ⚠️ Appelée — `{screen === "exchanges" && ExchangesView()}` — et non montée
  // en `<ExchangesView/>`, parce qu'un composant défini dans le render et monté
  // en JSX est une nouvelle identité à chaque rendu : React démonte tout et les
  // champs perdent le focus. Piège déjà payé QUATRE fois sur ce fichier. Elle
  // n'utilise donc AUCUN hook : si elle en gagne un, il faut la sortir au
  // niveau module, surtout pas la remettre en `<Élément/>`.
  const ExchangesView = () => {
    const fmtDate = (s) => (s || "").slice(0, 10);
    const roleLabel = (r) => (r === "school_admin" ? "directeur" : r === "referent" ? "référent" : "enseignant");
    const isNew = (m) => !exchSeenAt || (m.created_at && m.created_at > exchSeenAt);

    // ─── REGROUPEMENT DES ENVOIS MULTIPLES ──────────────────────────────────
    // Une annonce envoyée à douze familles, ce sont douze lignes en base — il
    // le faut, chaque parent ayant besoin de la sienne. Mais les afficher une
    // par une rendrait cet écran illisible en une semaine. Les lignes qui
    // partagent `batch_id` sont donc pliées en une seule entrée « → 12
    // familles ». Un message individuel n'a pas de `batch_id` : il reste seul.
    const groups = [];
    const byBatch = new Map();
    for (const m of exchanges) {
      if (!m.batch_id) { groups.push({ key: m.id, head: m, members: [m] }); continue; }
      const existing = byBatch.get(m.batch_id);
      if (existing) { existing.members.push(m); continue; }
      const g = { key: m.batch_id, head: m, members: [m] };
      byBatch.set(m.batch_id, g);
      groups.push(g);
    }

    // Compté en ENVOIS, comme le reste de l'écran : une annonce à douze familles
    // est UNE nouveauté pour le directeur, pas douze.
    const newGroups = groups.filter((g) => isNew(g.head)).length;

    const who = (g) => {
      if (g.members.length > 1) return `→ ${g.members.length} familles`;
      return g.head.student_name ? `→ parent de ${g.head.student_name}` : "";
    };

    const Row = (g) => {
      const m = g.head;
      return (
        <ListRow
          key={g.key}
          icon={(m.sender_name || "?").slice(0, 1).toUpperCase()}
          iconColor={isNew(m) ? COLORS.g500 : undefined}
          title={m.subject || "Sans objet"}
          meta={`${m.sender_name} · ${roleLabel(m.sender_role)}${who(g) ? " " + who(g) : ""} · ${fmtDate(m.created_at)}`}
          onClick={() => openExchange(g)}
          style={openExch?.key === g.key ? { borderColor: COLORS.g500, background: COLORS.g50 } : undefined}
          right={isNew(m) ? <Badge tone="brand">Nouveau</Badge> : undefined}
        >
          <span style={{
            display: "block", fontSize: FONT.sm, color: COLORS.ink2, marginTop: 5,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {m.body}
          </span>
        </ListRow>
      );
    };

    const detail = !openExch ? (
      <Card>
        <EmptyState icon="✉" title="Choisissez un échange">
          Le texte complet du message s'affichera ici.
        </EmptyState>
      </Card>
    ) : (
      <Card>
        <div className="ec-cardhd">
          <h2 className="ec-cardtitle">{openExch.head.subject || "Sans objet"}</h2>
          <button className="ec-more ec-link" style={{ textDecoration: "none" }} onClick={() => setOpenExch(null)}>
            Fermer
          </button>
        </div>
        <p style={{ fontSize: FONT.sm, color: COLORS.ink3, marginBottom: 12 }}>
          De <strong style={{ color: COLORS.ink2 }}>{openExch.head.sender_name}</strong> ({roleLabel(openExch.head.sender_role)})
          {openExch.members.length > 1
            ? <> à <strong style={{ color: COLORS.ink2 }}>{openExch.members.length} familles</strong></>
            : (openExch.head.student_name ? <> au parent de <strong style={{ color: COLORS.ink2 }}>{openExch.head.student_name}</strong></> : null)}
          {" · "}{fmtDate(openExch.head.created_at)}
        </p>

        {/* Un envoi groupé dit QUI l'a reçu : « 12 familles » sans les noms
            n'aiderait pas une direction qui veut savoir si telle famille a été
            prévenue. */}
        {openExch.members.length > 1 && (
          <p style={{ fontSize: FONT.sm, color: COLORS.ink2, marginBottom: 12, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700 }}>Familles concernées : </span>
            {openExch.members.map((m) => m.student_name || "élève").join(", ")}
          </p>
        )}

        <p style={{ fontSize: FONT.md, color: COLORS.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {openExch.head.body}
        </p>
        {/* On n'affiche PAS de bouton « répondre » : cette vue sert à être au
            courant, pas à s'immiscer dans un échange. Pour écrire au parent, la
            direction passe par la messagerie, et son message sera un message
            d'elle — pas une réponse glissée dans la conversation d'un autre. */}
        <p style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 14 }}>
          Consulter cet échange ne le marque pas comme lu pour le parent.
        </p>
      </Card>
    );

    return (
      <div>
        <h1 className="ec-h1">Échanges de l'école</h1>
        <p className="ec-sub">
          Tous les messages envoyés aux parents par les enseignants et la direction
          de {schoolContext?.name || "l'école"}. Les messages de la plateforme EduCam
          n'y figurent pas.
        </p>

        <Card style={{ marginTop: 14, borderColor: COLORS.g200, background: COLORS.g50 }}>
          <p style={{ fontSize: FONT.sm, color: COLORS.ink2, lineHeight: 1.6, margin: 0 }}>
            <strong>Cette vue est connue des enseignants et des parents.</strong> Les deux
            voient, au moment d'écrire et de lire, que la direction a accès aux
            échanges enseignant-parent. Consulter un message ici ne modifie rien :
            l'accusé de lecture du parent n'est pas touché.
          </p>
        </Card>

        <div className="ec-grid" style={{ marginTop: 18 }}>
          <div className={`ec-c5${openExch ? " ec-deskonly" : ""}`}>
            {groups.length === 0 ? (
              <Card>
                <EmptyState icon="📭" title="Aucun échange">
                  Aucun message n'a encore été envoyé à un parent dans votre école.
                </EmptyState>
              </Card>
            ) : (
              <>
                {/* On compte les ENVOIS, pas les lignes : une annonce à douze
                    familles est un envoi, et l'annoncer « 12 messages » ferait
                    croire à douze conversations distinctes. */}
                <CardLabel>
                  {groups.length} envoi{groups.length > 1 ? "s" : ""}
                  {exchanges.length !== groups.length ? ` · ${exchanges.length} messages` : ""}
                  {newGroups > 0 ? ` · ${newGroups} nouveau${newGroups > 1 ? "x" : ""}` : ""}
                </CardLabel>
                {groups.map(Row)}
              </>
            )}
          </div>
          <div className={`ec-c7${openExch ? "" : " ec-deskonly"}`}>{detail}</div>
        </div>
      </div>
    );
  };

  // ============ CALENDAR VIEW ============
  const CalendarView = () => {
    const isIntegrationWeek = selectedWeek === 4;
    const daySlots = getDaySlots(selectedDay).slice().sort(
      (a, b) => (a.slot_order || 0) - (b.slot_order || 0)
        || (toMinutes(a.start_time) || 0) - (toMinutes(b.start_time) || 0));

    // Le surlignage « en cours » n'a de sens que si le jour affiché est
    // réellement aujourd'hui.
    const showingToday = todayDow !== 0 && selectedDay === todayDow;

    const weekIds = Array.from(new Set((timetable || [])
      .map((sl) => getQueuedLesson(sl.subject_id, sl.component_id))
      .filter(Boolean).map((l) => l.id)));
    const already = weekIds.filter((id) => cachedIds.includes(id)).length;
    const downloading = dl && !dl.finished;
    const toDownload = weekIds.filter((id) => !cachedIds.includes(id)).length;

    return (
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 className="ec-h1">Emploi du temps</h1>
            <p className="ec-sub">
              {isParent
                ? `${selectedLevel.name}${parentStudent?.full_name ? " · " + parentStudent.full_name : ""} — les leçons à venir restent verrouillées`
                : `${selectedLevel.name} — ${selectedLevel.full}`}
            </p>
          </div>
          {!isParent && !isAdmin && !isSchoolAdmin && (
            <button
              type="button"
              className="ec-btn ec-btn--ghost"
              onClick={() => setScreen("timetable")}
            >
              Modifier mon emploi du temps
            </button>
          )}          {!isParent && (
            <div>
              <label htmlFor="ec-cal-level" className="ec-sr">Niveau</label>
              <select
                id="ec-cal-level"
                className="ec-input"
                value={selectedLevel.id}
                onChange={(e) => setSelectedLevel(LEVELS.find(l => l.id === e.target.value))}
                style={{ width: "auto", minHeight: 42, padding: "9px 12px", fontSize: "var(--ec-fs-3)", fontWeight: 600 }}
              >
                {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name} — {l.primary}</option>)}
              </select>
            </div>
          )}
        </div>

        <RetardNotice
          retard={retard}
          mois={moisCourant}
          vendrediLibre={true}
          onAjuster={() => setScreen("timetable")}
        />

        {/* ---- Période (unité / mois) ---- */}
        <div className="ec-grid" style={{ marginTop: 18 }}>
          <div className="ec-c4">
        <div>
          <CardLabel>Période</CardLabel>
          <Tabs
            ariaLabel="Choisir le mois"
            value={selectedUnit}
            onChange={(u) => { setSelectedUnit(u); setSelectedWeek(1); }}
            items={MONTH_UNIT_MAP.map((m) => ({ key: m.unit, label: m.month }))}
          />
        </div>

        {/* ---- Centre d'intérêt ---- */}
        <Card style={{ marginTop: 14, background: COLORS.g50, borderColor: COLORS.g200 }}>
          <div style={{
            fontSize: FONT.xs, color: COLORS.g700, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: ".08em",
          }}>
            Centre d'intérêt {selectedUnit}
          </div>
          <div style={{ fontSize: "var(--ec-fs-5)", fontWeight: 800, color: COLORS.ink, marginTop: 5, letterSpacing: "-.02em" }}>
            {THEMES[selectedUnit - 1]}
          </div>
          <div style={{ fontSize: FONT.sm, color: COLORS.g800, opacity: .8, marginTop: 3 }}>
            {MONTH_UNIT_MAP[selectedUnit - 1]?.month} · {selectedLevel.name}
          </div>
        </Card>

        {/* ---- Semaine ---- */}
        <div style={{ marginTop: 16 }}>
          <CardLabel>Semaine</CardLabel>
          <Tabs
            ariaLabel="Choisir la semaine"
            value={selectedWeek}
            onChange={setSelectedWeek}
            items={[1, 2, 3, 4].map((w) => ({
              key: w,
              label: w === 4 ? "Sem. 4 — Évaluation" : `Semaine ${w}`,
            }))}
          />
        </div>

        {/* ---- Téléchargement hors ligne ---- */}
        {OFFLINE_ENABLED && !isParent && !isIntegrationWeek && (
          <Card style={{ marginTop: 16 }}>
            <CardLabel>Hors ligne</CardLabel>
            {weekIds.length === 0 ? (
              <p style={{ fontSize: FONT.sm, color: COLORS.ink3, lineHeight: 1.5 }}>
                Aucune leçon disponible pour cette semaine pour le moment.
              </p>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: FONT.md, fontWeight: 700 }}>
                    {weekIds.length} leçon{weekIds.length > 1 ? "s" : ""} cette semaine
                  </span>
                  <span style={{ fontSize: FONT.sm, color: COLORS.ink3 }}>
                    {already}/{weekIds.length} déjà téléchargée{already > 1 ? "s" : ""}
                  </span>
                </div>
                <p style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, lineHeight: 1.5, marginBottom: 11 }}>
                  {/* Le poids exact n'est connu qu'au téléchargement : on annonce un
                      ordre de grandeur pour que l'enseignante décide en connaissance
                      de cause, sur des données payantes. */}
                  Estimation : environ {(Math.max(toDownload, 0) * 0.35).toFixed(1).replace(".", ",")} Mo à télécharger · vidéos comprises
                </p>
                <Button
                  block
                  onClick={handleDownloadWeek}
                  disabled={downloading || !online || toDownload === 0}
                >
                  {downloading
                    ? `Téléchargement… ${dl.done}/${dl.total}`
                    : toDownload === 0
                      ? "Toutes les leçons sont déjà téléchargées"
                      : `Télécharger ${toDownload} leçon${toDownload > 1 ? "s" : ""}`}
                </Button>
                {downloading && (
                  <div style={{ height: 8, background: COLORS.track, borderRadius: 999, overflow: "hidden", marginTop: 10 }}>
                    <span style={{
                      display: "block", height: "100%", borderRadius: 999, background: COLORS.g500,
                      width: `${dl.total ? Math.round((dl.done / dl.total) * 100) : 0}%`,
                    }} />
                  </div>
                )}
                {dl && dl.finished && !dl.empty && (
                  <Callout tone="brand" icon="✓" style={{ marginTop: 11 }}>
                    {dl.total} leçon{dl.total > 1 ? "s" : ""} disponible{dl.total > 1 ? "s" : ""} hors ligne —
                    {" "}{dl.fresh || 0} nouvelle{(dl.fresh || 0) > 1 ? "s" : ""},
                    {" "}{dl.updated || 0} mise{(dl.updated || 0) > 1 ? "s" : ""} à jour,
                    {" "}{dl.uptodate || 0} déjà à jour
                    {dl.failed ? `, ${dl.failed} échec${dl.failed > 1 ? "s" : ""}` : ""}.
                    {/* Un fichier remplacé sous le même nom est le cas qu'on ne
                        voyait pas passer : on le NOMME quand il se produit. */}
                    {dl.mediaReplaced ? ` ${dl.mediaReplaced} vidéo${dl.mediaReplaced > 1 ? "s" : ""} remplacée${dl.mediaReplaced > 1 ? "s" : ""} par une version plus récente.` : ""}
                  </Callout>
                )}
                {dl && dl.finished && !dl.empty && dl.registryOff && (
                  <Callout tone="warn" icon="⚠" style={{ marginTop: 11 }}>
                    Les textes sont à jour, mais le registre des médias n'a pas répondu :
                    impossible de vérifier si une image ou une vidéo a été remplacée depuis.
                    Relancez le téléchargement une fois la connexion stable.
                  </Callout>
                )}
                {!online && (
                  <Callout tone="warn" icon="📡" style={{ marginTop: 11 }}>
                    Téléchargement impossible hors ligne.
                  </Callout>
                )}
              </>
            )}
          </Card>
        )}
          </div>
          <div className="ec-c8">

        {isIntegrationWeek ? (
          <Card style={{ marginTop: 18, background: COLORS.warnBg, borderColor: "#F5D9A8" }}>
            <div style={{ textAlign: "center", padding: "12px 4px" }}>
              <div aria-hidden="true" style={{ fontSize: "var(--ec-fs-7)", marginBottom: 10 }}>📝</div>
              <h2 style={{ fontSize: "var(--ec-fs-4)", fontWeight: 800, color: COLORS.warn, marginBottom: 8 }}>
                Semaine d'intégration et d'évaluation
              </h2>
              <p style={{ fontSize: FONT.md, color: COLORS.warn, lineHeight: 1.6, maxWidth: "52ch", margin: "0 auto" }}>
                Cette semaine est consacrée à la mobilisation des ressources, aux activités
                d'évaluation des compétences et aux remédiations pour le centre d'intérêt :
                {" "}{THEMES[selectedUnit - 1]}.
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* ---- Bande de jours ---- */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", margin: "20px 0 6px", paddingBottom: 3 }}>
              {[1, 2, 3, 4, 5].map((d) => {
                const on = selectedDay === d;
                const isToday = todayDow === d;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    aria-pressed={on}
                    style={{
                      flex: "1 1 0", minWidth: 62, minHeight: 58, padding: "8px 4px",
                      borderRadius: 10, border: `1px solid ${on ? COLORS.g500 : COLORS.border}`,
                      background: on ? COLORS.g500 : COLORS.card,
                      color: on ? "#fff" : COLORS.ink, textAlign: "center",
                    }}
                  >
                    <span style={{ display: "block", fontSize: isMobile ? 15 : 14.5, fontWeight: 800 }}>
                      {isMobile ? DAY_NAMES_SHORT[d] : DAY_NAMES[d]}
                    </span>
                    {isToday && (
                      <span style={{
                        display: "block", fontSize: "var(--ec-fs-1)", fontWeight: 700, marginTop: 2,
                        color: on ? "rgba(255,255,255,.85)" : COLORS.g600,
                      }}>aujourd'hui</span>
                    )}
                  </button>
                );
              })}
            </div>

            <h2 style={{ fontSize: "var(--ec-fs-4)", fontWeight: 800, letterSpacing: "-.02em", margin: "18px 0 12px" }}>
              {DAY_NAMES[selectedDay]} — Semaine {selectedWeek}
            </h2>

            {loadingData ? (
              <SkeletonRows rows={4} />
            ) : daySlots.length === 0 ? (
              <Card>
                <EmptyState icon="🗓" title="Aucun créneau ce jour">
                  L'emploi du temps n'est pas encore renseigné pour ce niveau.
                </EmptyState>
              </Card>
            ) : (
              /* Agenda avec gouttière d'heures : la colonne de gauche donne le
                 repère temporel, la ligne verticale relie la journée. */
              <div style={{ display: "grid", gridTemplateColumns: "52px 1fr" }}>
                {daySlots.map((slot, i) => {
                  const topic = getTopic(selectedUnit, selectedWeek, slot.subject_id, slot.component_id);
                  const color = getSubjectColor(slot.subject_id);
                  const tt = isTeacherTaught(slot.subject_id);
                  const lesson = (topic && !tt) ? getQueuedLesson(slot.subject_id, slot.component_id) : null;
                  const st = toMinutes(slot.start_time), en = toMinutes(slot.end_time);
                  const isNow = showingToday && st != null && en != null && minutesNow >= st && minutesNow < en;
                  const isPast = showingToday && en != null && minutesNow >= en;

                  return (
                    <Fragment key={slot.id || i}>
                      <div style={{
                        fontSize: "var(--ec-fs-1)", color: COLORS.ink3, fontWeight: 600,
                        paddingTop: 16, fontVariantNumeric: "tabular-nums",
                      }}>
                        {String(slot.start_time || "").slice(0, 5)}
                      </div>
                      <div style={{
                        borderLeft: `2px solid ${COLORS.border}`,
                        padding: "0 0 12px 14px", position: "relative",
                      }}>
                        <span aria-hidden="true" style={{
                          position: "absolute", left: -6, top: 17, width: 10, height: 10,
                          borderRadius: 999, border: `2px solid ${COLORS.page}`,
                          background: isNow ? COLORS.g500 : COLORS.border2,
                        }} />
                        <div
                          className={lesson ? "ec-row" : undefined}
                          onClick={lesson ? () => openLesson(lesson.id) : undefined}
                          role={lesson ? "button" : undefined}
                          tabIndex={lesson ? 0 : undefined}
                          onKeyDown={lesson ? (e) => {
                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLesson(lesson.id); }
                          } : undefined}
                          style={{
                            display: "block", marginTop: 8, padding: 13,
                            background: COLORS.card, borderRadius: 10,
                            border: `1px solid ${isNow ? COLORS.g500 : COLORS.border}`,
                            boxShadow: isNow ? `0 0 0 2px ${COLORS.g100}` : "none",
                            opacity: isPast ? .72 : 1,
                            cursor: lesson ? "pointer" : "default",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span aria-hidden="true" style={{
                              width: 9, height: 9, borderRadius: 999, background: color, flex: "none",
                            }} />
                            <span style={{ fontSize: FONT.md, fontWeight: 700, color: COLORS.ink }}>
                              {slot.subject_name}
                            </span>
                            {slot.component_name && (
                              <span style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3 }}>· {slot.component_name}</span>
                            )}
                          </div>
                          <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 4 }}>
                            {String(slot.start_time || "").slice(0, 5)} – {String(slot.end_time || "").slice(0, 5)}
                            {isNow ? " · en cours" : isPast ? " · terminée" : ""}
                          </div>

                          {tt ? (
                            <div style={{ marginTop: 9 }}>
                              <Badge tone="neutral">Enseignée par l'enseignant(e)</Badge>
                              <div style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 6, lineHeight: 1.5 }}>
                                Cette matière n'est pas couverte par la plateforme ; elle est enseignée directement par l'enseignant(e).
                              </div>
                            </div>
                          ) : topic ? (
                            <>
                              <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 600, color: COLORS.ink, marginTop: 8 }}>
                                {topic.topic_title}
                              </div>
                              {topic.topic_description && (
                                <div style={{ fontSize: FONT.sm, color: COLORS.ink2, marginTop: 3, lineHeight: 1.5 }}>
                                  {topic.topic_description}
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>
                                {lesson ? (
                                  <>
                                    {lesson.taught
                                      ? <Badge tone="brand">✓ Déjà enseignée</Badge>
                                      : <Badge tone="neutral">Leçon disponible</Badge>}
                                    {OFFLINE_ENABLED && cachedIds.includes(lesson.id) && (
                                      <Badge tone="brand">✓ hors ligne</Badge>
                                    )}
                                  </>
                                ) : (
                                  <Badge tone="neutral">Contenu à ajouter</Badge>
                                )}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: FONT.sm, color: COLORS.ink3, fontStyle: "italic", marginTop: 8 }}>
                              Sujet à définir pour cette semaine
                            </div>
                          )}
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            )}
          </>
        )}
          </div>
        </div>
      </div>
    );
  };


  // ============ PROGRAMME VIEW ============
  const ProgrammeView = () => {
    const q = progQuery.trim().toLowerCase();

    // Search hits — computed here, then rendered INSIDE the subjects view below
    // the search input so the input keeps a STABLE tree position and never
    // remounts. (It used to lose focus on every keystroke: SearchBar was an
    // inline <Component/> re-created each render, and the input also jumped
    // between the results branch and the subjects branch at the 2-char
    // threshold.)
    let searchHits = null;
    if (q.length >= 2) {
      const hits = [];
      availableLessons.forEach((l) => {
        if ((l.title || "").toLowerCase().includes(q)) {
          const subj = SUBJECTS.find((sb) => sb.id === l.subject_id);
          hits.push({
            key: "l" + l.id, title: l.title,
            meta: `${subj?.name || "Matière"} · Unité ${l.unit_number}${l.week_number ? " · Semaine " + l.week_number : ""}`,
            color: subj?.color, icon: subj?.icon, lessonId: l.id,
          });
        }
      });
      topics.forEach((t, i) => {
        if (isTeacherTaught(t.subject_id)) return; // matière enseignée par l'enseignant·e : pas de sujets à créer
        if ((t.topic_title || "").toLowerCase().includes(q)) {
          const subj = SUBJECTS.find((sb) => sb.id === t.subject_id);
          const lesson = getLessonForTopic(t.subject_id, t.component_id, t.unit_number, t.week_number);
          hits.push({
            key: "t" + i, title: t.topic_title,
            meta: `${subj?.name || "Matière"} · Unité ${t.unit_number} · Semaine ${t.week_number}${lesson ? "" : " · leçon à créer"}`,
            color: subj?.color, icon: subj?.icon, lessonId: lesson?.id || null,
          });
        }
      });
      const seen = new Set();
      searchHits = hits.filter((h) => {
        const k = h.title + "|" + h.meta;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      }).slice(0, 40);
    }

    // ---- LISTE DES MATIÈRES ----
    // ---- Vue transversale : la semaine en cours, toutes matières ----
    if (programmeView === "week") {
      const weekTopics = topics
        .filter((t) => t.unit_number === selectedUnit && t.week_number === selectedWeek)
        .sort((a, b) => (a.subject_id || "").localeCompare(b.subject_id || ""));
      return (
        <div>
          <Breadcrumb items={[
            { label: "Programme", onClick: () => setProgrammeView("subjects") },
            { label: `Unité ${selectedUnit} · Semaine ${selectedWeek}` },
          ]} />
          <h1 className="ec-h1">Cette semaine</h1>
          <p className="ec-sub">
            {selectedLevel.name} · unité {selectedUnit} · semaine {selectedWeek}
            {selectedWeek === 4 ? " — semaine d'intégration et d'évaluation" : ""}
          </p>

          {weekTopics.length === 0 ? (
            <Card style={{ marginTop: 18 }}>
              <EmptyState icon="🗓" title="Aucun sujet pour cette semaine">
                {selectedWeek === 4
                  ? "La semaine 4 est consacrée à l'intégration et à l'évaluation : pas de nouvelle notion au programme."
                  : "Le calendrier officiel ne prévoit pas de sujet pour cette semaine."}
              </EmptyState>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 8, marginTop: 18, gridTemplateColumns: "repeat(auto-fit, minmax(min(390px, 100%), 1fr))" }}>
              {weekTopics.map((t, i) => {
                const subject = SUBJECTS.find((sb) => sb.id === t.subject_id);
                const comp = subject?.components.find((c) => c.id === t.component_id);
                const tt = isTeacherTaught(t.subject_id);
                const lesson = tt ? null : getLessonForTopic(t.subject_id, t.component_id, t.unit_number, t.week_number);
                return (
                  <ListRow
                    key={`${t.subject_id}-${t.component_id}-${i}`}
                    barColor={subjectColor(subject?.name)}
                    icon={subject?.icon}
                    title={t.topic_title || comp?.name || subject?.name || "Sujet"}
                    meta={`${subject?.name || "Matière"}${comp ? " — " + comp.name : ""}`}
                    onClick={lesson ? () => openLesson(lesson.id) : undefined}
                    right={tt
                      ? <Badge tone="neutral">Enseignant·e</Badge>
                      : (lesson
                        ? <Badge tone="brand">Leçon prête</Badge>
                        : <Badge tone="neutral">À créer</Badge>)}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (programmeView === "subjects") {
      // On ne compte que les matières couvertes : afficher les sujets des matières
      // « enseignées par l'enseignant·e » laisserait croire à des leçons à venir.
      const totalTopics = topics.filter((t) => !isTeacherTaught(t.subject_id)).length;
      const totalLessons = availableLessons.filter((l) => !isTeacherTaught(l.subject_id)).length;
      return (
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 className="ec-h1">Programme scolaire</h1>
              <p className="ec-sub">{selectedLevel.name} — toutes les disciplines et leur contenu</p>
            </div>
            {!isParent && (
              <div>
                <label htmlFor="ec-prog-level" className="ec-sr">Niveau</label>
                <select
                  id="ec-prog-level"
                  className="ec-input"
                  value={selectedLevel.id}
                  onChange={(e) => setSelectedLevel(LEVELS.find(l => l.id === e.target.value))}
                  style={{ width: "auto", minHeight: 42, padding: "9px 12px", fontSize: "var(--ec-fs-3)", fontWeight: 600 }}
                >
                  {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name} — {l.primary}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Single, STABLE search input — same position whether we show the
              results or the subjects list, so it never remounts and never loses
              focus while typing. */}
          <div style={{ marginTop: 18, marginBottom: 16, position: "relative" }}>
            <label htmlFor="ec-prog-search" className="ec-sr">Rechercher dans le programme</label>
            <input
              id="ec-prog-search"
              className="ec-input"
              type="search"
              placeholder="Rechercher une leçon, une notion…"
              value={progQuery}
              onChange={(e) => setProgQuery(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
            <span aria-hidden="true" style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              color: COLORS.ink3, fontSize: "var(--ec-fs-4)", pointerEvents: "none",
            }}>🔍</span>
          </div>

          {searchHits ? (
            <>
              <button className="ec-row" style={{ marginBottom: 14, borderColor: COLORS.g300, background: COLORS.g50 }}
                onClick={() => { setProgQuery(""); setProgrammeView("week"); }}>
                <span aria-hidden="true" className="ec-row__ico" style={{ background: COLORS.g500, color: "#fff" }}>◉</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="ec-row__title" style={{ display: "block", fontWeight: 700, color: COLORS.ink }}>
                    Programme de cette semaine
                  </span>
                  <span className="ec-row__meta" style={{ display: "block", color: COLORS.ink3, marginTop: 3 }}>
                    Unité {selectedUnit} · Semaine {selectedWeek} · toutes les matières d'un coup
                  </span>
                </span>
                <span aria-hidden="true" style={{ color: COLORS.ink3, fontSize: FONT.base, flex: "none" }}>›</span>
              </button>
              {searchHits.length === 0 ? (
                <Card>
                  <EmptyState icon="🔍" title="Aucun résultat">
                    Aucune leçon ni sujet ne correspond à « {progQuery} » pour le {selectedLevel.name}.
                  </EmptyState>
                </Card>
              ) : (
                <>
                  <p style={{ fontSize: FONT.sm, color: COLORS.ink3, marginBottom: 10 }}>
                    {searchHits.length} résultat{searchHits.length > 1 ? "s" : ""}
                  </p>
                  <div style={{ display: "grid", gap: 8 }}>
                    {searchHits.map((h) => (
                      <ListRow
                        key={h.key}
                        icon={h.icon}
                        iconColor={h.color}
                        title={h.title}
                        meta={h.meta}
                        onClick={h.lessonId ? () => openLesson(h.lessonId) : undefined}
                        right={h.lessonId ? undefined : <Badge tone="neutral">À créer</Badge>}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {totalTopics > 0 && (
                <Callout tone="brand" icon="📊" style={{ marginBottom: 16 }}>
                  <b>{totalLessons} leçon{totalLessons > 1 ? "s" : ""} sur {totalTopics} sujets</b> disponibles pour le {selectedLevel.name}.
                </Callout>
              )}

              <CardLabel>Matières</CardLabel>
              {loadingData && <SkeletonRows rows={4} />}
              <div style={{ display: "grid", gap: 9, gridTemplateColumns: "repeat(auto-fit, minmax(min(390px, 100%), 1fr))" }}>
                {SUBJECTS.map((subject) => {
                  const tt = isTeacherTaught(subject.id);
                  const subjTopics = topics.filter((t) => t.subject_id === subject.id).length;
                  const subjLessons = availableLessons.filter((l) => l.subject_id === subject.id).length;
                  return (
                    <ListRow
                      key={subject.id}
                      icon={subject.icon}
                      iconColor={subject.color}
                      title={subject.name}
                      meta={tt
                        ? "Enseignée directement par l'enseignant(e)"
                        : (subjTopics > 0
                          ? `${subjLessons} / ${subjTopics} leçons · ${subject.components.length} composantes`
                          : `${subject.components.length} composantes · ${subject.hours}`)}
                      onClick={() => { setSelectedSubject(subject); setProgrammeView("components"); }}
                      right={tt ? <Badge tone="neutral">Enseignant·e</Badge> : undefined}
                    >
                      {!tt && subjTopics > 0 && (
                        <Meter
                          value={Math.min(subjLessons, subjTopics)}
                          max={subjTopics}
                          color={subject.color}
                          label={`Avancement ${subject.name}`}
                        />
                      )}
                    </ListRow>
                  );
                })}
              </div>
            </>
          )}
        </div>
      );
    }

    // ---- COMPOSANTES D'UNE MATIÈRE ----
    if (programmeView === "components" && selectedSubject) {
      return (
        <div>
          <Breadcrumb items={[
            { label: "Programme", onClick: () => setProgrammeView("subjects") },
            { label: selectedSubject.name },
          ]} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span aria-hidden="true" style={{
              width: 52, height: 52, borderRadius: 14, flex: "none",
              background: selectedSubject.color, color: "#fff",
              display: "grid", placeItems: "center", fontSize: "var(--ec-fs-6)",
            }}>{selectedSubject.icon}</span>
            <div>
              <h1 className="ec-h1">{selectedSubject.name}</h1>
              <p className="ec-sub">
                {isTeacherTaught(selectedSubject.id)
                  ? `${selectedLevel.name} · enseignée par l'enseignant(e)`
                  : `${selectedLevel.name} · ${selectedSubject.hours} · ${selectedSubject.components.length} composantes`}
              </p>
            </div>
          </div>

          {isTeacherTaught(selectedSubject.id) ? (
            <Callout tone="neutral" icon="👩🏽‍🏫" style={{ marginTop: 20 }}>
              {coverageMessage(selectedSubject.id)}
            </Callout>
          ) : (
          <div style={{ display: "grid", gap: 9, marginTop: 20 }}>
            {selectedSubject.components.map((comp) => {
              const compTopics = getTopicsForComponent(selectedSubject.id, comp.id);
              const compLessons = availableLessons.filter(
                (l) => l.subject_id === selectedSubject.id && l.component_id === comp.id);
              return (
                <ListRow
                  key={comp.id}
                  icon="•"
                  iconColor={selectedSubject.color}
                  title={comp.name}
                  meta={`${compTopics.length} sujet${compTopics.length > 1 ? "s" : ""} · ${compLessons.length} leçon${compLessons.length !== 1 ? "s" : ""} disponible${compLessons.length !== 1 ? "s" : ""}`}
                  onClick={() => { setSelectedComponent(comp); setProgrammeView("topics"); }}
                >
                  {compTopics.length > 0 && (
                    <Meter
                      value={Math.min(compLessons.length, compTopics.length)}
                      max={compTopics.length}
                      color={selectedSubject.color}
                      label={`Avancement ${comp.name}`}
                    />
                  )}
                </ListRow>
              );
            })}
          </div>
          )}
        </div>
      );
    }

    // ---- SUJETS D'UNE COMPOSANTE, PAR UNITÉ ----
    if (programmeView === "topics" && selectedSubject && selectedComponent) {
      // Matière enseignée par l'enseignant·e : pas de détail de sujets, on montre
      // le message (protège aussi contre un accès direct à cette vue).
      if (isTeacherTaught(selectedSubject.id)) {
        return (
          <div>
            <Breadcrumb items={[
              { label: "Programme", onClick: () => setProgrammeView("subjects") },
              { label: selectedSubject.name, onClick: () => setProgrammeView("components") },
            ]} />
            <h1 className="ec-h1">{selectedSubject.name}</h1>
            <Callout tone="neutral" icon="👩🏽‍🏫" style={{ marginTop: 16 }}>
              {coverageMessage(selectedSubject.id)}
            </Callout>
          </div>
        );
      }
      const compTopics = getTopicsForComponent(selectedSubject.id, selectedComponent.id);
      const color = selectedSubject.color;

      return (
        <div>
          <Breadcrumb items={[
            { label: "Programme", onClick: () => setProgrammeView("subjects") },
            { label: selectedSubject.name, onClick: () => setProgrammeView("components") },
            { label: selectedComponent.name },
          ]} />
          <h1 className="ec-h1">{selectedComponent.name}</h1>
          <p className="ec-sub">{selectedSubject.name} · {selectedLevel.name} · progression annuelle</p>

          <div style={{ marginTop: 20 }}>
            {THEMES.map((theme, unitIdx) => {
              const unitNum = unitIdx + 1;
              const unitTopics = compTopics.filter((t) => t.unit_number === unitNum);
              const monthInfo = MONTH_UNIT_MAP[unitIdx];

              return (
                <section key={unitNum} style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <span aria-hidden="true" style={{
                      width: 34, height: 34, borderRadius: 9, flex: "none",
                      background: unitTopics.length > 0 ? color : COLORS.border,
                      color: unitTopics.length > 0 ? "#fff" : COLORS.ink3,
                      display: "grid", placeItems: "center", fontSize: "var(--ec-fs-3)", fontWeight: 800,
                    }}>{unitNum}</span>
                    <div>
                      <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink }}>{theme}</div>
                      <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3 }}>{monthInfo?.month}</div>
                    </div>
                  </div>

                  {unitTopics.length === 0 ? (
                    <div style={{
                      marginLeft: 17, borderLeft: `2px solid ${COLORS.border}`,
                      paddingLeft: 20, paddingBottom: 6,
                    }}>
                      <span style={{ fontSize: FONT.sm, color: COLORS.ink3, fontStyle: "italic" }}>
                        Sujets à définir pour cette unité
                      </span>
                    </div>
                  ) : (
                    <div style={{ marginLeft: 17, borderLeft: `2px solid ${COLORS.border}`, paddingLeft: 20 }}>
                      {[1, 2, 3].map((week) => {
                        const weekTopics = unitTopics.filter((t) => t.week_number === week);
                        const weekLesson = getLessonForTopic(selectedSubject.id, selectedComponent.id, unitNum, week);
                        if (weekTopics.length === 0 && !weekLesson) return null;
                        return (
                          <div key={week} style={{ marginBottom: 16 }}>
                            <div style={{
                              fontSize: "var(--ec-fs-1)", fontWeight: 700, color: COLORS.ink3,
                              textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 7,
                            }}>
                              Semaine {week}
                            </div>
                            {weekTopics.map((topic, ti) => (
                              <div key={ti} className="ec-card" style={{ padding: "11px 14px", marginBottom: 7 }}>
                                <div style={{ fontSize: "var(--ec-fs-3)", fontWeight: 600, color: COLORS.ink }}>
                                  {topic.topic_title}
                                </div>
                                {topic.topic_description && (
                                  <div style={{ fontSize: FONT.sm, color: COLORS.ink2, marginTop: 3, lineHeight: 1.5 }}>
                                    {topic.topic_description}
                                  </div>
                                )}
                                {topic.savoir_etre && (
                                  <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 5 }}>
                                    Savoir-être : {topic.savoir_etre}
                                  </div>
                                )}
                              </div>
                            ))}

                            {weekLesson ? (
                              <ListRow
                                icon="▸"
                                iconColor={color}
                                title={weekLesson.title}
                                meta={OFFLINE_ENABLED && cachedIds.includes(weekLesson.id)
                                  ? "Leçon disponible · ✓ hors ligne"
                                  : "Leçon disponible"}
                                onClick={() => openLesson(weekLesson.id)}
                              />
                            ) : (
                              <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, fontStyle: "italic", paddingLeft: 2 }}>
                                Leçon à créer pour cette semaine
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <Badge tone="warn">Semaine 4 — intégration et évaluation</Badge>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };


  // ============ LESSON SCREEN ============
  const LessonScreen = () => {
    if (loadingLesson) {
      return (
        <div aria-busy="true">
          <span className="ec-sr">Chargement de la leçon…</span>
          <Skeleton h={13} w="30%" />
          <Skeleton h={26} w="72%" style={{ marginTop: 12 }} />
          <Skeleton h={15} w="90%" style={{ marginTop: 10 }} />
          <div style={{ marginTop: 26 }}><SkeletonRows rows={4} /></div>
        </div>
      );
    }
    if (!currentLesson) return null;
    const color = getSubjectColor(currentLesson.subject_id);

    // ---- INLINE EDITOR ----
    if (editMode) {
      return (
        <div>
          <button onClick={cancelEdit} style={{
            display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            color: "#6B7280", fontSize: "var(--ec-fs-3)", fontWeight: 600, cursor: "pointer", marginBottom: 20, padding: 0
          }}>← Annuler les modifications</button>

          {/* Edit mode banner */}
          <div style={{
            background: "linear-gradient(135deg, #F59E0B15, #F59E0B05)",
            borderRadius: 12, padding: "20px 24px", marginBottom: 24,
            border: "1px solid #F59E0B40", display: "flex", alignItems: "center", gap: 14
          }}>
            <span style={{ fontSize: "var(--ec-fs-7)" }}>✏️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: "#92400E" }}>Mode modification</div>
              <div style={{ fontSize: "var(--ec-fs-3)", color: "#B45309", marginTop: 2 }}>
                Modifiez le contenu de la leçon ci-dessous, puis enregistrez vos changements.
              </div>
            </div>
          </div>

          {orphanBackup && (
            <Callout tone="warn" icon="⚠" style={{ marginBottom: 12 }}>
              <span>
                <b>Un enregistrement précédent ne s'est pas terminé.</b> Une copie de sécurité
                du contenu d'origine est conservée. Réinjectez-la si la leçon vous paraît incomplète.
                <span style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    const lid = orphanBackup.lessonId;
                    const ok = await rollback(orphanBackup);
                    if (!ok) {
                      pushToast("La restauration a échoué. Réessayez en ligne.", "error");
                      return;
                    }
                    setOrphanBackup(null);
                    setEditMode(false);
                    await openLesson(lid);
                    pushToast("Contenu d'origine restauré", "success");
                  }}>Restaurer le contenu d'origine</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    clearBackup(orphanBackup.lessonId);
                    setOrphanBackup(null);
                  }}>Ignorer</Button>
                </span>
              </span>
            </Callout>
          )}

          {editError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#DC2626", fontSize: "var(--ec-fs-3)" }}>
              {editError}
            </div>
          )}

          {/* Lesson metadata */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px", marginBottom: 20 }}>
            <h3 style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Informations de la leçon</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={editLabelStyle}>Titre</label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={editInputStyle} placeholder="Titre de la leçon" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={editLabelStyle}>Objectif pédagogique</label>
              <textarea value={editObjective} onChange={e => setEditObjective(e.target.value)}
                style={{ ...editInputStyle, minHeight: 80, resize: "vertical" }} placeholder="L'élève sera capable de..." />
            </div>
            <div>
              <label style={editLabelStyle}>Durée</label>
              <input value={editDuration} onChange={e => setEditDuration(e.target.value)} style={{ ...editInputStyle, maxWidth: 200 }} />
            </div>
          </div>

          {/* Sections editor */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: "#111827", margin: 0 }}>Sections de la leçon</h3>
              <button onClick={eAddSection} style={{
                background: "#0F4C35", color: "white", border: "none", borderRadius: 8,
                padding: "8px 16px", fontSize: "var(--ec-fs-3)", fontWeight: 600, cursor: "pointer"
              }}>+ Ajouter une section</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {editSections.map((section, sIdx) => (
                <div key={sIdx} style={{
                  background: "white", borderRadius: 12, border: "1px solid #E5E7EB",
                  overflow: "hidden"
                }}>
                  {/* Section header */}
                  <div style={{
                    padding: "14px 18px", background: "#F9FAFB",
                    borderBottom: "1px solid #E5E7EB",
                    display: "flex", alignItems: "center", gap: 12
                  }}>
                    <span style={{ fontSize: "var(--ec-fs-5)" }}>{section.icon}</span>
                    <div style={{ flex: 1, display: "flex", gap: 10 }}>
                      <select value={section.type}
                        onChange={e => eUpdateSection(sIdx, "type", e.target.value)}
                        style={{ ...editInputStyle, maxWidth: 200 }}>
                        {SECTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                      </select>
                      <input value={section.title}
                        onChange={e => eUpdateSection(sIdx, "title", e.target.value)}
                        style={{ ...editInputStyle, flex: 1 }}
                        placeholder="Titre de la section" />
                    </div>
                    <button onClick={() => eRemoveSection(sIdx)} style={{
                      background: "none", border: "none", color: "#EF4444",
                      fontSize: "var(--ec-fs-5)", cursor: "pointer", padding: "4px 8px"
                    }} title="Supprimer la section">✕</button>
                  </div>

                  {/* Blocks */}
                  <div style={{ padding: "16px 18px" }}>
                    {section.blocks.map((block, bIdx) => (
                      <div key={bIdx} style={{
                        background: "#F9FAFB", borderRadius: 8, padding: "14px",
                        marginBottom: 10, border: "1px solid #E5E7EB"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {BLOCK_TYPES.map(bt => (
                              <button key={bt.id}
                                onClick={() => eUpdateBlock(sIdx, bIdx, "block_type", bt.id)}
                                style={{
                                  padding: "4px 10px", borderRadius: 6, fontSize: "var(--ec-fs-2)", fontWeight: 600,
                                  cursor: "pointer", border: "none",
                                  background: block.block_type === bt.id ? "#0F4C35" : "#E5E7EB",
                                  color: block.block_type === bt.id ? "white" : "#374151"
                                }}>{bt.icon} {bt.name}</button>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => eMoveBlock(sIdx, bIdx, -1)} disabled={bIdx === 0}
                              style={{ background: "none", border: "1px solid #D1D5DB", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: "var(--ec-fs-2)", color: bIdx === 0 ? "#D1D5DB" : "#374151" }}>▲</button>
                            <button onClick={() => eMoveBlock(sIdx, bIdx, 1)} disabled={bIdx === section.blocks.length - 1}
                              style={{ background: "none", border: "1px solid #D1D5DB", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: "var(--ec-fs-2)", color: bIdx === section.blocks.length - 1 ? "#D1D5DB" : "#374151" }}>▼</button>
                            <button onClick={() => eRemoveBlock(sIdx, bIdx)}
                              style={{ background: "none", border: "1px solid #FCA5A5", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: "var(--ec-fs-2)", color: "#EF4444" }}>✕</button>
                          </div>
                        </div>

                        {block.block_type === "text" && (
                          <textarea value={block.text_content}
                            onChange={e => eUpdateBlock(sIdx, bIdx, "text_content", e.target.value)}
                            style={{ ...editInputStyle, minHeight: 120, resize: "vertical" }}
                            placeholder="Contenu texte..." />
                        )}

                        {block.block_type === "image" && (
                          <div>
                            {block.media_url && (
                              <img src={block.media_url} alt="" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginBottom: 10, display: "block" }} />
                            )}
                            <input type="file" accept="image/*"
                              onChange={e => eHandleImageUpload(sIdx, bIdx, e.target.files[0])}
                              style={{ marginBottom: 8 }} />
                            {editUploadingKey === `${sIdx}-${bIdx}` && (
                              <span style={{ fontSize: "var(--ec-fs-2)", color: "#6B7280" }}>Envoi en cours...</span>
                            )}
                            <input value={block.caption} onChange={e => eUpdateBlock(sIdx, bIdx, "caption", e.target.value)}
                              style={{ ...editInputStyle, marginTop: 6 }} placeholder="Légende (optionnel)" />
                            <input value={block.alt_text} onChange={e => eUpdateBlock(sIdx, bIdx, "alt_text", e.target.value)}
                              style={{ ...editInputStyle, marginTop: 6 }} placeholder="Texte alternatif (optionnel)" />
                          </div>
                        )}

                        {block.block_type === "video" && (
                          <div>
                            <input value={block.media_url} onChange={e => eUpdateBlock(sIdx, bIdx, "media_url", e.target.value)}
                              style={editInputStyle} placeholder="URL de la vidéo (YouTube, Vimeo, fichier .mp4...)" />
                            {block.media_url && isEmbeddable(block.media_url) && (
                              <div style={{ marginTop: 10, position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 8, overflow: "hidden" }}>
                                <iframe src={getEmbedUrl(block.media_url)}
                                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                              </div>
                            )}
                            <input value={block.caption} onChange={e => eUpdateBlock(sIdx, bIdx, "caption", e.target.value)}
                              style={{ ...editInputStyle, marginTop: 6 }} placeholder="Légende (optionnel)" />
                          </div>
                        )}
                      </div>
                    ))}

                    <div style={{ display: "flex", gap: 8 }}>
                      {BLOCK_TYPES.map(bt => (
                        <button key={bt.id} onClick={() => eAddBlock(sIdx, bt.id)}
                          style={{
                            padding: "6px 12px", borderRadius: 6, fontSize: "var(--ec-fs-2)", fontWeight: 600,
                            cursor: "pointer", border: "1px dashed #D1D5DB",
                            background: "white", color: "#6B7280"
                          }}>+ {bt.icon} {bt.name}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exercises editor */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: "#111827", margin: 0 }}>Exercices</h3>
              <button onClick={eAddExercise} style={{
                background: "#F59E0B", color: "white", border: "none", borderRadius: 8,
                padding: "8px 16px", fontSize: "var(--ec-fs-3)", fontWeight: 600, cursor: "pointer"
              }}>+ Exercice</button>
            </div>

            {editExercises.map((ex, eIdx) => (
              <div key={eIdx} style={{
                background: "#FFFBEB", borderRadius: 10, padding: "14px 16px",
                border: "1px solid #FDE68A", marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: "var(--ec-fs-3)", fontWeight: 700, color: "#D97706" }}>Exercice {eIdx + 1}</span>
                  <button onClick={() => eRemoveExercise(eIdx)} style={{
                    background: "none", border: "none", color: "#EF4444", fontSize: "var(--ec-fs-4)", cursor: "pointer"
                  }}>✕</button>
                </div>
                <textarea value={ex.question} onChange={e => eUpdateExercise(eIdx, "question", e.target.value)}
                  style={{ ...editInputStyle, minHeight: 60, marginBottom: 8 }} placeholder="Question de l'exercice" />
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <select value={ex.type} onChange={e => eUpdateExercise(eIdx, "type", e.target.value)}
                    style={{ ...editInputStyle, maxWidth: 180 }}>
                    <option value="open">Réponse libre</option>
                    <option value="choice">Choix multiples</option>
                  </select>
                  <input value={ex.answer} onChange={e => eUpdateExercise(eIdx, "answer", e.target.value)}
                    style={{ ...editInputStyle, flex: 1 }} placeholder="Réponse attendue" />
                </div>
                {ex.type === "choice" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {ex.options.map((opt, oIdx) => (
                      <div key={oIdx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "var(--ec-fs-3)", fontWeight: 600, color: "#92400E", minWidth: 20 }}>
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        <input value={opt} onChange={e => eUpdateOption(eIdx, oIdx, e.target.value)}
                          style={{ ...editInputStyle, flex: 1 }} placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quiz editor */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: "#111827", margin: 0 }}>Quiz de préparation (enseignant)</h3>
              <button onClick={eAddQuiz} style={{
                background: "#7C3AED", color: "white", border: "none", borderRadius: 8,
                padding: "8px 16px", fontSize: "var(--ec-fs-3)", fontWeight: 600, cursor: "pointer"
              }}>+ Question</button>
            </div>

            {editQuizQuestions.map((q, qIdx) => (
              <div key={qIdx} style={{
                background: "#F5F3FF", borderRadius: 10, padding: "14px 16px",
                border: "1px solid #DDD6FE", marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: "var(--ec-fs-3)", fontWeight: 700, color: "#5B21B6" }}>Question {qIdx + 1}</span>
                  <button onClick={() => eRemoveQuiz(qIdx)} style={{
                    background: "none", border: "none", color: "#EF4444", fontSize: "var(--ec-fs-4)", cursor: "pointer"
                  }}>✕</button>
                </div>
                <textarea value={q.question} onChange={e => eUpdateQuiz(qIdx, "question", e.target.value)}
                  style={{ ...editInputStyle, minHeight: 60, marginBottom: 8 }} placeholder="Question du quiz" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input value={q.option_a} onChange={e => eUpdateQuiz(qIdx, "option_a", e.target.value)}
                    style={editInputStyle} placeholder="Option A" />
                  <input value={q.option_b} onChange={e => eUpdateQuiz(qIdx, "option_b", e.target.value)}
                    style={editInputStyle} placeholder="Option B" />
                  <input value={q.option_c} onChange={e => eUpdateQuiz(qIdx, "option_c", e.target.value)}
                    style={editInputStyle} placeholder="Option C" />
                  <input value={q.option_d} onChange={e => eUpdateQuiz(qIdx, "option_d", e.target.value)}
                    style={editInputStyle} placeholder="Option D" />
                </div>
                <div>
                  <label style={editLabelStyle}>Bonne réponse</label>
                  <select value={q.correct_answer} onChange={e => eUpdateQuiz(qIdx, "correct_answer", e.target.value)}
                    style={{ ...editInputStyle, maxWidth: 120 }}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Save / Cancel bar */}
          <div style={{
            display: "flex", gap: 12, justifyContent: "flex-end",
            padding: "20px 0", borderTop: "1px solid #E5E7EB", marginTop: 8
          }}>
            <button onClick={cancelEdit} disabled={editSaving} style={{
              padding: "12px 24px", background: "white", border: "1px solid #D1D5DB",
              borderRadius: 8, fontSize: "var(--ec-fs-3)", fontWeight: 600, color: "#374151", cursor: "pointer"
            }}>Annuler</button>
            <button onClick={handleInlineSave} disabled={editSaving} style={{
              padding: "12px 28px", background: editSaving ? "#9CA3AF" : "#0F4C35",
              color: "white", border: "none", borderRadius: 8, fontSize: "var(--ec-fs-3)",
              fontWeight: 700, cursor: editSaving ? "not-allowed" : "pointer"
            }}>{editSaving ? "Enregistrement..." : "Enregistrer les modifications"}</button>
          </div>
        </div>
      );
    }

    // ---- READ-ONLY VIEW ----
    // Parent preview lock: on a lesson the linked teacher hasn't taught yet, the
    // exercise section and the "à recopier dans ton cahier" (bilan) section are
    // locked. Everything else (intro, content, video, activity) stays visible so
    // the parent can read ahead. Taught lessons are fully unlocked.
    const parentLocked = isParent && currentLesson && !parentTaughtIds.has(currentLesson.id);
    const isLockedSection = (type) => parentLocked && (type === "exercise" || type === "bilan");
    const { prev: prevLesson, next: nextLesson } = getAdjacentLessons();
    const navBtnStyle = (active, align) => ({
      flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
      alignItems: align === "right" ? "flex-end" : "flex-start", gap: 2,
      padding: "10px 16px", borderRadius: 10, textAlign: align === "right" ? "right" : "left",
      border: `1.5px solid ${active ? color + "40" : "#E5E7EB"}`,
      background: active ? "white" : "#F9FAFB",
      color: active ? color : "#9CA3AF",
      cursor: active ? "pointer" : "not-allowed", transition: "all 0.2s",
    });
    const lessonNav = (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, margin: "16px 0" }}>
        <button onClick={() => goToLesson(prevLesson)} disabled={!prevLesson}
          title={prevLesson ? prevLesson.title : "Première leçon"}
          style={navBtnStyle(!!prevLesson, "left")}
          onMouseEnter={e => { if (prevLesson) e.currentTarget.style.background = color + "10"; }}
          onMouseLeave={e => { if (prevLesson) e.currentTarget.style.background = "white"; }}
        >
          <span style={{ fontSize: "var(--ec-fs-1)", fontWeight: 600, opacity: 0.8 }}>← Précédent</span>
          <span style={{ fontSize: "var(--ec-fs-3)", fontWeight: 700, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {prevLesson ? prevLesson.title : "Début du programme"}
          </span>
        </button>
        <button onClick={() => goToLesson(nextLesson)} disabled={!nextLesson}
          title={nextLesson ? nextLesson.title : "Dernière leçon"}
          style={navBtnStyle(!!nextLesson, "right")}
          onMouseEnter={e => { if (nextLesson) e.currentTarget.style.background = color + "10"; }}
          onMouseLeave={e => { if (nextLesson) e.currentTarget.style.background = "white"; }}
        >
          <span style={{ fontSize: "var(--ec-fs-1)", fontWeight: 600, opacity: 0.8 }}>Suivant →</span>
          <span style={{ fontSize: "var(--ec-fs-3)", fontWeight: 700, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nextLesson ? nextLesson.title : "Fin du programme"}
          </span>
        </button>
      </div>
    );
    return (
      /* Marge basse : la barre d'actions collante ne doit jamais masquer la fin
         du contenu. */
      <div style={{ paddingBottom: 96 }}>
        <button
          onClick={backFromLesson}
          className="ec-link"
          style={{ minHeight: 40, marginBottom: 14, textDecoration: "none", color: COLORS.ink2 }}
        >
          ‹ Retour
        </button>

        {!isParent && lessonNav}

        {/* ---- Titre et repères ---- */}
        <header style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              fontSize: "var(--ec-fs-2)", fontWeight: 700, padding: "5px 11px 5px 7px",
              borderRadius: 999, background: COLORS.card,
              border: `1px solid ${COLORS.border}`, color: COLORS.ink,
            }}>
              <i aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 999, background: color }} />
              {SUBJECTS.find((sb) => sb.id === currentLesson.subject_id)?.name || "Matière"}
            </span>
            <Badge tone="neutral">Unité {currentLesson.unit_number}</Badge>
            {currentLesson.theme && <Badge tone="neutral">{currentLesson.theme}</Badge>}
            {OFFLINE_ENABLED && cachedIds.includes(currentLesson.id) && (
              <Badge tone="brand">✓ hors ligne</Badge>
            )}
            {lessonTaught && <Badge tone="brand">Enseignée</Badge>}
          </div>

          <h1 style={{
            fontSize: isMobile ? 24 : 30, fontWeight: 800,
            letterSpacing: "-.03em", lineHeight: 1.18, color: COLORS.ink,
          }}>
            {currentLesson.title}
          </h1>

          {currentLesson.objective && (
            <p style={{
              fontSize: "var(--ec-fs-4)", color: COLORS.ink2, marginTop: 10,
              lineHeight: 1.6, maxWidth: "62ch",
            }}>
              {currentLesson.objective}
            </p>
          )}

          <div style={{ display: "flex", gap: 16, fontSize: FONT.sm, color: COLORS.ink3, marginTop: 12 }}>
            <span>⏱ {currentLesson.duration}</span>
            <span>{selectedLevel.name}</span>
          </div>
        </header>

        {/* ---- Sommaire des sections : on sait toujours où l'on est ---- */}
        {lessonSections.length > 1 && (
          <div style={{
            position: "sticky", top: 58, zIndex: 6,
            background: COLORS.page, padding: "10px 0 12px",
            marginBottom: 6,
          }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
              {lessonSections.map((sec, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const el = document.getElementById(`ec-sec-${i}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  style={{
                    flex: "none", border: `1px solid ${COLORS.border}`, background: COLORS.card,
                    color: COLORS.ink2, fontSize: "var(--ec-fs-2)", fontWeight: 700,
                    padding: "8px 13px", borderRadius: 999, minHeight: 40, whiteSpace: "nowrap",
                  }}
                >
                  {sec.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---- Barre d'actions : toujours à portée de pouce ---- */}
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
          background: "rgba(255,255,255,.97)", borderTop: `1px solid ${COLORS.border}`,
          padding: "10px 14px calc(14px + env(safe-area-inset-bottom, 0px))",
          display: "flex", gap: 8, justifyContent: "center",
        }}>
          <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 620 }}>
            {!isParent && (
              <Button
                onClick={toggleTaught}
                disabled={taughtSaving}
                variant={lessonTaught ? "primary" : "ghost"}
                style={{ flex: 1 }}
                title="Marque cette leçon comme enseignée en classe"
              >
                {taughtSaving ? "Enregistrement…" : lessonTaught ? "✓ Enseignée" : "Marquer enseignée"}
              </Button>
            )}
            <Button variant="ghost" onClick={startProjector} aria-label="Mode projecteur" title="Projeter (2e écran si disponible)">
              📽 {!isMobile && "Projecteur"}
            </Button>
            {isAdmin && (
              <Button variant="ghost" onClick={startInlineEdit} aria-label="Modifier la leçon" title="Modifier la leçon">
                ✏️ {!isMobile && "Modifier"}
              </Button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lessonSections.map((section, i) => {
            const isOpen = !collapsedSections[i];
            const secAnchorId = `ec-sec-${i}`;
            const accentColors = { intro: "#3B82F6", content: "#0F4C35", video: "#EF4444", activity: "#8B5CF6", exercise: "#F59E0B", bilan: "#D97706" };
            const accent = accentColors[section.section_type] || "#6B7280";
            const blocks = sectionBlocks[section.id] || [];

            // Parent, lesson not yet taught: show this section as locked.
            if (isLockedSection(section.section_type)) {
              return (
                <div key={i} id={secAnchorId} style={{
                  background: "#F9FAFB", borderRadius: 10, border: "1px dashed #D1D5DB",
                  padding: "16px 18px", display: "flex", alignItems: "center", gap: 12
                }}>
                  <span style={{ fontSize: "var(--ec-fs-5)", opacity: 0.7 }}>🔒</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: "#6B7280" }}>
                      {section.icon} {section.title}
                    </div>
                    <div style={{ fontSize: "var(--ec-fs-2)", color: "#9CA3AF", marginTop: 2, lineHeight: 1.5 }}>
                      Disponible une fois la leçon vue en classe.
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={i} id={secAnchorId} style={{
                background: COLORS.card, borderRadius: 12,
                border: `1px solid ${COLORS.border}`, overflow: "hidden",
                boxShadow: SHADOW.sm,
              }}>
                {/* Vrai <button> : l'en-tête de section se replie au clavier
                    comme à la souris, et son état est annoncé. */}
                <button
                  onClick={() => setCollapsedSections(prev => ({ ...prev, [i]: !prev[i] }))}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%", padding: "14px 16px", border: 0, background: "none",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    gap: 12, textAlign: "left", minHeight: 56,
                  }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span aria-hidden="true" style={{
                      width: 30, height: 30, borderRadius: 8, flex: "none",
                      background: accent + "1A", color: accent,
                      display: "grid", placeItems: "center", fontSize: "var(--ec-fs-4)",
                    }}>{section.icon}</span>
                    <span style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink }}>{section.title}</span>
                  </span>
                  <span aria-hidden="true" style={{
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform .2s", color: COLORS.ink3, fontSize: "var(--ec-fs-4)", flex: "none",
                  }}>▾</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${accent}15` }}>
                    {section.section_type === "exercise" ? (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                        {lessonExercises.map((ex, j) => (
                          <div key={j} style={{ background: "#FFFBEB", borderRadius: 10, padding: "14px 16px", border: "1px solid #FDE68A" }}>
                            <div style={{ fontSize: "var(--ec-fs-2)", color: "#D97706", fontWeight: 700, marginBottom: 6 }}>Exercice {j + 1}</div>
                            <div style={{ fontSize: "var(--ec-fs-3)", color: "#1F2937", lineHeight: 1.6 }}>{ex.question}</div>
                            {ex.exercise_type === "choice" && ex.options && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                                {(typeof ex.options === "string" ? JSON.parse(ex.options) : ex.options).map((opt, k) => (
                                  <div key={k} style={{ padding: "8px 12px", background: "white", borderRadius: 6, fontSize: "var(--ec-fs-3)", color: "#374151", border: "1px solid #E5E7EB" }}>
                                    {String.fromCharCode(65 + k)}. {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 18 }}>
                        {blocks.length === 0 ? (
                          <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "20px", textAlign: "center", color: "#9CA3AF", fontSize: "var(--ec-fs-3)" }}>
                            Contenu à venir pour cette section.
                          </div>
                        ) : (
                          blocks.map((block, k) => {
                            const isBilan = section.section_type === "bilan";
                            if (isBilan && HIDE_BILAN_IMAGES && block.block_type === "image") return null;
                            if (block.block_type === "text") {
                              // Trace écrite et devoir en cursive (voir CURSIVE_FONT).
                              const cursiveFrom = isBilan ? bilanCursiveFrom(blocks) : -1;
                              const isCursive = cursiveFrom !== -1 && k >= cursiveFrom;
                              return (
                                <div key={k} style={{
                                  fontSize: isCursive ? 19 : 16.5, color: "#22262C", lineHeight: isCursive ? 1.8 : 1.68,
                                  whiteSpace: "pre-wrap", maxWidth: "66ch",
                                }}>
                                  {isCursive ? renderCursiveText(block.text_content) : renderRichText(block.text_content)}
                                </div>
                              );
                            }
                            if (block.block_type === "image" && block.media_url) {
                              return (
                                <figure key={k} style={{ margin: "8px 0" }}>
                                  <img
                                    src={block.media_url}
                                    alt={block.alt_text || ""}
                                    style={{
                                      width: isSvg(block.media_url) ? "100%" : undefined,
                                      maxWidth: "100%", borderRadius: 10, display: "block",
                                      cursor: "pointer", transition: "transform 0.2s",
                                      boxShadow: "0 2px 12px rgba(0,0,0,0.08)"
                                    }}
                                    onClick={e => { e.currentTarget.style.transform = e.currentTarget.style.transform === "scale(1.5)" ? "none" : "scale(1.5)"; }}
                                  />
                                  {block.caption && (
                                    <figcaption style={{ fontSize: "var(--ec-fs-3)", color: "#6B7280", marginTop: 6, textAlign: "center" }}>
                                      {block.caption}
                                    </figcaption>
                                  )}
                                </figure>
                              );
                            }
                            if (block.block_type === "video" && block.media_url) {
                              // The device copy is preferred inside LessonVideo,
                              // so a downloaded video plays with no signal and
                              // costs nothing to replay.
                              return (
                                <LessonVideo
                                  key={k}
                                  url={block.media_url}
                                  caption={block.caption}
                                  online={online}
                                />
                              );
                            }
                            return null;
                          })
                        )}
                      </div>
                    )}
                    {renderFeedback(section.id, section.title)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Whole-lesson feedback (reviewers only) */}
        {!isAdmin && !isParent && currentLesson && (
          <div style={{ marginTop: 20, padding: "18px 20px", borderRadius: 12, background: "white", border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: "#111827", marginBottom: 4 }}>Votre avis sur l'ensemble de la leçon</div>
            <div style={{ fontSize: "var(--ec-fs-3)", color: "#6B7280" }}>Une note et un commentaire général nous aident à améliorer cette leçon.</div>
            {renderFeedback(null, currentLesson.title)}
          </div>
        )}

        {/* Readiness status + quiz */}
        {!isParent && (
        <div style={{
          marginTop: 28, padding: "20px", borderRadius: 12,
          background: lessonPassed ? "#F0FDF4" : "#F5F3FF",
          border: `1px solid ${lessonPassed ? "#BBF7D0" : "#DDD6FE"}`
        }}>
          {lessonPassed ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: "var(--ec-fs-7)" }}>✅</div>
              <div>
                <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: "#16A34A" }}>Préparation validée</div>
                <div style={{ fontSize: "var(--ec-fs-3)", color: "#6B7280", marginTop: 2 }}>Vous avez réussi le quiz. Vous pouvez présenter cette leçon à vos élèves.</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: "var(--ec-fs-7)" }}>📝</div>
                <div>
                  <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: "#5B21B6" }}>Quiz de préparation</div>
                  <div style={{ fontSize: "var(--ec-fs-3)", color: "#6B7280", marginTop: 2 }}>
                    Après avoir lu cette leçon, passez le quiz pour valider votre préparation avant la présentation aux élèves.
                  </div>
                </div>
              </div>
              <button onClick={() => setScreen("readiness")} style={{
                padding: "12px 24px", background: "#7C3AED", color: "white",
                border: "none", borderRadius: 8, fontSize: "var(--ec-fs-3)", fontWeight: 700, cursor: "pointer"
              }}>Passer le quiz de préparation →</button>
            </div>
          )}
        </div>
        )}

        {!isParent && lessonNav}

        <div style={{ marginTop: 16 }}>
          <button onClick={backFromLesson} style={{
            padding: "12px 20px", background: "white", border: "1px solid #D1D5DB",
            borderRadius: 8, fontSize: "var(--ec-fs-3)", fontWeight: 600, color: "#374151", cursor: "pointer"
          }}>← Retour</button>
        </div>
      </div>
    );
  };

  // ============ PROJECTOR VIEW ============
  const enterProjector = () => {
    setProjectorMode(true);
    try { document.documentElement.requestFullscreen?.(); } catch (_) {}
    logActivity({ actorId: teacher?.id, actorRole: teacher?.role || "teacher", schoolId: teacher?.school_id || schoolContext?.id, eventType: "projector", lessonId: currentLesson?.id, detail: currentLesson?.title });
  };
  const exitProjector = () => {
    setProjectorMode(false);
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch (_) {}
  };

  // Send a command to the projector window.
  const projectorPost = (msg) => { try { projectorChanRef.current?.postMessage(msg); } catch (_) {} };
  // Changer le zoom. Trois choses à la fois, et les trois comptent :
  //   1. l'état local, pour que l'écran et le pourcentage affiché changent ;
  //   2. le stockage de l'appareil, pour ne pas le refaire à chaque leçon ;
  //   3. la fenêtre du projecteur, quand la leçon tourne sur un SECOND écran.
  // Sans le point 3, l'enseignante appuie sur « + » sur son portable et rien
  // ne bouge sur le mur : la fenêtre du projecteur est une AUTRE fenêtre, avec
  // son propre état React. On diffuse la valeur ABSOLUE et non l'écart, pour
  // que les deux fenêtres ne puissent jamais se désynchroniser.
  const applyZoom = (next) => {
    const z = clampZoom(next);
    setProjZoom(z);
    try { window.localStorage.setItem(PROJ_ZOOM_KEY, String(z)); } catch (_) {}
    if (presenting && !isPresentWindow) projectorPost({ cmd: "zoom", value: z });
    return z;
  };
  const bumpZoom = (dir) => applyZoom(projZoom + dir * PROJ_ZOOM_STEP);
  const resetZoom = () => applyZoom(1);

  const stopPresenter = () => {
    projectorPost({ cmd: "exit" });
    try { presenterWinRef.current?.close(); } catch (_) {}
    presenterWinRef.current = null;
    setPresenting(false);
  };
  // Launch the lesson onto the projector. If the laptop has a SECOND screen
  // (projector via HDMI in "extend" mode), the lesson opens as its own window on
  // that screen while the platform stays usable on the laptop. A single screen
  // keeps the old same-screen fullscreen. Every failure path falls back safely.
  const startProjector = async () => {
    if (!currentLesson) return;
    if (presenting) { try { presenterWinRef.current?.focus(); } catch (_) {} return; }
    // `screen.isExtended` tells us if a second display exists WITHOUT any
    // permission. Single screen → keep the classic same-screen projector.
    const multi = (typeof window !== "undefined" && window.screen && typeof window.screen.isExtended === "boolean")
      ? window.screen.isExtended : null;
    if (multi === false) { enterProjector(); return; }
    const lessonId = currentLesson.id;
    const url = window.location.origin + "/?present=" + lessonId;
    let win = null;
    try {
      if (typeof window.getScreenDetails === "function") {
        const sd = await window.getScreenDetails();
        const ext = sd.screens.find((s) => s !== sd.currentScreen && s.isInternal === false)
          || sd.screens.find((s) => s !== sd.currentScreen);
        if (ext) win = window.open(url, "educam_projector", `left=${ext.availLeft},top=${ext.availTop},width=${ext.availWidth},height=${ext.availHeight}`);
      }
    } catch (_) { /* permission denied / API absent → movable popup below */ }
    if (!win) win = window.open(url, "educam_projector", "width=1280,height=800");
    if (!win) { enterProjector(); return; } // popup blocked → same-screen fallback
    presenterWinRef.current = win;
    setPresenting(true);
    logActivity({ actorId: teacher?.id, actorRole: teacher?.role || "teacher", schoolId: teacher?.school_id || schoolContext?.id, eventType: "projector", lessonId, detail: currentLesson?.title });
  };

  // Keyboard / clicker control for the projector.
  // - Local projector (same-screen fullscreen, OR the projector window itself):
  //   keys scroll the local panel.
  // - Laptop while presenting to the projector window (relaying): keys are
  //   BROADCAST to that window instead.
  const PROJECTOR_SCROLL_FRACTION = 0.04;
  useEffect(() => {
    const localProjector = projectorMode && !presenting;
    const relaying = presenting && !isPresentWindow;
    if (!localProjector && !relaying) return;
    const scrollLocal = (factor) => {
      const el = projectorScrollRef.current;
      if (!el) return;
      el.scrollBy({ top: Math.round((el.clientHeight || window.innerHeight) * PROJECTOR_SCROLL_FRACTION) * factor, behavior: "auto" });
    };
    const doScroll = (f) => { relaying ? projectorPost({ cmd: "scroll", factor: f }) : scrollLocal(f); };
    const doTop = () => { relaying ? projectorPost({ cmd: "top" }) : projectorScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); };
    const doBottom = () => {
      if (relaying) { projectorPost({ cmd: "bottom" }); return; }
      const el = projectorScrollRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    };
    const doExit = () => { relaying ? stopPresenter() : exitProjector(); };
    const onKey = (e) => {
      switch (e.key) {
        case "Escape": doExit(); break;
        case "PageDown": case "ArrowDown": case "ArrowRight": e.preventDefault(); doScroll(1); break;
        case "PageUp": case "ArrowUp": case "ArrowLeft": e.preventDefault(); doScroll(-1); break;
        case " ": e.preventDefault(); doScroll(e.shiftKey ? -1 : 1); break;
        case "Home": e.preventDefault(); doTop(); break;
        case "End": e.preventDefault(); doBottom(); break;
        // Zoom au clavier. « = » et « _ » sont les mêmes touches que « + » et
        // « - » sans Majuscule : sans elles, le zoom ne marcherait qu'avec
        // Majuscule enfoncée sur la plupart des claviers.
        case "+": case "=": e.preventDefault(); bumpZoom(1); break;
        case "-": case "_": e.preventDefault(); bumpZoom(-1); break;
        case "0": e.preventDefault(); resetZoom(); break;
        default: break;
      }
    };
    const onFsChange = () => { if (localProjector && !isPresentWindow && !document.fullscreenElement) setProjectorMode(false); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
    // ⚠️ `projZoom` DOIT figurer ici. `bumpZoom` calcule à partir de la valeur
    // du zoom capturée au moment où cet effet s'est abonné : sans cette
    // dépendance, la touche « + » partirait éternellement de la valeur
    // initiale — 100 % → 110 %, puis 110 % à chaque appui suivant. Les boutons
    // à la souris auraient marché, le clavier non : le genre de défaut qu'on
    // ne voit qu'en appuyant deux fois.
    // (Sans danger pour la zone morte : `projZoom` est déclaré tout en haut du
    // composant, bien avant cet effet.)
  }, [projectorMode, presenting, isPresentWindow, projZoom]);

  // BroadcastChannel between the laptop and the projector window. The projector
  // window applies the remote scroll/exit commands to its own panel.
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("educam_projector");
    projectorChanRef.current = ch;
    const onMsg = (e) => {
      if (!isPresentWindow) return;
      const m = e.data || {}; const el = projectorScrollRef.current;
      if (m.cmd === "scroll" && el) el.scrollBy({ top: Math.round((el.clientHeight || window.innerHeight) * PROJECTOR_SCROLL_FRACTION) * m.factor, behavior: "auto" });
      else if (m.cmd === "top" && el) el.scrollTo({ top: 0, behavior: "smooth" });
      else if (m.cmd === "bottom" && el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      else if (m.cmd === "zoom" && typeof m.value === "number") {
        // On NE rediffuse pas : cette fenêtre reçoit, elle ne commande pas.
        const z = clampZoom(m.value);
        setProjZoom(z);
        try { window.localStorage.setItem(PROJ_ZOOM_KEY, String(z)); } catch (_) {}
      }
      else if (m.cmd === "exit") { try { window.close(); } catch (_) {} }
    };
    ch.addEventListener("message", onMsg);
    return () => { try { ch.removeEventListener("message", onMsg); ch.close(); } catch (_) {} projectorChanRef.current = null; };
  }, [isPresentWindow]);

  // The projector window boots straight into its lesson + projector mode.
  const presentBootedRef = useRef(false);
  useEffect(() => {
    if (!isPresentWindow || presentBootedRef.current || !teacher?.id) return;
    let id = null;
    try { id = Number(new URLSearchParams(window.location.search).get("present")); } catch (_) {}
    if (!id) return;
    presentBootedRef.current = true;
    (async () => { await openLesson(id); setProjectorMode(true); })();
  }, [isPresentWindow, teacher?.id]);

  const ProjectorView = () => {
    if (!currentLesson) return null;
    const color = getSubjectColor(currentLesson.subject_id);
    // Same parent lock as the reader: hide exercise/bilan on untaught lessons.
    const projectorLocked = isParent && !parentTaughtIds.has(currentLesson.id);

    // Auto-scale: measure total text and pick font size
    const allText = lessonSections.flatMap(s =>
      (sectionBlocks[s.id] || []).filter(b => b.block_type === "text").map(b => b.text_content || "")
    ).join("");
    const len = allText.length;
    // Échelle automatique : plus la leçon est longue, plus les lettres sont
    // petites, sinon la classe passerait la séance à défiler.
    const fitVw = len < 500 ? 2.8 : len < 1500 ? 2.2 : len < 4000 ? 1.7 : 1.4;
    // Puis les facteurs de 2026-10-01 (voir PROJ_* en haut du fichier).
    // `baseFontVw` garde son nom : titres, sous-titres, légendes et la peau
    // « projecteur » de LessonVideo s'y accrochent déjà et grossissent donc
    // dans la même proportion que le corps du texte.
    // Les plafonds d'abord, le zoom de l'enseignante ensuite (voir l'encadré
    // PROJ_ZOOM_* en haut du fichier : l'inverse rendrait « + » muet au
    // plafond).
    const baseFontVw = Math.min(fitVw * PROJ_BODY_X, PROJ_BODY_MAX_VW) * projZoom;
    const copyFontVw = Math.min(fitVw * 1.15 * PROJ_COPY_X, PROJ_COPY_MAX_VW) * projZoom;
    // Les planchers suivent le zoom : sur un écran étroit c'est le plancher
    // qui gouverne, et un zoom sans effet là-bas serait un bouton mort.
    const basePx = `max(${Math.round(PROJ_BODY_MIN_PX * projZoom)}px, ${baseFontVw}vw)`;
    const copyPx = `max(${Math.round(PROJ_COPY_MIN_PX * projZoom)}px, ${copyFontVw}vw)`;

    // Bouton de zoom : carré, lisible de loin, et VISIBLEMENT éteint quand la
    // borne est atteinte — sinon on appuie dans le vide sans comprendre.
    const projZoomBtn = (off) => ({
      background: off ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.22)",
      color: off ? "rgba(255,255,255,0.45)" : "#fff",
      border: "1px solid rgba(255,255,255,0.35)", borderRadius: 8,
      width: 40, height: 40, fontSize: 22, fontWeight: 800, lineHeight: 1,
      cursor: off ? "default" : "pointer",
    });

    return (
      <div ref={projectorScrollRef} tabIndex={-1} style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "#FAF9F5",
        overflow: "auto", fontFamily: "'Segoe UI', system-ui, sans-serif", outline: "none"
      }}>
        {/* Floating controls */}
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 10000,
          display: "flex", gap: 10
        }}>
          {isPresentWindow && (
            <button onClick={() => { try { document.documentElement.requestFullscreen?.(); } catch (_) {} }} style={{
              background: "rgba(0,0,0,0.7)", color: "white", border: "none",
              borderRadius: 10, padding: "10px 20px", fontSize: "var(--ec-fs-4)", fontWeight: 700,
              cursor: "pointer", backdropFilter: "blur(8px)", boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
            }}>⛶ Plein écran</button>
          )}
          <button onClick={isPresentWindow ? () => { try { window.close(); } catch (_) {} } : exitProjector} style={{
            background: "rgba(0,0,0,0.7)", color: "white", border: "none",
            borderRadius: 10, padding: "10px 20px", fontSize: "var(--ec-fs-4)", fontWeight: 700,
            cursor: "pointer", backdropFilter: "blur(8px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
          }}>✕ {isPresentWindow ? "Fermer" : "Quitter le projecteur"}</button>
        </div>

        {/* MARQUER ENSEIGNÉE — EN BAS À GAUCHE, ajouté le 2026-10-01.
            Signalé par Maxime : pendant que la classe recopie la trace écrite,
            l'enseignante veut marquer la leçon et passer à la saisie des notes.
            Elle ne le pouvait pas — et le défaut était plus profond qu'un
            recouvrement : la barre « marquer enseignée » vit dans l'écran de
            leçon (z-index 40), or la vue projecteur est une surcouche plein
            écran (z-index 9999) posée par-dessus. L'action n'était pas cachée,
            elle était ABSENTE. Déplacer des z-index n'y aurait rien changé.
            Le coin bas-gauche est le seul libre : le haut-droit porte Plein
            écran et Quitter, le bas-droit porte le zoom. Les trois ne se
            rencontrent jamais, quelle que soit la largeur. */}
        {!isParent && (
          <div style={{
            position: "fixed", bottom: 20, left: 24, zIndex: 10000,
            background: "rgba(0,0,0,0.7)", borderRadius: 12, padding: 6,
            backdropFilter: "blur(8px)", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}>
            <button
              onClick={toggleTaught}
              disabled={taughtSaving}
              title="Marque cette leçon comme enseignée en classe"
              style={{
                background: lessonTaught ? COLORS.g500 : "none",
                border: lessonTaught ? "none" : "1px solid rgba(255,255,255,.45)",
                color: "#fff", cursor: taughtSaving ? "default" : "pointer",
                borderRadius: 9, padding: "9px 16px", minHeight: 44,
                fontFamily: "inherit", fontSize: 15, fontWeight: 700,
              }}
            >
              {taughtSaving ? "Enregistrement…" : lessonTaught ? "✓ Enseignée" : "Marquer enseignée"}
            </button>
          </div>
        )}

        {/* Zoom — EN BAS À DROITE, volontairement.
            La barre du haut est déjà soupçonnée de recouvrir la barre
            « marquer la leçon enseignée » (chantier 2) : y ajouter trois
            boutons aggraverait un défaut connu. En bas à droite, c'est aussi
            là où l'on cherche un zoom par habitude. */}
        <div style={{
          position: "fixed", bottom: 20, right: 24, zIndex: 10000,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(0,0,0,0.7)", borderRadius: 12, padding: 6,
          backdropFilter: "blur(8px)", boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
        }}>
          <button onClick={() => bumpZoom(-1)} disabled={projZoom <= PROJ_ZOOM_MIN}
            title="Réduire le texte (touche -)" style={projZoomBtn(projZoom <= PROJ_ZOOM_MIN)}>−</button>
          <button onClick={resetZoom} title="Revenir à la taille d'origine (touche 0)"
            style={{
              background: "none", border: "none", color: "#fff", cursor: "pointer",
              fontWeight: 800, fontSize: 16, minWidth: 62, letterSpacing: 0.5,
            }}>{Math.round(projZoom * 100)} %</button>
          <button onClick={() => bumpZoom(1)} disabled={projZoom >= PROJ_ZOOM_MAX}
            title="Agrandir le texte (touche +)" style={projZoomBtn(projZoom >= PROJ_ZOOM_MAX)}>+</button>
        </div>

        {/* Content */}
        <div style={{ maxWidth: PROJ_MAX_W, margin: "0 auto", padding: isMobile ? "72px 16px 60px" : "48px 40px 72px" }}>
          {/* Lesson header */}
          <div style={{
            background: `linear-gradient(135deg, ${color}18, ${color}08)`,
            borderRadius: 20, padding: isMobile ? "28px 22px" : "48px 56px",
            marginBottom: isMobile ? 32 : 48,
            border: `2px solid ${color}30`
          }}>
            <div style={{
              fontSize: `max(14px, ${baseFontVw * 0.6}vw)`, color: color,
              fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12
            }}>
              Unité {currentLesson.unit_number} · {currentLesson.theme} · {selectedLevel.name}
            </div>
            <h1 style={{
              fontSize: `max(28px, ${baseFontVw * 1.6}vw)`, fontWeight: 800,
              color: "#111827", margin: "0 0 16px", lineHeight: 1.2
            }}>{currentLesson.title}</h1>
            <p style={{
              fontSize: `max(16px, ${baseFontVw * 0.85}vw)`, color: "#4B5563",
              margin: 0, lineHeight: 1.7
            }}>{currentLesson.objective}</p>
          </div>

          {/* All sections — expanded, no collapse */}
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {lessonSections.filter(s => s.section_type !== "exercise")
              .filter(s => !(projectorLocked && s.section_type === "bilan")).map((section, i) => {
              const accentColors = { intro: "#3B82F6", content: "#0F4C35", video: "#EF4444", activity: "#8B5CF6", bilan: "#D97706" };
              const accent = accentColors[section.section_type] || "#6B7280";
              const blocks = sectionBlocks[section.id] || [];

              return (
                <div key={i}>
                  {/* Section header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 16,
                    marginBottom: 24, paddingBottom: 16,
                    borderBottom: `3px solid ${accent}30`
                  }}>
                    <span style={{ fontSize: `max(28px, ${baseFontVw * 1.3}vw)` }}>{section.icon}</span>
                    <span style={{
                      fontSize: `max(22px, ${baseFontVw * 1.2}vw)`, fontWeight: 800, color: "#111827"
                    }}>{section.title}</span>
                  </div>

                  {/* Blocks */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                    {blocks.length === 0 ? (
                      <div style={{
                        background: "#F9FAFB", borderRadius: 16, padding: "40px",
                        textAlign: "center", color: "#9CA3AF",
                        fontSize: `max(16px, ${baseFontVw * 0.8}vw)`
                      }}>
                        Contenu à venir pour cette section.
                      </div>
                    ) : (
                      blocks.map((block, k) => {
                        if (section.section_type === "bilan" && HIDE_BILAN_IMAGES && block.block_type === "image") return null;
                        if (block.block_type === "text") {
                          // The Bilan section is the trace écrite ("à recopier"):
                          // heavier, larger and more open so it survives projector
                          // blur when pupils copy it letter by letter. Inline **bold**
                          // signposts stay at 700 and still stand out over the 600 base.
                          const isCopyText = section.section_type === "bilan";
                          // Trace écrite et devoir en cursive (voir CURSIVE_FONT) ;
                          // le « Récapitulons » oral garde la police normale.
                          const cursiveFrom = isCopyText ? bilanCursiveFrom(blocks) : -1;
                          const isCursive = cursiveFrom !== -1 && k >= cursiveFrom;
                          return (
                            <div key={k} style={{
                              fontSize: isCopyText ? copyPx : basePx,
                              color: "#1F2937",
                              fontWeight: isCopyText ? 600 : 400,
                              // Interligne resserré depuis 2026-10-01 : à 2,1 et
                              // 1,9 il était calibré pour de petites lettres.
                              // Avec des lettres deux à trois fois plus hautes,
                              // le même rapport faisait des trous entre les
                              // lignes plus grands que les lettres elles-mêmes.
                              lineHeight: isCopyText ? 1.8 : 1.6,
                              whiteSpace: "pre-wrap",
                              // Plus de colonne à 1000 px : le texte occupe
                              // toute la largeur utile de la projection.
                              maxWidth: "100%"
                            }}>
                              {isCursive ? renderCursiveText(block.text_content) : renderRichText(block.text_content)}
                            </div>
                          );
                        }
                        if (block.block_type === "image" && block.media_url) {
                          return (
                            <figure key={k} style={{
                              margin: "16px 0", textAlign: "center", width: "100%", maxWidth: "100%"
                            }}>
                              <img
                                src={block.media_url}
                                alt={block.alt_text || ""}
                                style={{
                                  width: "100%",
                                  maxWidth: "100%", maxHeight: "80vh", objectFit: "contain",
                                  borderRadius: 16, display: "block", margin: "0 auto",
                                  boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
                                  cursor: "pointer", transition: "transform 0.3s"
                                }}
                                onClick={e => { e.currentTarget.style.transform = e.currentTarget.style.transform === "scale(1.4)" ? "none" : "scale(1.4)"; }}
                              />
                              {block.caption && (
                                <figcaption style={{
                                  fontSize: `max(14px, ${baseFontVw * 0.7}vw)`,
                                  color: "#6B7280", marginTop: 12
                                }}>
                                  {block.caption}
                                </figcaption>
                              )}
                            </figure>
                          );
                        }
                        if (block.block_type === "video" && block.media_url) {
                          // Projector skin, same offline-first logic as the
                          // reading view — one component, so a fix cannot land
                          // on one screen and miss the other.
                          return (
                            <LessonVideo
                              key={k}
                              url={block.media_url}
                              caption={block.caption}
                              online={online}
                              variant="projector"
                              baseFontVw={baseFontVw}
                            />
                          );
                        }
                        return null;
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 64, paddingTop: 32, borderTop: "2px solid #E5E7EB",
            textAlign: "center", color: "#9CA3AF",
            fontSize: `max(14px, ${baseFontVw * 0.6}vw)`
          }}>
            EduCam · {currentLesson.title} · {selectedLevel.name}
          </div>
        </div>
      </div>
    );
  };

  // ============ MAIN RENDER ============
  const presentBtn = { background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", borderRadius: 8, padding: "7px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer" };
  // The projector window renders ONLY the lesson (no teacher chrome).
  if (isPresentWindow) {
    return (
      <div className="ec-app">
        {projectorMode && currentLesson ? ProjectorView() : (
          <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FAF9F5", color: COLORS.ink3, fontSize: FONT.md }}>Chargement de la leçon…</div>
        )}
      </div>
    );
  }
  return (
    <div className={`ec-app${isParent ? " ec-app--parent" : ""}`}>
      {/* Called as functions, not <Components />, to avoid remounting on every
          Dashboard render — same fix as LessonScreen (these are inline-defined,
          hook-free components, so inlining their output is safe). */}
      {projectorMode && ProjectorView()}
      {Header()}
      {impersonating && (
        <div style={{ background: COLORS.warnBg, color: COLORS.warn, borderBottom: `1px solid ${COLORS.border}`, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: FONT.sm, fontWeight: 700 }}>👁 Vous agissez en tant que {impersonationName || "cet utilisateur"}</span>
          <Button size="sm" onClick={onExitImpersonation}>Quitter l'aperçu</Button>
        </div>
      )}
      {presenting && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 10000, background: COLORS.g700, color: "#fff", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", flexWrap: "wrap", boxShadow: "0 -2px 14px rgba(0,0,0,.25)" }}>
          <span style={{ fontSize: FONT.sm, fontWeight: 800 }}>📽 Leçon projetée</span>
          <span style={{ fontSize: 12, opacity: .85, flex: 1, minWidth: 140 }}>Vous pouvez continuer sur la plateforme ; la classe voit la leçon au tableau.</span>
          <button onClick={() => projectorPost({ cmd: "top" })} style={presentBtn} title="Haut de la leçon">⤒</button>
          <button onClick={() => projectorPost({ cmd: "scroll", factor: -1 })} style={presentBtn} title="Monter">↑</button>
          <button onClick={() => projectorPost({ cmd: "scroll", factor: 1 })} style={presentBtn} title="Descendre">↓</button>
          <button onClick={() => projectorPost({ cmd: "bottom" })} style={presentBtn} title="Bas de la leçon">⤓</button>
          {/* Le zoom aussi depuis le portable : la fenêtre projetée est au
              tableau, l'enseignante est à son bureau. Sans ces trois boutons,
              il faudrait aller cliquer sur l'écran de la classe. */}
          <button onClick={() => bumpZoom(-1)} style={presentBtn} title="Réduire le texte">−</button>
          <button onClick={resetZoom} style={{ ...presentBtn, minWidth: 58 }} title="Taille d'origine">{Math.round(projZoom * 100)} %</button>
          <button onClick={() => bumpZoom(1)} style={presentBtn} title="Agrandir le texte">+</button>
          <button onClick={stopPresenter} style={{ ...presentBtn, background: "rgba(255,255,255,.92)", color: COLORS.g800 }}>✕ Arrêter</button>
        </div>
      )}
      {OFFLINE_ENABLED && !online && (
        <div role="status" style={{
          background: COLORS.warnBg, color: COLORS.warn, textAlign: "center",
          fontSize: "var(--ec-fs-2)", fontWeight: 600, padding: "9px 12px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          {pending > 0
            ? `Hors ligne — ${pending} saisie${pending > 1 ? "s" : ""} gardée${pending > 1 ? "s" : ""}, elle${pending > 1 ? "s" : ""} partira${pending > 1 ? "ont" : ""} au retour du réseau.`
            : isSchoolAdmin
              // La direction ne « télécharge » pas de leçons : ce qu'elle doit
              // savoir, c'est que les écrans restent lisibles mais figés.
              ? "Hors ligne — consultation seule. Les chiffres affichés datent de la dernière connexion."
              : "Hors ligne — les leçons téléchargées restent disponibles."}
        </div>
      )}
      {/* Connected, work waiting, but the login has expired: the queue is stuck
          and only a re-login frees it. Saying "it will go when the network
          returns" here would be false — the network is already back. */}
      {OFFLINE_ENABLED && online && pending > 0 && syncBlocked && (
        <div role="alert" style={{
          background: COLORS.critBg, color: COLORS.crit, textAlign: "center",
          fontSize: "var(--ec-fs-2)", fontWeight: 600, padding: "9px 12px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          Reconnectez-vous pour envoyer vos {pending} saisie{pending > 1 ? "s" : ""} en attente — elles sont gardées en sécurité.
        </div>
      )}
      <main className="ec-main">
        {screen === "home" && isParent && (
          <div>
            <h1 className="ec-h1">
              {parent?.full_name ? `Bonjour ${parent.full_name.split(" ")[0]}` : "Espace parent"}
            </h1>
            <p className="ec-sub">
              {parentStudent?.full_name ? `Suivi de ${parentStudent.full_name}` : "Suivez la progression de votre enfant"}
              {selectedLevel?.name ? ` · ${selectedLevel.name}` : ""}
            </p>

            {/* Deux colonnes sur ordinateur (2026-08-13) : à gauche « comment va
                mon enfant », à droite « qu'est-ce que je fais ce soir ». Empilé,
                le parent devait faire défiler pour relier le constat à l'action.
                Sur téléphone la grille s'effondre : rien ne change. */}
            <div className="ec-grid" style={{ marginTop: 16 }}>
            <div className="ec-c5" style={{ display: "grid", gap: 14, alignContent: "start" }}>

            {(() => {
              const first = parentStudent?.full_name?.split(" ")[0] || "votre enfant";
              const scored = parentResults.filter((r) => r.total > 0 && r.score != null);
              if (!scored.length) return null;

              // Une semaine glissante, à partir des contrôles corrigés.
              const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
              const recent = scored.filter((r) => String(r.result_date) >= weekAgo);

              // Moyenne par matière, pour nommer ce qui va bien et ce qui coince.
              const bySubj = new Map();
              scored.forEach((r) => {
                const id = r.lessons?.subject_id || "autre";
                if (!bySubj.has(id)) bySubj.set(id, []);
                bySubj.get(id).push((r.score / r.total) * 100);
              });
              const subjAvg = [...bySubj.entries()].map(([id, arr]) => ({
                name: SUBJECTS.find((sb) => sb.id === id)?.name || "cette matière",
                v: arr.reduce((a, b) => a + b, 0) / arr.length,
              })).sort((a, b) => b.v - a.v);
              const best = subjAvg.find((x) => x.v >= 70);

              // La leçon à revoir la plus récente.
              const weak = [...scored]
                .sort((a, b) => String(b.result_date).localeCompare(String(a.result_date)))
                .find((r) => r.difficulty || r.score / r.total < 0.5);

              return (
                <Card style={{ background: COLORS.hero, borderColor: COLORS.heroBrd }}>
                  <p style={{ fontSize: FONT.base, color: COLORS.g800, lineHeight: 1.6, margin: 0 }}>
                    {recent.length > 0
                      ? <>Cette semaine, <strong>{first}</strong> a été évalué{recent.length > 1 ? "" : ""} sur <strong>{recent.length} leçon{recent.length > 1 ? "s" : ""}</strong>. </>
                      : <>Pas de nouveau contrôle cette semaine pour <strong>{first}</strong>. </>}
                    {best && <>Tout va bien en <strong>{best.name}</strong>. </>}
                    {weak
                      ? <>Une leçon est à revoir à la maison : <strong>{weak.lessons?.title || "leçon"}</strong>.</>
                      : <>Aucune leçon n'est à revoir pour le moment.</>}
                  </p>
                  {/* Conseil d'accompagnement : ce qui manque à un parent peu
                      scolarisé, ce n'est pas le titre de la leçon, c'est de
                      savoir QUOI FAIRE avec son enfant ce soir. */}
                  {(() => {
                    if (!PARENT_TIP_ENABLED || !weak) return null;
                    const tip = (availableLessons.find((l) => l.id === weak.lesson_id) || {}).parent_tip;
                    if (!tip || !String(tip).trim()) return null;
                    return (
                      <div className="ec-advice">
                        <b>Comment l'aider, concrètement</b>
                        {tip}
                      </div>
                    );
                  })()}

                  {weak && weak.lesson_id != null && (
                    <div style={{ marginTop: 12 }}>
                      <Button size="sm" onClick={() => openLesson(weak.lesson_id)}>
                        Revoir cette leçon ensemble
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* ---- TABLEAU DE BORD DE L'ENFANT ----
                 Un parent ouvre EduCam pour savoir comment va son enfant : les
                 chiffres passent donc devant, avant les leçons à revoir. */}
            {(() => {
              const withPct = parentResults.filter((r) => r.total > 0 && r.score != null);
              const avg20 = withPct.length
                ? (withPct.reduce((a, r) => a + (r.score / r.total) * 100, 0) / withPct.length) * 0.2
                : null;
              const reviewIds = new Set();
              parentResults.forEach((r) => {
                const weak = r.difficulty || (r.total > 0 && r.score != null && r.score / r.total < 0.5);
                if (weak && r.lesson_id != null) reviewIds.add(r.lesson_id);
              });
              return (
                <div style={{
                  display: "grid", gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))",
                }}>
                  <StatTile label="Moyenne" tint="blue"
                    value={avg20 != null ? fr(avg20) : "—"}
                    unit={avg20 != null ? "/20" : ""}
                    foot={withPct.length
                      ? `${withPct.length} contrôle${withPct.length > 1 ? "s" : ""} corrigé${withPct.length > 1 ? "s" : ""}`
                      : "aucun contrôle encore"}
                    onClick={() => setScreen("results")} />
                  <StatTile label="Leçons à revoir" tint="amber"
                    value={reviewIds.size}
                    foot={reviewIds.size ? "à retravailler ensemble" : "aucune difficulté"}
                    onClick={() => setScreen("results")} />
                  <StatTile label="Messages" tint="violet"
                    value={unreadCount}
                    foot={unreadCount ? "non lus" : "tout est lu"}
                    onClick={() => { setOpenMsg(null); setScreen("messages"); }} />
                </div>
              );
            })()}

            {inbox.length > 0 && (
              <div>
                <ListRow
                  icon="✉" title="Boîte de réception"
                  meta={unreadCount > 0
                    ? `${unreadCount} nouveau${unreadCount > 1 ? "x" : ""} message${unreadCount > 1 ? "s" : ""} · ${inbox[0].subject || "Sans objet"}`
                    : `${inbox.length} message${inbox.length > 1 ? "s" : ""} · dernier : ${inbox[0].subject || "Sans objet"}`}
                  onClick={() => { setOpenMsg(null); setScreen("messages"); }}
                  right={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {unreadCount > 0 && <Badge tone="crit">{unreadCount}</Badge>}
                      <span aria-hidden="true" style={{ color: COLORS.ink3, fontSize: "var(--ec-fs-4)" }}>›</span>
                    </span>
                  }
                />
              </div>
            )}

            </div>{/* fin colonne gauche */}

            <div className="ec-c7" style={{ display: "grid", gap: 14, alignContent: "start" }}>

            {parentResults.length === 0 ? (
              <Card>
                <EmptyState icon="📊" title="Pas encore de résultats">
                  Les résultats de votre enfant et les leçons à revoir apparaîtront ici
                  après les premiers contrôles de compréhension en classe.
                </EmptyState>
              </Card>
            ) : (() => {
              const withPct = parentResults.filter((r) => r.total > 0 && r.score != null);
              const avg20 = withPct.length ? (withPct.reduce((a, r) => a + (r.score / r.total) * 100, 0) / withPct.length) * 0.2 : null;
              const band = avg20 == null ? null : avg20 < 10 ? { label: "En difficulté", tone: "crit" } : avg20 < 14 ? { label: "À surveiller", tone: "warn" } : null;
              const spark = [...withPct]
                .sort((a, b) => String(a.result_date).localeCompare(String(b.result_date)))
                .slice(-10)
                .map((r) => (r.score / r.total) * 100 * 0.2);
              const reviewMap = new Map();
              [...parentResults]
                .sort((a, b) => String(b.result_date).localeCompare(String(a.result_date)))
                .forEach((r) => {
                  const weak = r.difficulty || (r.total > 0 && r.score != null && r.score / r.total < 0.5);
                  if (weak && r.lesson_id != null && !reviewMap.has(r.lesson_id)) reviewMap.set(r.lesson_id, r);
                });
              const reviewLessons = Array.from(reviewMap.values());
              const childFirst = parentStudent?.full_name?.split(" ")[0] || "votre enfant";
              return (
                <>
                  {/* Suivi de l'enfant — carte héros, même langage que l'accueil enseignant */}
                  <div style={{ background: COLORS.g700, color: "#fff", borderRadius: "var(--ec-r-lg)", padding: 18 }}>
                    <div style={{ fontSize: FONT.xs, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", opacity: .75 }}>
                      Moyenne de {childFirst}
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 7 }}>
                      <div style={{ fontSize: "var(--ec-fs-7)", fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1 }}>
                        {avg20 == null ? "—" : fr(avg20)}
                        {avg20 != null && <span style={{ fontSize: "var(--ec-fs-4)", opacity: .8, fontWeight: 600 }}> /20</span>}
                      </div>
                      {band && (
                        <span style={{ fontSize: "var(--ec-fs-2)", fontWeight: 700, background: "rgba(255,255,255,.18)", borderRadius: 999, padding: "3px 10px" }}>
                          {band.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: FONT.sm, opacity: .85, marginTop: 6 }}>
                      {withPct.length} contrôle{withPct.length > 1 ? "s" : ""}
                      {reviewLessons.length > 0 ? ` · ${reviewLessons.length} à revoir` : " · aucune difficulté 🎉"}
                    </div>
                    {spark.length >= 2 && <Sparkline values={spark} color="#97D3BD" height={34} />}
                  </div>

                  <div>
                    <ListRow
                      icon="◔" title="Voir la progression détaillée"
                      meta="Notes par matière et évolution dans le temps"
                      onClick={() => setScreen("results")}
                    />
                  </div>

                  <Card>
                  <div className="ec-cardhd"><h2 className="ec-cardtitle">À revoir à la maison</h2></div>
                  <p style={{ color: COLORS.ink3, margin: "0 0 12px", fontSize: FONT.sm, lineHeight: 1.5 }}>
                    Le contenu officiel de la leçon, tel que l'enseignant l'a fait en classe.
                    Ouvrez-la pour réviser ensemble.
                  </p>
                  {reviewLessons.length === 0 ? (
                    <Callout tone="brand" icon="🎉">Aucune leçon à revoir pour le moment — bravo !</Callout>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {reviewLessons.map((r) => (
                        <ListRow
                          key={r.lesson_id}
                          icon={getSubjectIcon(r.lessons?.subject_id)}
                          title={r.lessons?.title || "Leçon"}
                          meta={`Dernier contrôle : ${r.score}/${r.total} · ${r.result_date}`}
                          onClick={() => openLesson(r.lesson_id)}
                          right={
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <Badge tone="crit">À revoir</Badge>
                              <span aria-hidden="true" style={{ color: COLORS.ink3, fontSize: "var(--ec-fs-4)" }}>›</span>
                            </span>
                          }
                        />
                      ))}
                    </div>
                  )}
                  </Card>
                </>
              );
            })()}

            <h2 style={{ fontSize: "var(--ec-fs-4)", fontWeight: 800, letterSpacing: "-.02em", margin: "8px 0 0" }}>Explorer les leçons</h2>
            <div className="ec-grid ec-grid--wide">
              <ListRow
                icon="▤" title="Emploi du temps"
                meta="Les cours de la semaine, jour par jour"
                onClick={() => { setTab("calendar"); setScreen("calendar"); }}
              />
              <ListRow
                icon="◈" title="Programme"
                meta="Toutes les leçons de la classe, par matière"
                onClick={() => { setTab("programme"); setScreen("programme"); setProgrammeView("subjects"); }}
              />
            </div>

            </div>{/* fin colonne droite */}
            </div>{/* fin grille */}
          </div>
        )}

        {screen === "home" && !isParent && !isAdmin && !isSchoolAdmin && (() => {
          const heroLesson = upcomingSlot ? slotLesson(upcomingSlot) : null;
          const heroCached = heroLesson && cachedIds.includes(heroLesson.id);

          // Objectifs de séance : `objective` est un texte libre. On le découpe
          // sur les séparateurs usuels et on n'en garde que trois.
          const objectives = (heroLesson?.objective || "")
            .split(/\s*[;·•\n]\s*/).map((s) => s.trim()).filter(Boolean).slice(0, 3);

          // Avancement par matière — exactement la source de l'écran Programme
          // (sujets au calendrier vs leçons réellement disponibles).
          const progress = SUBJECTS
            .map((s) => ({
              name: s.name,
              done: availableLessons.filter((l) => l.subject_id === s.id).length,
              total: topics.filter((t) => t.subject_id === s.id).length,
            }))
            .filter((s) => s.total > 0)
            .sort((a, b) => (b.done / b.total) - (a.done / a.total))
            .slice(0, 4);

          // Bandeau d'indicateurs. Uniquement des données que cet écran charge
          // déjà : pas de requête supplémentaire au chargement de l'accueil.
          const tiles = [
            {
              label: "Cours aujourd'hui", value: lessonSlotsToday.length, tint: "green",
              foot: upcomingSlot ? `prochain à ${fmtHour(upcomingSlot.start_time)}` : "journée terminée",
              onClick: () => { setTab("calendar"); setScreen("calendar"); },
            },
            {
              label: "Moyenne de classe", tint: "blue",
              value: classStats?.avg20 != null ? fr(classStats.avg20) : "—",
              unit: classStats?.avg20 != null ? "/20" : "",
              // Never « chargement… » once we have stopped trying: either the
              // numbers with the date they were read, or a plain statement that
              // they are unavailable. A tile that claims to be loading forever
              // leaves the teacher waiting for something that is not coming.
              foot: classStats
                ? [
                    classStats.evaluated
                      ? `${classStats.evaluated} élève${classStats.evaluated > 1 ? "s" : ""} évalué${classStats.evaluated > 1 ? "s" : ""} sur ${classStats.students}`
                      : "aucun résultat saisi",
                    classStatsAt ? `· au ${freshnessLabel(classStatsAt)}` : null,
                  ].filter(Boolean).join(" ")
                : classStatsSettled ? "indisponible hors ligne" : "chargement…",
              onClick: () => openResults("class"),
            },
            {
              label: "Élèves à suivre", tint: "amber",
              value: classStats ? classStats.atRisk : "—",
              foot: classStats
                ? [
                    classStats.atRisk ? "moyenne sous 10 / 20" : "aucun élève sous 10 / 20",
                    classStatsAt ? `· au ${freshnessLabel(classStatsAt)}` : null,
                  ].filter(Boolean).join(" ")
                : classStatsSettled ? "indisponible hors ligne" : "chargement…",
              onClick: () => openResults("class"),
            },
          ];
          if (OFFLINE_ENABLED) {
            tiles.push({
              label: "Leçons hors ligne", value: cachedIds.length, tint: "violet",
              // LOT 14 — cette tuile compte des LEÇONS : son sous-titre doit
              // parler de leçons. Le décompte d'accès vivait ici uniquement
              // parce qu'il n'avait pas d'autre place ; il en a une maintenant.
              foot: coverageLabel || "prêtes sans réseau · ne périment pas",
              onClick: () => { setTab("calendar"); setScreen("calendar"); },
            });
          }

          // Rien de téléchargé ET aucun résultat saisi : l'école démarre.
          // `classStats` à null = requête en cours, on n'affiche pas la mise en
          // route par erreur pendant le chargement.
          const coldStart = !!classStats && classStats.evaluated === 0 && cachedIds.length === 0;

          // Accès rapides — une seule source, deux rendus : grille compacte de
          // 6 sur grand écran, liste `ListRow` inchangée sur téléphone.
          const quick = [
            { key: "calendar", icon: "▤", tint: "green", title: "Emploi du temps",
              meta: `${lessonSlotsToday.length} cours aujourd'hui`,
              onClick: () => { setTab("calendar"); setScreen("calendar"); } },
            { key: "programme", icon: "◈", tint: "blue", title: "Programme",
              meta: `${availableLessons.length} leçons · unité ${selectedUnit}`,
              onClick: () => { setTab("programme"); setScreen("programme"); setProgrammeView("subjects"); } },
          ];
          if (PROFILES_ENABLED && !isAdmin) quick.push({
            key: "results", icon: "✓", tint: "amber", title: "Résultats",
            meta: "Saisir et suivre les notes", onClick: () => openResults("entry"),
          });
          if (isSchoolAdmin) quick.push({
            key: "schooldash", icon: "▦", tint: "violet", title: "Tableau de bord",
            meta: "Avance, moyennes, élèves à suivre", onClick: () => setScreen("schooldash"),
          });
          if (isSchoolAdmin) quick.push({
            key: "schooladmin", icon: "👥", tint: "green", title: "Gérer l'école",
            meta: "Élèves, enseignants, horaires", onClick: () => setScreen("schooladmin"),
          });
          if (isAdmin) quick.push({
            key: "admin", icon: "✎", tint: "blue", title: "Gestion des leçons",
            meta: "Créer et corriger le contenu", onClick: () => setScreen("admin"),
          });
          if (isAdmin) quick.push({
            key: "adminschools", icon: "🏫", tint: "amber", title: "Écoles",
            meta: "Élèves, codes, emplois du temps",
            onClick: () => { setScreen("adminschools"); loadAdminSchools(); } });
          if (isAdmin) quick.push({
            key: "adminusers", icon: "◍", tint: "green", title: "Utilisateurs",
            meta: "Noms, rôles, téléphones",
            onClick: () => { setScreen("adminusers"); loadAdminUsers(); } });
          if (PROFILES_ENABLED && (isAdmin || isSchoolAdmin)) quick.push({
            key: "activitylog", icon: "◔", tint: "violet", title: "Activité",
            meta: "Qui utilise vraiment EduCam", onClick: () => setScreen("activitylog"),
          });
          // Lot D — la vue des échanges. Le chargement se fait par l'effet lié à
          // `screen`, pas ici : un raccourci ne doit pas dupliquer une requête.
          if (PROFILES_ENABLED && isSchoolAdmin) quick.push({
            key: "exchanges", icon: "⇄", tint: "blue", title: "Échanges de l'école",
            meta: "Messages des enseignants aux parents", onClick: () => setScreen("exchanges"),
          });

          return (
          <div>
            <div style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ minWidth: 0 }}>
                <h1 className="ec-h1">
                  Bonjour {(teacher?.full_name || "").split(" ")[0] || "Enseignant"}
                </h1>
                <p className="ec-sub">
                  {now ? capitalize(dateLabel(now)) : " "} · Unité {selectedUnit} · Semaine {selectedWeek} · {selectedLevel.name}
                </p>
              </div>

              {/* L'expiration du droit hors ligne n'était affichée nulle part :
                  la découvrir en pleine classe est le pire des scénarios.

                  LOT 14 — ce voyant ne parle plus QUE de l'accès, et il en
                  donne la DATE. Ce que couvrent les leçons téléchargées se dit
                  ailleurs, dans la carte « Hors ligne », parce que c'est une
                  autre horloge : celle-là ne s'arrête jamais. */}
              {OFFLINE_ENABLED && grantUntil != null && (
                <span
                  className="ec-btn ec-btn--sm"
                  style={{
                    cursor: "default", pointerEvents: "none",
                    background: grantDaysLeft <= 1 ? COLORS.warnBg : COLORS.g50,
                    borderColor: grantDaysLeft <= 1 ? "#E3CDA0" : COLORS.g200,
                    color: grantDaysLeft <= 1 ? COLORS.warn : COLORS.g800,
                    fontWeight: 700, gap: 8,
                  }}
                  title={`L'accès sans réseau est valable jusqu'au ${dayMonth(grantUntil)}. Il repart à 7 jours à chaque fois que vous ouvrez l'application connectée. Les leçons déjà téléchargées, elles, restent disponibles sans limite de temps.`}
                >
                  <i aria-hidden="true" style={{
                    width: 8, height: 8, borderRadius: "50%", flex: "none",
                    background: grantDaysLeft <= 1 ? COLORS.warn : COLORS.good,
                  }} />
                  {/* "Prêt" requires BOTH halves. Downloaded lessons alone are
                      not readiness: without the precached shell the app will
                      not even open without a network, and announcing "prêt"
                      then is worse than saying nothing — it is exactly when
                      the teacher stops checking. */}
                  {cachedIds.length > 0 && !shellReady
                    ? "Préparation en cours…"
                    : `Accès hors ligne jusqu'au ${dayMonth(grantUntil)}`}
                </span>
              )}
            </div>

            <div className="ec-grid" style={{ marginTop: 16 }}>

              {/* ---- PROCHAIN COURS : l'action de maintenant ---- */}
              {upcomingSlot && (
                <div className="ec-hero ec-c8">
                  <div className="ec-hero__when">
                    <b>{fmtHour(upcomingSlot.start_time)}</b>
                    <i>
                      {currentSlot
                        ? "en cours"
                        : minutesUntil != null && minutesUntil <= 90
                          ? `dans ${minutesUntil} min`
                          : "à venir"}
                      {heroCached ? <><br />téléchargée</> : null}
                    </i>
                  </div>

                  <div className="ec-hero__body">
                    <span className="ec-hero__badge">
                      {currentSlot ? "Cours en cours" : "Prochain cours"}
                    </span>
                    <h2 style={{
                      fontSize: FONT.lg, fontWeight: 700, letterSpacing: "-.02em",
                      margin: "9px 0 4px", lineHeight: 1.2,
                    }}>
                      {upcomingSlot.subject_name}
                      {upcomingSlot.component_name ? ` — ${upcomingSlot.component_name}` : ""}
                    </h2>
                    <p style={{ color: COLORS.heroInk2, fontSize: FONT.md }}>
                      {heroLesson
                        ? `${heroLesson.title}${heroCached ? " · téléchargée hors ligne" : ""}`
                        : "Aucune leçon liée à ce créneau."}
                    </p>
                    {/* Avancement de la JOURNÉE — le seul avancement réel dont
                        on dispose. Une barre de sections « en cours » aurait
                        été décorative : ce statut n'existe pas en base. */}
                    {lessonSlotsToday.length > 1 && (
                      <div style={{ marginTop: 13 }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          fontSize: FONT.xs, color: COLORS.heroInk2, fontWeight: 700, marginBottom: 6,
                        }}>
                          <span>Avancement de la journée</span>
                          <span>
                            cours {Math.max(1, lessonSlotsToday.findIndex((sl) => sl === upcomingSlot) + 1)}
                            {" sur "}{lessonSlotsToday.length}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 5 }}>
                          {lessonSlotsToday.map((sl, i) => (
                            <i key={i} aria-hidden="true" style={{
                              flex: 1, height: 6, borderRadius: 4,
                              background: i <= lessonSlotsToday.findIndex((x) => x === upcomingSlot)
                                ? COLORS.g500 : "rgba(255,255,255,.55)",
                              border: `1px solid ${COLORS.heroBrd}`,
                            }} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Plan de la séance — titres RÉELS des sections. */}
                    {heroPlan.id === heroLesson?.id && heroPlan.sections.length > 0 && (
                      <div className="ec-obj" style={{ marginTop: 12 }}>
                        <div className="ec-obj__l">Plan de la séance</div>
                        <ol style={{
                          listStyle: "none", display: "grid", gap: 5,
                          fontSize: FONT.md, color: COLORS.ink2, lineHeight: 1.45,
                        }}>
                          {heroPlan.sections.map((sec, i) => (
                            <li key={i} style={{ display: "flex", gap: 9 }}>
                              <b style={{ color: COLORS.g600, flex: "none" }}>{i + 1}.</b>
                              <span>{sec.title || "Section sans titre"}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                      {heroLesson && (
                        <Button onClick={() => openLesson(heroLesson.id)}>Ouvrir la leçon</Button>
                      )}
                      {heroLesson && (
                        <Button
                          variant="ghost"
                          disabled={heroPlan.id !== heroLesson.id}
                          onClick={() => markHeroTaught(heroLesson)}
                          style={{
                            background: heroPlan.taught ? COLORS.g50 : "transparent",
                            borderColor: heroPlan.taught ? COLORS.g500 : COLORS.heroBrd,
                            color: heroPlan.taught ? COLORS.g700 : COLORS.heroInk,
                          }}
                        >
                          {heroPlan.taught ? "✓ Enseignée" : "Marquer enseignée"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => { setTab("calendar"); setScreen("calendar"); }}
                        style={{ background: "transparent", borderColor: COLORS.heroBrd, color: COLORS.heroInk }}
                      >
                        Voir la journée
                      </Button>
                    </div>
                    {objectives.length > 0 && (
                      <div className="ec-obj">
                        <div className="ec-obj__l">Objectifs de la leçon</div>
                        <ul className="ec-obj__b">
                          {objectives.map((o, i) => <li key={i}>{o}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="ec-hero__side">
                    <div><span>Unité</span><b>{selectedUnit}</b></div>
                    <div><span>Semaine</span><b>{selectedWeek}</b></div>
                    <div><span>Classe</span><b>{selectedLevel.name}</b></div>
                    <div><span>Hors ligne</span><b>{heroCached ? "prête" : "non"}</b></div>
                  </div>
                </div>
              )}

              {now && todayDow === 0 && (
                <div className="ec-c12">
                  <Callout tone="brand" icon="🌤">
                    Pas de cours aujourd'hui. Vous pouvez préparer la semaine depuis le programme.
                  </Callout>
                </div>
              )}

              {/* ---- SUITE DE LA JOURNÉE ---- */}
              {laterSlots.length > 0 && (
                <Card className="ec-c4">
                  <div className="ec-cardhd">
                    <h2 className="ec-cardtitle">Suite de la journée</h2>
                    <button className="ec-more ec-link" style={{ textDecoration: "none" }}
                      onClick={() => { setTab("calendar"); setScreen("calendar"); }}>
                      Semaine
                    </button>
                  </div>
                  {/* Grand écran : gouttière d'heures, une ligne par créneau */}
                  <ul className="ec-sched">
                    {laterSlots.map((sl, i) => {
                      const lesson = slotLesson(sl);
                      return (
                        <li key={`d-${sl.id || i}-${sl.slot_order || i}`}>
                          <i aria-hidden="true" className="ec-row__bar"
                            style={{ background: subjectColor(sl.subject_name), alignSelf: "stretch", minHeight: 30 }} />
                          <span className="ec-sched__time">{fmtHour(sl.start_time)}</span>
                          <span style={{ minWidth: 0 }}>
                            <span className="ec-sched__t" style={{ display: "block" }}>{sl.subject_name}</span>
                            <span className="ec-sched__s" style={{ display: "block" }}>
                              {sl.component_name || (lesson ? lesson.title : "aucune leçon liée")}
                            </span>
                          </span>
                          {lesson && (
                            <button className="ec-sched__rt ec-link" style={{ textDecoration: "none" }}
                              onClick={() => openLesson(lesson.id)}>
                              Ouvrir
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Téléphone : la liste actuelle, inchangée */}
                  <div className="ec-mobonly">
                    {laterSlots.map((sl, i) => {
                      const lesson = slotLesson(sl);
                      return (
                        <ListRow
                          key={`m-${sl.id || i}-${sl.slot_order || i}`}
                          icon={(sl.subject_name || "?").slice(0, 2)}
                          iconColor={subjectColor(sl.subject_name)}
                          title={`${sl.subject_name}${sl.component_name ? " — " + sl.component_name : ""}`}
                          meta={`${fmtHour(sl.start_time)} · ${lesson ? "leçon disponible" : "aucune leçon liée"}`}
                          onClick={lesson ? () => openLesson(lesson.id) : undefined}
                        />
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* ---- BANDEAU D'INDICATEURS, ou MISE EN ROUTE si rien n'existe ---- */}
              {coldStart ? (
                <div className="ec-c12">
                  <Card style={{ borderColor: COLORS.g300 }}>
                    <div className="ec-cardhd"><h2 className="ec-cardtitle">Mettre EduCam en route</h2></div>
                    <p style={{ fontSize: FONT.md, color: COLORS.ink3, margin: "0 0 14px", lineHeight: 1.5 }}>
                      Trois gestes suffisent pour que l'application vous serve dès demain matin.
                      Les indicateurs de votre classe apparaîtront ensuite ici.
                    </p>
                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
                      {[
                        { n: 1, done: cachedIds.length > 0, icon: "▤",
                          title: "Télécharger les leçons de la semaine",
                          meta: "Pour faire cours même sans réseau",
                          onClick: () => { setTab("calendar"); setScreen("calendar"); } },
                        { n: 2, done: availableLessons.length > 0 && cachedIds.length > 0, icon: "◈",
                          title: "Ouvrir votre première leçon",
                          meta: "Parcourir le programme de la semaine",
                          onClick: () => { setTab("programme"); setProgrammeView("week"); setScreen("programme"); } },
                        { n: 3, done: (classStats?.evaluated || 0) > 0, icon: "✓",
                          title: "Saisir les premiers résultats",
                          meta: "Après le contrôle, corrigé sur papier",
                          onClick: () => openResults("entry") },
                      ].map((step) => (
                        <ListRow
                          key={step.n}
                          icon={step.done ? "✓" : String(step.n)}
                          iconColor={step.done ? COLORS.good : undefined}
                          title={step.title}
                          meta={step.meta}
                          onClick={step.onClick}
                          right={step.done ? <Badge tone="brand">Fait</Badge> : undefined}
                        />
                      ))}
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="ec-c12 ec-deskonly">
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: 18 }}>
                    {tiles.map((t) => (
                      <StatTile key={t.label} label={t.label} value={t.value} unit={t.unit} tint={t.tint} foot={t.foot} onClick={t.onClick} />
                    ))}
                  </div>
                </div>
              )}

              {/* ---- AVANCEMENT PAR MATIÈRE (grand écran) ---- */}
              {progress.length > 0 && (
                <div className="ec-c8 ec-deskonly">
                  <Card>
                    <div className="ec-cardhd">
                      <h2 className="ec-cardtitle">Avancement par matière</h2>
                      <button className="ec-more ec-link" style={{ textDecoration: "none" }}
                        onClick={() => { setTab("programme"); setScreen("programme"); setProgrammeView("subjects"); }}>
                        Programme
                      </button>
                    </div>
                    {progress.map((s, i) => {
                      const goProgramme = () => { setTab("programme"); setScreen("programme"); setProgrammeView("subjects"); };
                      return (
                      <div key={s.name}
                        className="ec-progrow"
                        role="button" tabIndex={0}
                        onClick={goProgramme}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goProgramme(); } }}
                        style={{
                          padding: "11px 8px", margin: "0 -8px", borderRadius: 8,
                          borderTop: i === 0 ? "none" : `1px solid ${COLORS.divider}`,
                          cursor: "pointer",
                        }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 9, fontSize: FONT.md }}>
                          <b style={{ fontWeight: 600 }}>{s.name}</b>
                          <span style={{
                            marginLeft: "auto", fontSize: FONT.sm, color: COLORS.ink3,
                            fontVariantNumeric: "tabular-nums",
                          }}>
                            {s.done} / {s.total}
                          </span>
                        </div>
                        <Meter value={Math.min(s.done, s.total)} max={s.total}
                          color={subjectColor(s.name)} label={`${s.name} : ${s.done} sur ${s.total}`} />
                      </div>
                      );
                    })}
                  </Card>
                </div>
              )}

              {/* ---- HORS LIGNE ---- */}
              {OFFLINE_ENABLED && (
                <Card className="ec-c4">
                  <div className="ec-cardhd"><h2 className="ec-cardtitle">Hors ligne</h2></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: FONT.md, fontWeight: 700 }}>
                        {cachedIds.length > 0
                          ? `${cachedIds.length} leçon${cachedIds.length > 1 ? "s" : ""} téléchargée${cachedIds.length > 1 ? "s" : ""}`
                          : "Aucune leçon téléchargée"}
                      </div>
                      {/* LOT 14 — la phrase qui manquait : jusqu'OÙ va la
                          couverture, et le fait qu'elle ne périme pas. Sans
                          elle, le décompte d'accès voisin laissait croire que
                          les leçons expiraient aussi. */}
                      <div style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 3, lineHeight: 1.5 }}>
                        {cachedIds.length === 0
                          ? "Téléchargez la semaine pour faire cours sans réseau."
                          : coverageLabel
                            ? `Programme couvert ${coverageLabel}. Ces leçons ne périment pas.`
                            : "Disponibles même sans réseau — elles ne périment pas."}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!online || (dl && !dl.finished)}
                      onClick={() => { setTab("calendar"); setScreen("calendar"); }}
                    >
                      Gérer
                    </Button>
                  </div>
                  {/* L'autre horloge, nommée comme telle : c'est l'ACCÈS qui
                      expire, pas les leçons — et on le redit ici, au moment
                      précis où la confusion serait la plus coûteuse. */}
                  {grantUntil != null && grantDaysLeft <= 2 && (
                    <Callout tone="warn" icon="⏳" style={{ marginTop: 11 }}>
                      Votre <strong>accès</strong> hors ligne expire {grantDaysLeft === 0 ? "aujourd'hui" : `le ${dayMonth(grantUntil)}`}.
                      Connectez-vous une fois en ligne pour repartir sur 7 jours.
                      {cachedIds.length > 0 ? " Vos leçons téléchargées, elles, restent en place." : ""}
                    </Callout>
                  )}
                </Card>
              )}

              {/* ---- ACCÈS RAPIDES — TÉLÉPHONE UNIQUEMENT ----
                   Sur grand écran, ces destinations vivent dans le rail de
                   gauche, permanent sur tous les écrans : inutile de les
                   répéter en bas de page. Le téléphone n'a pas de rail (barre
                   basse réduite aux entrées principales), la liste y reste. */}
              <div className="ec-c12 ec-mobonly">
                <Card>
                  <div className="ec-cardhd"><h2 className="ec-cardtitle">Accès rapides</h2></div>
                  <div className="ec-quicklist">
                    {quick.map((q) => (
                      <ListRow key={q.key} icon={q.icon} title={q.title} meta={q.meta} onClick={q.onClick} />
                    ))}
                  </div>
                </Card>
              </div>

            </div>
          </div>
          );
        })()}

        {/* ---- ACCUEIL DIRECTEUR : le tableau de bord EST l'accueil ----
             Un directeur n'ouvre pas EduCam pour savoir quel est son prochain
             cours : il l'ouvre pour savoir où en sont ses classes. */}
        {screen === "home" && isSchoolAdmin && (
          <SchoolDashboard
            school={schoolContext}
            onOpenTab={() => setScreen("schooladmin")}
          />
        )}

        {/* ---- ACCUEIL ADMINISTRATEUR : console de la plateforme ---- */}
        {/* ---- ACCUEIL SUPERADMINISTRATEUR : vue d'ensemble du réseau ----
             Recomposé le 2026-08-13 pour coller à la maquette validée : les
             indicateurs d'ADOPTION passent devant les compteurs bruts (savoir
             qu'il y a 86 comptes n'apprend rien ; savoir que 78 s'en servent,
             si), le tableau des écoles et l'intégrité cohabitent sur une ligne. */}
        {screen === "home" && isAdmin && (
          <div>
            <div style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ minWidth: 0 }}>
                <h1 className="ec-h1">Vue d'ensemble du réseau</h1>
                <p className="ec-sub">
                  {adminStats ? `${adminStats.schools} école${adminStats.schools > 1 ? "s" : ""}` : "…"}
                  {" · suivi de l'adoption et de l'intégrité des saisies"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button variant="ghost" onClick={() => setScreen("activitylog")}>Ouvrir le journal</Button>
                <Button onClick={() => { setScreen("adminschools"); loadAdminSchools(); }}>
                  + Enregistrer une école
                </Button>
              </div>
            </div>

            <div className="ec-grid" style={{ marginTop: 16 }}>

              {/* ---- INDICATEURS D'ADOPTION ---- */}
              <div className="ec-c12">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", gap: 18 }}>
                  <StatTile label="Écoles" tint="green"
                    value={adminStats ? adminStats.schools : "—"}
                    foot={adminStats
                      ? (adminStats.schoolsActive === adminStats.schools && adminStats.schools > 0
                          ? "toutes actives cette semaine"
                          : `${adminStats.schoolsActive} active${adminStats.schoolsActive > 1 ? "s" : ""} cette semaine`)
                      : "chargement…"}
                    onClick={() => { setScreen("adminschools"); loadAdminSchools(); }} />
                  <StatTile label="Enseignants" tint="blue"
                    value={adminStats ? adminStats.teachers : "—"}
                    foot={adminStats ? `${adminStats.teachers7} connecté${adminStats.teachers7 > 1 ? "s" : ""} ces 7 jours` : "chargement…"}
                    onClick={() => openActivity("teachers")} />
                  <StatTile label="Parents actifs" tint="amber"
                    value={adminStats && adminStats.parents > 0
                      ? Math.round((adminStats.parents30 / adminStats.parents) * 100)
                      : "—"}
                    unit={adminStats && adminStats.parents > 0 ? "%" : ""}
                    foot={adminStats
                      ? `${adminStats.parents30} sur ${adminStats.parents} compte${adminStats.parents > 1 ? "s" : ""}`
                      : "chargement…"}
                    onClick={() => openActivity("parents")} />
                  <StatTile label="Anomalies ouvertes"
                    tint={Array.isArray(anomalies) && anomalies.length > 0 ? "crit" : "violet"}
                    value={Array.isArray(anomalies) ? anomalies.length : anomalies === false ? "—" : "…"}
                    foot={anomalies === false ? "détection non activée"
                      : Array.isArray(anomalies) && anomalies.length === 0 ? "rien à vérifier"
                      : "motifs à vérifier"}
                    onClick={() => openActivity("journal")} />
                </div>
              </div>

              {/* ---- ÉTAT DES ÉCOLES + VOLUME D'ACTIVITÉ ---- */}
              <Card className="ec-c7">
                <div className="ec-cardhd">
                  <h2 className="ec-cardtitle">État des écoles</h2>
                  <button className="ec-more ec-link" style={{ textDecoration: "none" }}
                    onClick={() => { setScreen("adminschools"); loadAdminSchools(); }}>
                    Gérer les écoles
                  </button>
                </div>

                {!adminStats ? (
                  <SkeletonRows rows={3} />
                ) : adminStats.table.length === 0 ? (
                  <EmptyState icon="🏫" title="Aucune école enregistrée">
                    Créez le premier établissement pour voir le réseau se remplir ici.
                  </EmptyState>
                ) : (
                  <table className="ec-table">
                    <thead>
                      <tr>
                        <th>Établissement</th><th>Région</th>
                        <th className="num">Classes</th><th>Avancement</th><th>Activité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.table.slice(0, 8).map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700 }}>{r.name}</td>
                          <td>{r.region}</td>
                          <td className="num">{r.classes}</td>
                          <td>
                            {r.pct == null ? (
                              <span style={{ color: COLORS.ink3 }}>non renseigné</span>
                            ) : (
                              <>
                                <b style={{ fontSize: FONT.sm }}>{r.pct} %</b>
                                <Meter value={r.pct} max={100}
                                  color={r.pct >= 80 ? COLORS.g500 : r.pct >= 60 ? COLORS.warn : COLORS.crit} />
                              </>
                            )}
                          </td>
                          <td>
                            <Badge tone={r.active ? "brand" : "neutral"}>
                              {r.active ? "cette semaine" : "silencieuse"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {adminStats && adminStats.coverageMissing && (
                  <Callout tone="warn" icon="⚙">
                    La colonne « Avancement » reste vide : la vue <code>educam_coverage</code>
                    {" "}n'a pas répondu. Vérifiez que <strong>schooldashboard-aggregates.sql</strong> est bien appliqué.
                  </Callout>
                )}

                {adminStats && (
                  <div style={{ borderTop: `1px solid ${COLORS.divider}`, paddingTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 9 }}>
                      <span style={{
                        fontSize: FONT.xs, fontWeight: 800, letterSpacing: ".08em",
                        textTransform: "uppercase", color: COLORS.ink3,
                      }}>
                        Volume d'activité · 14 derniers jours
                      </span>
                      <span style={{ fontSize: FONT.sm, fontWeight: 700, color: COLORS.g700 }}>
                        {adminStats.events14.toLocaleString("fr-FR")} événement{adminStats.events14 > 1 ? "s" : ""}
                      </span>
                    </div>
                    {(() => {
                      const max = Math.max(...adminStats.bins, 1);
                      return (
                        <div className="ec-spark" role="img"
                          aria-label={`Activité des 14 derniers jours : ${adminStats.bins.join(", ")} événements par jour.`}>
                          {adminStats.bins.map((v, i) => (
                            <i key={i} className={v === max && v > 0 ? "is-peak" : undefined}
                              style={{ height: `${Math.max(3, (v / max) * 100)}%` }}
                              title={`${v} événement${v > 1 ? "s" : ""}`} />
                          ))}
                        </div>
                      );
                    })()}
                    {adminStats.capped && (
                      <p style={{ fontSize: FONT.xs, color: COLORS.ink3, marginTop: 8, lineHeight: 1.5 }}>
                        Journal plafonné aux {ACT_CAP.toLocaleString("fr-FR")} événements les plus récents :
                        les chiffres ci-dessus portent sur cette tranche, pas sur la totalité.
                      </p>
                    )}
                  </div>
                )}
              </Card>

              {/* ---- INTÉGRITÉ ----
                   Une anomalie n'est pas une accusation : c'est un motif de
                   vérifier. Le détail nomme le fait constaté, jamais une intention. */}
              <Card className="ec-c5">
                <div className="ec-cardhd">
                  <h2 className="ec-cardtitle">Anomalies détectées</h2>
                  {Array.isArray(anomalies) && anomalies.length > 6 && (
                    <button className="ec-more ec-link" style={{ textDecoration: "none" }}
                      onClick={() => setScreen("activitylog")}>
                      Tout voir
                    </button>
                  )}
                </div>
                <p style={{ fontSize: FONT.sm, color: COLORS.ink3, margin: "-6px 0 4px", lineHeight: 1.5 }}>
                  Calculées sur le journal d'activité. Une anomalie n'est pas une
                  accusation : c'est un motif à vérifier.
                </p>

                {anomalies === null ? (
                  <SkeletonRows rows={3} />
                ) : anomalies === false ? (
                  <Callout tone="warn" icon="⚙">
                    Détection non activée. Exécutez <strong>claude-anomalies.sql</strong> dans
                    Supabase : il crée la vue <code>educam_anomalies</code>. Tant qu'elle n'existe
                    pas, cet écran ne peut rien affirmer — il préfère le dire qu'afficher un zéro.
                  </Callout>
                ) : anomalies.length === 0 ? (
                  <EmptyState icon="✓" title="Rien à vérifier">
                    Aucune validation sans ouverture, aucune rafale, aucun parent resté
                    sur le seuil.
                  </EmptyState>
                ) : (
                  <div style={{ display: "grid", gap: 9 }}>
                    {anomalies.slice(0, 6).map((a, i) => (
                      <div key={i} className={`ec-al${a.severity === "crit" ? " ec-al--crit" : a.severity === "warn" ? " ec-al--warn" : ""}`}>
                        <span aria-hidden="true" className="ec-al__b">
                          {a.severity === "crit" ? "!" : a.severity === "warn" ? "◷" : "◍"}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <b className="ec-al__t">{a.title}</b>
                          <p>{a.detail}</p>
                          {a.at && <time dateTime={a.at}>{fmtStamp(a.at)}</time>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* ---- RACCOURCIS ---- */}
              <div className="ec-c12">
                <Card>
                  <div className="ec-cardhd"><h2 className="ec-cardtitle">Ce que vous administrez</h2></div>
                  <div className="ec-quick">
                    {[
                      { key: "adminschools", icon: "⌗", tint: "green", title: "Écoles",
                        meta: "Créer une école, ses classes, ses codes d'accès",
                        onClick: () => { setScreen("adminschools"); loadAdminSchools(); } },
                      { key: "adminusers", icon: "◍", tint: "violet", title: "Utilisateurs",
                        meta: "Corriger un nom, un rôle, un téléphone",
                        onClick: () => { setScreen("adminusers"); loadAdminUsers(); } },
                      { key: "admin", icon: "✎", tint: "blue", title: "Gestion des leçons",
                        meta: "Créer, corriger et publier le contenu",
                        onClick: () => setScreen("admin") },
                      { key: "activitylog", icon: "◔", tint: "amber", title: "Activité",
                        meta: "Qui utilise vraiment EduCam",
                        onClick: () => setScreen("activitylog") },
                      { key: "programme", icon: "◈", tint: "violet", title: "Programme",
                        meta: "Parcourir le curriculum par matière",
                        onClick: () => { setTab("programme"); setProgrammeView("subjects"); setScreen("programme"); } },
                    ].map((q) => (
                      <button key={q.key} className="ec-qi" onClick={q.onClick}>
                        <span aria-hidden="true" className="ec-qi__ic"
                          style={{ background: TINTS[q.tint].bg, color: TINTS[q.tint].ink }}>
                          {q.icon}
                        </span>
                        <b>{q.title}</b>
                        <i>{q.meta}</i>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ⚠️ THESE SCREENS ARE CALLED AS FUNCTIONS, NOT MOUNTED AS ELEMENTS.
            `CalendarView`, `ProgrammeView`, `LessonScreen` and `ProjectorView`
            are all defined INSIDE Dashboard, so each render creates a brand-new
            function identity. Written as <ProgrammeView />, React sees a
            different component type every time and therefore UNMOUNTS the whole
            subtree and builds a fresh one — which destroys the focused input.
            Called as ProgrammeView(), the output is simply inlined into this
            tree and the DOM survives.

            This is the project's recurring React trap, and it has now been paid
            for FOUR times: the feedback comment box, the Retours panel, the
            Programme search (fixed INSIDE ProgrammeView on 2026-09-11 — the
            inline SearchBar was removed and the input given a stable branch),
            and then the Programme search AGAIN on 2026-09-28, because the inner
            fix could never work while the OUTER mount still remounted
            everything. Fixing the input's surroundings is not enough: whatever
            contains it must not be remounted either.

            None of these four use hooks — verified — which is what makes calling
            them safe despite the call being conditional. If one ever gains a
            hook, it must be lifted to module level instead, NOT switched back to
            <Element /> form. */}
        {screen === "calendar" && CalendarView()}
        {/* L'éditeur appartient à l'enseignante : ni parent, ni administrateur,
            ni direction. Monté en `<TimetableEditor/>` SANS risque, parce qu'il
            est déclaré au niveau module (voir son en-tête). */}
        {screen === "timetable" && !isParent && !isAdmin && !isSchoolAdmin && (
          <TimetableEditor
            teacher={teacher}
            timetable={timetable}
            subjects={EDT_MATIERES_ENSEIGNANTE}
            online={online}
            onSaved={fetchTimetable}
            onBack={() => setScreen("calendar")}
            retard={retard}
            moisCourant={moisCourant}
          />
        )}
        {screen === "programme" && ProgrammeView()}
        {screen === "readiness" && currentLesson && <ReadinessQuiz lesson={currentLesson} teacherId={teacher?.id} onPass={() => { setLessonPassed(true); setScreen("lesson"); }} onBack={() => setScreen("lesson")} />}
        {screen === "lesson" && LessonScreen()}
        {screen === "admin" && isAdmin && <Admin onBack={goBack} />}
        {screen === "schooldash" && isSchoolAdmin && (
          <SchoolDashboard
            school={schoolContext}
            onBack={goBack}
            onOpenTab={() => setScreen("schooladmin")}
          />
        )}
        {/* Chemin DIRECTION (school_admin et referent) : `asAdmin` reste faux, donc
            pas d'ajout ni de retrait d'élève, pas de renommage de classe, pas de
            coordonnées parents lisibles. `isSchoolAdmin` n'inclut PAS le rôle admin
            — Maxime passe par « Écoles » plus bas, où `asAdmin` vaut vrai. On passe
            quand même `isAdmin` ici : si un jour un administrateur atterrit sur ce
            chemin, il garde ses commandes au lieu de les perdre sans explication. */}
        {screen === "schooladmin" && isSchoolAdmin && <SchoolAdmin school={schoolContext} onBack={goBack} asAdmin={isAdmin} />}
        {screen === "adminschools" && isAdmin && (
          adminSchool ? (
            <div>
              <Breadcrumb items={[
                { label: "Écoles", onClick: () => setAdminSchool(null) },
                { label: adminSchool.name },
              ]} />
              <div style={{ marginBottom: 14 }}>
                <Tabs
                  ariaLabel="Vue de l'école"
                  value={adminSchoolView}
                  onChange={setAdminSchoolView}
                  items={[{ key: "gestion", label: "Gérer l'école" }, { key: "dash", label: "Tableau de bord" }, { key: "actas", label: "Agir en tant que" }]}
                />
              </div>
              {adminSchoolView === "dash" ? (
                <SchoolDashboard school={adminSchool} onBack={() => setAdminSchool(null)} onOpenTab={() => setAdminSchoolView("gestion")} />
              ) : adminSchoolView === "actas" ? (() => {
                const classesOfSchool = adminTeachers.filter((t) => t.school_id === adminSchool.id && t.role !== "admin");
                return (
                  <div>
                    <Callout tone="warn" icon="👁" style={{ marginBottom: 14 }}>
                      Ouvrez la vue d'un enseignant ou d'un parent pour agir à sa place. Un bandeau vous permettra de revenir à votre compte à tout moment.
                    </Callout>
                    <CardLabel>Vue enseignant — par classe</CardLabel>
                    {classesOfSchool.length === 0 ? (
                      <Card style={{ marginBottom: 18 }}><EmptyState icon="🧑🏾‍🏫" title="Aucune classe">Rattachez d'abord un enseignant à cette école.</EmptyState></Card>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                        {classesOfSchool.map((t) => (
                          <Card key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ fontSize: FONT.md, fontWeight: 700, color: COLORS.ink, minWidth: 0 }}>{t.full_name || t.id}{t.role === "school_admin" ? " · directeur" : t.role === "referent" ? " · référent" : ""}</div>
                            <Button size="sm" onClick={() => actAsTeacher(t)}>Ouvrir la vue enseignant</Button>
                          </Card>
                        ))}
                      </div>
                    )}
                    <CardLabel>Vue parent — par élève</CardLabel>
                    {adminSchoolStudents.length === 0 ? (
                      <Card><EmptyState icon="👨‍👩‍👦" title="Aucun élève">Inscrivez des élèves depuis « Gérer l'école ».</EmptyState></Card>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {adminSchoolStudents.map((s) => (
                          <Card key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: FONT.md, fontWeight: 700, color: COLORS.ink }}>{s.full_name}</div>
                              <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 3 }}>code {s.access_code || "—"}</div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => actAsParent(s)}>Ouvrir la vue parent</Button>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })() : (
                // Chemin « Écoles » — réservé au super-administrateur par le `isAdmin`
                // de l'écran parent. C'est d'ici que Maxime crée les élèves et lit les
                // coordonnées parents pendant le pilote.
                <SchoolAdmin school={adminSchool} onBack={() => setAdminSchool(null)} asAdmin={true} />
              )}
            </div>
          ) : (
            <div>
              <button type="button" className="ec-link" onClick={() => setScreen("home")} style={{ marginBottom: 12, fontSize: FONT.sm }}>← Retour</button>
              <h1 style={{ fontSize: FONT.xl, fontWeight: 800, color: COLORS.ink, margin: "0 0 4px" }}>Écoles</h1>
              <p style={{ color: COLORS.ink3, margin: "0 0 18px", fontSize: FONT.md }}>
                Créez et gérez toutes les écoles de la plateforme. Ouvrez une école pour gérer ses classes, ses élèves, les codes parents, son emploi du temps et son tableau de bord.
              </p>

              <Card style={{ marginBottom: 20 }}>
                <CardLabel>Créer une école</CardLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <input className="ec-input" style={{ flex: "2 1 200px" }} value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)} placeholder="Nom de l'école" />
                  <input className="ec-input" style={{ flex: "1 1 120px" }} value={newSchoolRegion} onChange={(e) => setNewSchoolRegion(e.target.value)} placeholder="Région" />
                  <input className="ec-input" style={{ flex: "1 1 150px" }} value={newSchoolCode} onChange={(e) => setNewSchoolCode(e.target.value)} placeholder="Code école (optionnel)" />
                  <Button size="sm" onClick={createSchool} disabled={!newSchoolName.trim()}>Créer</Button>
                </div>
                {adminSchoolMsg ? (
                  <div style={{ marginTop: 10, fontSize: FONT.sm, fontWeight: 700, color: adminSchoolMsg.includes("Erreur") ? COLORS.crit : COLORS.good }}>{adminSchoolMsg}</div>
                ) : null}
              </Card>

              <CardLabel>Toutes les écoles</CardLabel>
              {adminSchoolsLoading ? (
                <SkeletonRows rows={3} />
              ) : adminSchools.length === 0 ? (
                <Card><EmptyState icon="🏫" title="Aucune école">Créez-en une ci-dessus pour commencer.</EmptyState></Card>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
                  {adminSchools.map((s) => (
                    <Card key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: FONT.md, fontWeight: 700, color: COLORS.ink }}>{s.name}</div>
                        <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 3 }}>{s.region || "—"} · code {s.staff_code || "—"} · {s.classes} classe(s)</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flex: "none" }}>
                        <Button size="sm" onClick={() => openAdminSchool(s, "gestion")}>Gérer</Button>
                        <Button size="sm" variant="ghost" onClick={() => openAdminSchool(s, "dash")}>Tableau de bord</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <CardLabel>Rattacher un enseignant à une école</CardLabel>
              <p style={{ color: COLORS.ink3, margin: "0 0 10px", fontSize: FONT.sm }}>
                Chaque enseignant rattaché devient une classe de son école — vous pourrez ensuite y inscrire des élèves et définir son emploi du temps.
              </p>
              <Card>
                {adminTeachers.filter((t) => t.role !== "admin").length === 0 ? (
                  <div style={{ color: COLORS.ink3, fontSize: FONT.sm, padding: "6px 2px" }}>Aucun enseignant enregistré pour l'instant.</div>
                ) : adminTeachers.filter((t) => t.role !== "admin").map((t, i, arr) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 2px", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.border}` : "none", flexWrap: "wrap" }}>
                    <div style={{ fontSize: FONT.md, color: COLORS.ink, fontWeight: 600, minWidth: 0 }}>
                      {t.full_name || t.id}{t.role === "school_admin" ? " · directeur" : t.role === "referent" ? " · référent" : ""}
                    </div>
                    <select className="ec-input" style={{ width: "auto", cursor: "pointer" }} value={t.school_id || ""} onChange={(e) => assignTeacherToSchool(t.id, e.target.value || null)}>
                      <option value="">— Aucune école —</option>
                      {adminSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                ))}
              </Card>
            </div>
          )
        )}
        {/* ================= CONSOLE « UTILISATEURS » (superadmin) =================
             La vue « par personne » qui manquait : jusqu'ici un compte ne se
             voyait qu'en passant par son école. On corrige ici un nom mal saisi,
             un rôle, un rattachement, un téléphone.
             CE QUI N'EST PAS ICI, VOLONTAIREMENT : l'adresse de connexion et le
             mot de passe. Ils vivent dans auth.users et demanderaient une clé de
             service côté serveur (« lot 2 », reporté). L'utilisateur change son
             mot de passe lui-même par « Mot de passe oublié ». */}
        {screen === "adminusers" && isAdmin && (() => {
          const q = adminUsersQuery.trim().toLowerCase();
          const STAFF_ROLES = ["school_admin", "referent", "admin"];
          const list = (adminUsers || []).filter((u) => {
            if (adminUsersFilter === "teacher" && !(u.kind === "teacher" && u.role === "teacher")) return false;
            if (adminUsersFilter === "staff" && !(u.kind === "teacher" && STAFF_ROLES.includes(u.role))) return false;
            if (adminUsersFilter === "parent" && u.kind !== "parent") return false;
            if (!q) return true;
            return [u.full_name, u.phone, u.contact_email, u.child, u.class_label]
              .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
          });
          const schoolNameOf = (id) => (adminUserSchools.find((s) => s.id === id) || {}).name || null;
          const total = (adminUsers || []).length;

          return (
            <div>
              <button type="button" className="ec-link" onClick={() => { setScreen("home"); setAdminUserDraft(null); }} style={{ marginBottom: 12, fontSize: FONT.sm }}>← Retour</button>
              <h1 style={{ fontSize: FONT.xl, fontWeight: 800, color: COLORS.ink, margin: "0 0 4px" }}>Utilisateurs</h1>
              <p style={{ color: COLORS.ink3, margin: "0 0 18px", fontSize: FONT.md }}>
                Tous les comptes de la plateforme, personnel et parents. Corrigez un nom, un rôle, un rattachement ou un téléphone.
                L'adresse de connexion et le mot de passe ne se changent pas ici : chacun renouvelle son mot de passe depuis « Mot de passe oublié » sur l'écran de connexion.
              </p>

              {adminUserMsg ? (
                <Callout tone={adminUserMsg.startsWith("Erreur") ? "crit" : "brand"}
                  icon={adminUserMsg.startsWith("Erreur") ? "⚠" : "✓"} style={{ marginBottom: 16 }}>
                  {adminUserMsg}
                </Callout>
              ) : null}

              <Card style={{ marginBottom: 18 }}>
                <CardLabel>Rechercher</CardLabel>
                <input
                  className="ec-input"
                  value={adminUsersQuery}
                  onChange={(e) => setAdminUsersQuery(e.target.value)}
                  placeholder="Nom, téléphone, courriel, ou nom de l'enfant"
                  aria-label="Rechercher un utilisateur"
                />
                <div style={{ marginTop: 12 }}>
                  <Tabs
                    ariaLabel="Filtrer par type de compte"
                    value={adminUsersFilter}
                    onChange={(v) => { setAdminUsersFilter(v); setAdminUserDraft(null); }}
                    items={[
                      { key: "all", label: "Tous" },
                      { key: "teacher", label: "Enseignants" },
                      { key: "staff", label: "Direction" },
                      { key: "parent", label: "Parents" },
                    ]}
                  />
                </div>
              </Card>

              {adminUsersLoading ? (
                <SkeletonRows rows={4} />
              ) : adminUsers === null ? null : total === 0 ? (
                <Card><EmptyState icon="◍" title="Aucun compte">Personne n'est encore inscrit sur la plateforme.</EmptyState></Card>
              ) : list.length === 0 ? (
                <Card><EmptyState icon="🔎" title="Aucun résultat">Aucun compte ne correspond à cette recherche.</EmptyState></Card>
              ) : (
                <>
                  <CardLabel>{list.length} compte(s) sur {total}</CardLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {list.map((u) => {
                      const editing = adminUserDraft && adminUserDraft.id === u.id;
                      const isSelf = u.id === teacher?.id;
                      const d = adminUserDraft;
                      const meta = [
                        u.kind === "teacher" ? (schoolNameOf(u.school_id) || "Aucune école") : null,
                        u.kind === "teacher" ? (u.class_label || null) : null,
                        u.kind === "teacher" && u.level ? u.level.toUpperCase() : null,
                        u.kind === "parent" ? (u.child ? "enfant : " + u.child : "aucun enfant rattaché") : null,
                      ].filter(Boolean).join(" · ");

                      return (
                        <Card key={u.kind + u.id}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ fontSize: FONT.md, fontWeight: 700, color: COLORS.ink }}>
                                  {u.full_name || "(sans nom)"}
                                </span>
                                <Badge tone={u.role === "admin" ? "crit" : STAFF_ROLES.includes(u.role) ? "brand" : "neutral"}>
                                  {ROLE_LABELS[u.role] || u.role}
                                </Badge>
                                {isSelf ? <Badge tone="warn">vous</Badge> : null}
                                {isSuspectPhone(u.phone) ? <Badge tone="warn">téléphone à vérifier</Badge> : null}
                              </div>
                              <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 4 }}>{meta || "—"}</div>
                              <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 3 }}>
                                {[u.phone ? formatPhone(u.phone) : null, u.contact_email || null].filter(Boolean).join(" · ") || "Aucune coordonnée"}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flex: "none", flexWrap: "wrap" }}>
                              <Button size="sm" variant={editing ? "ghost" : "primary"}
                                onClick={() => { setAdminUserMsg(""); setAdminUserDraft(editing ? null : { ...u }); }}>
                                {editing ? "Annuler" : "Modifier"}
                              </Button>
                              {onImpersonate && !isSelf ? (
                                <Button size="sm" variant="ghost"
                                  onClick={() => u.kind === "teacher"
                                    ? actAsTeacherById(u.id, u.full_name)
                                    : actAsParentById(u.id, u.child || u.full_name)}>
                                  Agir en tant que
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          {editing ? (
                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border}`, display: "grid", gap: 10 }}>
                              <div>
                                <label htmlFor={`nm-${u.id}`} style={{ display: "block", fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.ink2, marginBottom: 5 }}>Nom complet</label>
                                <input id={`nm-${u.id}`} className="ec-input" value={d.full_name}
                                  onChange={(e) => setAdminUserDraft({ ...d, full_name: e.target.value })} />
                              </div>

                              {u.kind === "teacher" ? (
                                <>
                                  <div>
                                    <label htmlFor={`rl-${u.id}`} style={{ display: "block", fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.ink2, marginBottom: 5 }}>Rôle</label>
                                    <select id={`rl-${u.id}`} className="ec-input" style={{ cursor: isSelf ? "not-allowed" : "pointer" }}
                                      value={d.role} disabled={isSelf}
                                      onChange={(e) => setAdminUserDraft({ ...d, role: e.target.value })}>
                                      <option value="teacher">Enseignant</option>
                                      <option value="school_admin">Directeur</option>
                                      <option value="referent">Référent</option>
                                      <option value="admin">Superadmin</option>
                                    </select>
                                    {/* Garde-fou : se retirer soi-même le rôle superadmin ferme la
                                        console à clé, sans moyen de revenir depuis l'interface. */}
                                    {isSelf ? (
                                      <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 5, lineHeight: 1.45 }}>
                                        C'est votre propre compte : le rôle n'est pas modifiable ici, pour éviter de vous fermer la console.
                                      </div>
                                    ) : null}
                                  </div>

                                  <div>
                                    <label htmlFor={`sc-${u.id}`} style={{ display: "block", fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.ink2, marginBottom: 5 }}>École</label>
                                    <select id={`sc-${u.id}`} className="ec-input" style={{ cursor: "pointer" }}
                                      value={d.school_id || ""}
                                      onChange={(e) => setAdminUserDraft({ ...d, school_id: e.target.value })}>
                                      <option value="">— Aucune école —</option>
                                      {adminUserSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                  </div>

                                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <div style={{ flex: "1 1 140px" }}>
                                      <label htmlFor={`cl-${u.id}`} style={{ display: "block", fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.ink2, marginBottom: 5 }}>Classe</label>
                                      <input id={`cl-${u.id}`} className="ec-input" value={d.class_label}
                                        placeholder="Ex : CM1 A"
                                        onChange={(e) => setAdminUserDraft({ ...d, class_label: e.target.value })} />
                                    </div>
                                    <div style={{ flex: "1 1 140px" }}>
                                      <label htmlFor={`lv-${u.id}`} style={{ display: "block", fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.ink2, marginBottom: 5 }}>Niveau</label>
                                      <select id={`lv-${u.id}`} className="ec-input" style={{ cursor: "pointer" }}
                                        value={d.level || ""}
                                        onChange={(e) => setAdminUserDraft({ ...d, level: e.target.value })}>
                                        <option value="">— Aucun —</option>
                                        {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, lineHeight: 1.45 }}>
                                  Enfant rattaché : <strong style={{ color: COLORS.ink2 }}>{u.child || "aucun"}</strong>.
                                  Le rattachement se fait par le code personnel de l'élève, depuis la gestion de l'école — il ne se change pas ici.
                                </div>
                              )}

                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <div style={{ flex: "1 1 160px" }}>
                                  <label htmlFor={`ph-${u.id}`} style={{ display: "block", fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.ink2, marginBottom: 5 }}>Téléphone (WhatsApp)</label>
                                  <input id={`ph-${u.id}`} className="ec-input" type="tel" inputMode="tel" value={d.phone}
                                    placeholder="+237 6 90 00 00 00"
                                    onChange={(e) => setAdminUserDraft({ ...d, phone: e.target.value })} />
                                  <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 5, lineHeight: 1.45 }}>
                                    Un numéro camerounais peut s'écrire 690000000 : l'indicatif +237 est ajouté à l'enregistrement.
                                  </div>
                                </div>
                                <div style={{ flex: "1 1 160px" }}>
                                  <label htmlFor={`em-${u.id}`} style={{ display: "block", fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.ink2, marginBottom: 5 }}>Courriel de contact</label>
                                  <input id={`em-${u.id}`} className="ec-input" type="email" inputMode="email" value={d.contact_email}
                                    placeholder="nom@exemple.cm"
                                    onChange={(e) => setAdminUserDraft({ ...d, contact_email: e.target.value })} />
                                  <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 5, lineHeight: 1.45 }}>
                                    Pour joindre la personne. Ce n'est pas son identifiant de connexion.
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                                <Button size="sm" onClick={saveAdminUser} disabled={adminUserSaving}>
                                  {adminUserSaving ? "Enregistrement…" : "Enregistrer"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setAdminUserDraft(null)} disabled={adminUserSaving}>
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}
        {screen === "results" && PROFILES_ENABLED && !isAdmin && (
          isParent
            ? <Results parent={parent} student={parentStudent} results={parentResults} onOpenLesson={(id) => openLesson(id)} onBack={() => setScreen("home")} />
            : <Results teacher={teacher} school={schoolContext} onBack={goBack} initialTab={resultsTab} />
        )}
        {screen === "activitylog" && PROFILES_ENABLED && (isAdmin || isSchoolAdmin) && (
          <ActivityLog school={schoolContext} isAdmin={isAdmin} onBack={goBack}
            initialTab={activityTab}
            onActAsTeacher={isAdmin && onImpersonate ? actAsTeacherById : undefined}
            onActAsParent={isAdmin && onImpersonate ? actAsParentById : undefined} />
        )}
        {screen === "messages" && PROFILES_ENABLED && MessagesInbox()}
        {/* Lot D — appelée, pas montée : voir le commentaire sur ExchangesView. */}
        {screen === "exchanges" && PROFILES_ENABLED && isSchoolAdmin && ExchangesView()}
      </main>
      {screen !== "lesson" && BottomNav()}

      {/* ---- Leçon impossible à ouvrir ----
           Remplace l'absence totale de retour : l'utilisateur sait pourquoi,
           et ce qu'il peut faire. */}
      {blockedLesson && (
        <div className="ec-sheet-backdrop" onClick={(e) => {
          if (e.target === e.currentTarget) setBlockedLesson(null);
        }}>
          <div className="ec-sheet" role="alertdialog" aria-modal="true" aria-labelledby="ec-blocked-title">
            <div aria-hidden="true" style={{ fontSize: "var(--ec-fs-7)", marginBottom: 10 }}>
              {blockedLesson.reason === "offline" ? "📡" : "🔍"}
            </div>
            <h2 id="ec-blocked-title" style={{ fontSize: "var(--ec-fs-4)", fontWeight: 800, letterSpacing: "-.02em" }}>
              {blockedLesson.reason === "offline"
                ? "Cette leçon n'est pas sur votre téléphone"
                : "Leçon introuvable"}
            </h2>
            <p style={{ fontSize: FONT.md, color: COLORS.ink2, marginTop: 9, lineHeight: 1.55 }}>
              {blockedLesson.reason === "offline"
                ? "Vous êtes hors ligne et cette leçon n'a pas été téléchargée. Téléchargez la semaine quand le réseau revient — vous pourrez alors l'ouvrir sans connexion."
                : "Cette leçon n'existe plus ou son contenu n'a pas encore été créé."}
            </p>
            <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
              <Button variant="ghost" block onClick={() => setBlockedLesson(null)}>
                Fermer
              </Button>
              {blockedLesson.reason === "offline" && (
                <Button block onClick={() => {
                  setBlockedLesson(null);
                  setTab("calendar");
                  setScreen("calendar");
                }}>
                  Gérer les téléchargements
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Proposée seulement après quelques ouvertures, et un refus est respecté 30 jours. */}
      <InstallPrompt enabled={OFFLINE_ENABLED && screen !== "lesson"} />

      {/* La boîte de dialogue vers l'administration : sur toutes les pages, pour
          tout le monde SAUF l'administrateur lui-même — il n'a pas à s'écrire.
          Masquée pendant une leçon projetée : rien ne doit flotter devant une
          classe. Montée en `<AdminChat/>` sans risque : niveau module. */}
      {PROFILES_ENABLED && !isAdmin && screen !== "lesson" && (
        <AdminChat
          moiId={isParent ? parent?.id : teacher?.id}
          online={online}
          pushToast={pushToast}
          usurpation={!!impersonating}
        />
      )}
      <ToastViewport />
    </div>
  );
}