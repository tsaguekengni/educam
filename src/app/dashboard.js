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
import { OFFLINE_ENABLED, PROFILES_ENABLED, PARENT_TIP_ENABLED } from "../lib/flags";
import { logActivity } from "../lib/activity";
import {
  cachedQuery, fetchLessonBundle, saveLessonBundle, loadLessonBundle,
  getCachedLessonIds, downloadWeek, getGrant,
} from "../lib/offline";
import { COLORS, FONT, SHADOW, TINTS, subjectColor } from "../lib/theme";
import { Button, Card, CardLabel, Badge, Callout, ListRow, IconButton, EmptyState, Tabs, Breadcrumb, Meter, StatTile, Skeleton, SkeletonRows } from "../components/ui";
import { Sparkline, fr } from "../components/charts";
import { useToasts } from "../components/overlays";
import InstallPrompt from "../components/InstallPrompt";

const LEVELS = [
  { id: "ce1", name: "CE1", full: "Cours Élémentaire 1", primary: "Primary 3" },
  { id: "ce2", name: "CE2", full: "Cours Élémentaire 2", primary: "Primary 4" },
  { id: "cm1", name: "CM1", full: "Cours Moyen 1", primary: "Primary 5" },
  { id: "cm2", name: "CM2", full: "Cours Moyen 2", primary: "Primary 6" },
];

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

// Renders **bold** segments (markdown-style) inside otherwise plain text.
// Headings like "**MON DEVOIR**" or "**À RECOPIER DANS TON CAHIER**" become bold.
function renderRichText(text) {
  if (!text) return null;
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    return m ? <strong key={i}>{m[1]}</strong> : part;
  });
}

export default function Dashboard({ teacher, parent, onLogout, impersonating, impersonationName, onExitImpersonation, onImpersonate }) {
  // Only admins may edit base content; everyone else is a read-only reviewer
  // who can leave feedback. Defaults to reviewer if role is missing.
  const isAdmin = teacher?.role === "admin";
  const isSchoolAdmin = PROFILES_ENABLED && teacher?.role === "school_admin";
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
  const [openMsg, setOpenMsg] = useState(null);                // the message opened in the reading pane
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
        q = supabase.from("messages").select("*").eq("recipient_id", teacher.id);
      }
      if (!q) { if (!cancelled) setInbox([]); return; }
      const { data } = await q.order("created_at", { ascending: false });
      if (!cancelled) setInbox(data || []);
    })();
    return () => { cancelled = true; };
  }, [isParent, parent?.student_id, parent?.id, teacher?.id]);

  // Open a message in the reading pane, marking it read on first open.
  const openMessage = (m) => {
    setOpenMsg(m);
    if (m && !m.read_at) {
      const now = new Date().toISOString();
      supabase.from("messages").update({ read_at: now }).eq("id", m.id);
      setInbox((prev) => prev.map((x) => (x.id === m.id ? { ...x, read_at: now } : x)));
    }
  };
  const unreadCount = inbox.filter((m) => !m.read_at).length;

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
  const [tab, setTab] = useState("calendar");

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
  const projectorScrollRef = useRef(null); // the scrollable projector panel (for pointer/keyboard scrolling)

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

  // Profiles mode: the teacher's school (name/role), resolved on load.
  const [schoolContext, setSchoolContext] = useState(null);

  useEffect(() => {
    if (!PROFILES_ENABLED || !teacher?.school_id) { setSchoolContext(null); return; }
    let cancelled = false;
    supabase.from("schools").select("id, name, staff_code").eq("id", teacher.school_id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setSchoolContext(data || null); });
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

  // Offline mode: network status, which lessons are downloaded, and download progress.
  const [online, setOnline] = useState(true);
  const [cachedIds, setCachedIds] = useState([]);
  const [dl, setDl] = useState(null); // { done, total, bytes, finished } | null

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
  useEffect(() => {
    if (!PROFILES_ENABLED || isParent || isAdmin || !teacher?.id) { setClassStats(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const [agg, stu] = await Promise.all([
          supabase.from("educam_class_averages")
            .select("students_evaluated, average_20, below_pass")
            .eq("teacher_id", teacher.id).maybeSingle(),
          supabase.from("students").select("id", { count: "exact", head: true })
            .eq("teacher_id", teacher.id),
        ]);
        if (cancelled) return;
        if (agg.error) throw agg.error;
        const r = agg.data;
        setClassStats({
          students: stu.count || 0,
          evaluated: r?.students_evaluated || 0,
          avg20: r?.average_20 != null ? Number(r.average_20) : null,
          atRisk: r?.below_pass || 0,
        });
      } catch (_) {
        if (!cancelled) setClassStats(null);   // l'accueil reste utilisable
      }
    })();
    return () => { cancelled = true; };
  }, [teacher?.id, isParent, isAdmin]);

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    Promise.all([fetchTimetable(), fetchTopics(), fetchAllLessons()])
      .finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, [selectedLevel, parentStudent?.teacher_id]);

  useEffect(() => {
    if (!OFFLINE_ENABLED || typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => {
      setOnline(true);
      // Le réseau revient : on rafraîchit les listes — et on le DIT.
      // Auparavant la synchronisation était totalement silencieuse.
      Promise.all([fetchTimetable(), fetchTopics(), fetchAllLessons()])
        .then(() => pushToast("Connexion rétablie · contenu synchronisé", "success"))
        .catch(() => pushToast("Connexion rétablie, mais la synchronisation a échoué.", "error"));
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    getCachedLessonIds().then(setCachedIds);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [selectedLevel]);

  const fetchTimetable = async () => {
    // Profiles mode: a teacher reads their OWN class timetable; a parent reads
    // their CHILD's class timetable; otherwise the shared level timetable.
    const parentTeacherId = isParent ? parentStudent?.teacher_id : null;
    const usePerClass = PROFILES_ENABLED && teacher?.school_id && teacher?.id;
    let key, run;
    if (parentTeacherId) {
      key = "timetable_owner_" + parentTeacherId;
      run = () => supabase.from("timetable_slots").select("*")
        .eq("owner_teacher_id", parentTeacherId).order("day_of_week").order("slot_order");
    } else if (usePerClass) {
      key = "timetable_owner_" + teacher.id;
      run = () => supabase.from("timetable_slots").select("*")
        .eq("owner_teacher_id", teacher.id).order("day_of_week").order("slot_order");
    } else {
      key = "timetable_" + selectedLevel.id;
      run = () => supabase.from("timetable_slots").select("*")
        .eq("level", selectedLevel.id).order("day_of_week").order("slot_order");
    }
    const data = await cachedQuery(key, run);
    setTimetable(data || []);
  };

  const fetchTopics = async () => {
    const data = await cachedQuery("topics_" + selectedLevel.id, () =>
      supabase.from("curriculum_topics").select("*").eq("level", selectedLevel.id));
    setTopics(data || []);
  };

  const fetchAllLessons = async () => {
    const data = await cachedQuery("lessons_" + selectedLevel.id, () =>
      supabase.from("lessons").select("id, subject_id, component_id, level, unit_number, week_number, title")
        .eq("level", selectedLevel.id));
    // Enrich each lesson with the "taught" state of the teacher whose class is
    // being viewed (the teacher themselves, or the one a school-admin / admin is
    // acting-as). Live query — offline it fails soft and everything reads as not
    // taught, which is acceptable. This drives the "Déjà enseignée" badge.
    let taughtSet = new Set();
    if (teacher?.id) {
      try {
        const { data: tg } = await supabase.from("lessons_taught")
          .select("lesson_id").eq("teacher_id", teacher.id);
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
        .map((s) => getLessonForTopic(s.subject_id, s.component_id, selectedUnit, selectedWeek))
        .filter(Boolean)
        .map((l) => l.id)
    ));
    if (ids.length === 0) { setDl({ done: 0, total: 0, finished: true, empty: true }); return; }
    setDl({ done: 0, total: ids.length });
    const res = await downloadWeek(ids, (done, total) => setDl({ done, total }));
    setCachedIds(await getCachedLessonIds());
    setDl({ done: res.total, total: res.total, finished: true, ...res });
  };

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
  // ---- Stage 2: act as a teacher (class) or a pupil's parent ----
  const actAsTeacher = (t) => { if (onImpersonate) onImpersonate("teacher", t, t.full_name || "Enseignant"); };
  const actAsParent = async (student) => {
    if (!onImpersonate) return;
    const { data: p } = await supabase.from("parents").select("*").eq("student_id", student.id).limit(1);
    const profile = (p && p[0]) ? p[0] : { id: student.id, student_id: student.id, full_name: student.full_name };
    onImpersonate("parent", profile, student.full_name);
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
    sl ? getLessonForTopic(sl.subject_id, sl.component_id, selectedUnit, selectedWeek) : null;

  const minutesUntil = upcomingSlot && !currentSlot
    ? (toMinutes(upcomingSlot.start_time) || 0) - minutesNow
    : null;

  /* ------------------------------------------------------------------------
     Chargement du plan de la séance et de l'état « enseignée » du prochain
     cours. Deux requêtes, une seule fois par leçon. Elles échouent en silence
     hors ligne : l'accueil doit rester lisible sans réseau.
     ------------------------------------------------------------------------ */
  const heroLessonId = upcomingSlot
    ? (getLessonForTopic(upcomingSlot.subject_id, upcomingSlot.component_id, selectedUnit, selectedWeek) || {}).id
    : null;

  useEffect(() => {
    if (isParent || isAdmin || !heroLessonId) { setHeroPlan({ id: null, sections: [], taught: false }); return undefined; }
    let cancelled = false;
    (async () => {
      const [sec, tgt] = await Promise.all([
        supabase.from("lesson_sections").select("title, section_type")
          .eq("lesson_id", heroLessonId).order("section_order").limit(4),
        teacher?.id
          ? supabase.from("lessons_taught").select("id")
            .eq("teacher_id", teacher.id).eq("lesson_id", heroLessonId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      setHeroPlan({
        id: heroLessonId,
        sections: sec.error ? [] : (sec.data || []),
        taught: !!(tgt && tgt.data),
      });
    })();
    return () => { cancelled = true; };
  }, [heroLessonId, teacher?.id, isParent, isAdmin]);

  /** Marque la leçon du prochain cours comme enseignée, sans passer par le
   *  lecteur — c'est le geste qui suit immédiatement le cours. */
  const markHeroTaught = async (lesson) => {
    if (!teacher?.id || !lesson?.id || heroPlan.taught) return;
    const { error } = await supabase.from("lessons_taught")
      .upsert({ teacher_id: teacher.id, lesson_id: lesson.id }, { onConflict: "teacher_id,lesson_id" });
    if (error) {
      pushToast(online
        ? "Impossible d'enregistrer. Réessayez dans un instant."
        : "Hors ligne : impossible d'enregistrer pour le moment.", "error");
      return;
    }
    setHeroPlan((p) => ({ ...p, taught: true }));
    setAvailableLessons((prev) => prev.map((l) => (l.id === lesson.id ? { ...l, taught: true } : l)));
    pushToast("Leçon marquée enseignée", "success");
    logActivity({
      actorId: teacher.id, actorRole: teacher?.role || "teacher",
      schoolId: teacher?.school_id || schoolContext?.id,
      eventType: "mark_taught", lessonId: lesson.id, detail: lesson.title,
    });
  };

  // Jours restants sur l'accès hors ligne de 7 jours (null si non applicable).
  const grantDaysLeft = (() => {
    if (!OFFLINE_ENABLED) return null;
    const g = getGrant();
    if (!g || !g.until) return null;
    return Math.max(0, Math.ceil((g.until - Date.now()) / 86400000));
  })();

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
  const toggleTaught = async () => {
    if (!teacher?.id || !currentLesson) return;
    setTaughtSaving(true);
    try {
      if (lessonTaught) {
        const { error } = await supabase.from("lessons_taught").delete()
          .eq("teacher_id", teacher.id).eq("lesson_id", currentLesson.id);
        if (error) throw error;
        setLessonTaught(false);
        setAvailableLessons((prev) => prev.map((l) => (l.id === currentLesson.id ? { ...l, taught: false } : l)));
        logActivity({ actorId: teacher.id, actorRole: teacher?.role || "teacher", schoolId: teacher?.school_id || schoolContext?.id, eventType: "unmark_taught", lessonId: currentLesson.id, detail: currentLesson.title });
      } else {
        const { error } = await supabase.from("lessons_taught")
          .upsert({ teacher_id: teacher.id, lesson_id: currentLesson.id }, { onConflict: "teacher_id,lesson_id" });
        if (error) throw error;
        setLessonTaught(true);
        setAvailableLessons((prev) => prev.map((l) => (l.id === currentLesson.id ? { ...l, taught: true } : l)));
        logActivity({ actorId: teacher.id, actorRole: teacher?.role || "teacher", schoolId: teacher?.school_id || schoolContext?.id, eventType: "mark_taught", lessonId: currentLesson.id, detail: currentLesson.title });
      }
    } catch (_) {
      // L'enseignante croyait sa leçon marquée alors que l'écriture avait échoué.
      pushToast(
        online
          ? "Impossible d'enregistrer. Réessayez dans un instant."
          : "Hors ligne : impossible d'enregistrer pour le moment.",
        "error"
      );
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
      : [selectedLevel?.name, isAdmin ? "administration" : isSchoolAdmin ? "direction" : "enseignant"]
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
    const senderLabel = (m) => (m.audience === "teacher" ? "Administration" : (schoolContext?.name || "École"));
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
        meta={`${senderLabel(m)} · ${fmtDate(m.created_at)}`}
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
            <div style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 2 }}>{fmtDate(m.created_at)}</div>
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
      .map((sl) => getLessonForTopic(sl.subject_id, sl.component_id, selectedUnit, selectedWeek))
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
          {!isParent && (
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
                  Estimation : environ {(Math.max(toDownload, 0) * 0.35).toFixed(1).replace(".", ",")} Mo à télécharger · vidéos exclues
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
                  const lesson = topic ? getLessonForTopic(slot.subject_id, slot.component_id, selectedUnit, selectedWeek) : null;
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

                          {topic ? (
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

    const SearchBar = () => (
      <div style={{ position: "relative", marginBottom: 16 }}>
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
    );

    // ---- RÉSULTATS DE RECHERCHE (la première recherche de l'application) ----
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
      const unique = hits.filter((h) => {
        const k = h.title + "|" + h.meta;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      }).slice(0, 40);

      return (
        <div>
          <h1 className="ec-h1">Programme</h1>
          <p className="ec-sub">{selectedLevel.name} · recherche</p>
          <div style={{ marginTop: 18 }}><SearchBar /></div>

          <button className="ec-row" style={{ marginTop: 14, borderColor: COLORS.g300, background: COLORS.g50 }}
            onClick={() => setProgrammeView("week")}>
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
          {unique.length === 0 ? (
            <Card>
              <EmptyState icon="🔍" title="Aucun résultat">
                Aucune leçon ni sujet ne correspond à « {progQuery} » pour le {selectedLevel.name}.
              </EmptyState>
            </Card>
          ) : (
            <>
              <p style={{ fontSize: FONT.sm, color: COLORS.ink3, marginBottom: 10 }}>
                {unique.length} résultat{unique.length > 1 ? "s" : ""}
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {unique.map((h) => (
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
        </div>
      );
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
            <div style={{ display: "grid", gap: 8, marginTop: 18, gridTemplateColumns: "repeat(auto-fit, minmax(390px, 1fr))" }}>
              {weekTopics.map((t, i) => {
                const subject = SUBJECTS.find((sb) => sb.id === t.subject_id);
                const comp = subject?.components.find((c) => c.id === t.component_id);
                const lesson = getLessonForTopic(t.subject_id, t.component_id, t.unit_number, t.week_number);
                return (
                  <ListRow
                    key={`${t.subject_id}-${t.component_id}-${i}`}
                    barColor={subjectColor(subject?.name)}
                    icon={subject?.icon}
                    title={t.topic_title || comp?.name || subject?.name || "Sujet"}
                    meta={`${subject?.name || "Matière"}${comp ? " — " + comp.name : ""}`}
                    onClick={lesson ? () => openLesson(lesson.id) : undefined}
                    right={lesson
                      ? <Badge tone="brand">Leçon prête</Badge>
                      : <Badge tone="neutral">À créer</Badge>}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (programmeView === "subjects") {
      const totalTopics = topics.length;
      const totalLessons = availableLessons.length;
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

          <div style={{ marginTop: 18 }}><SearchBar /></div>

          {totalTopics > 0 && (
            <Callout tone="brand" icon="📊" style={{ marginBottom: 16 }}>
              <b>{totalLessons} leçon{totalLessons > 1 ? "s" : ""} sur {totalTopics} sujets</b> disponibles pour le {selectedLevel.name}.
            </Callout>
          )}

          <CardLabel>Matières</CardLabel>
          {loadingData && <SkeletonRows rows={4} />}
          <div style={{ display: "grid", gap: 9, gridTemplateColumns: "repeat(auto-fit, minmax(390px, 1fr))" }}>
            {SUBJECTS.map((subject) => {
              const subjTopics = topics.filter((t) => t.subject_id === subject.id).length;
              const subjLessons = availableLessons.filter((l) => l.subject_id === subject.id).length;
              return (
                <ListRow
                  key={subject.id}
                  icon={subject.icon}
                  iconColor={subject.color}
                  title={subject.name}
                  meta={subjTopics > 0
                    ? `${subjLessons} / ${subjTopics} leçons · ${subject.components.length} composantes`
                    : `${subject.components.length} composantes · ${subject.hours}`}
                  onClick={() => { setSelectedSubject(subject); setProgrammeView("components"); }}
                >
                  {subjTopics > 0 && (
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
                {selectedLevel.name} · {selectedSubject.hours} · {selectedSubject.components.length} composantes
              </p>
            </div>
          </div>

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
        </div>
      );
    }

    // ---- SUJETS D'UNE COMPOSANTE, PAR UNITÉ ----
    if (programmeView === "topics" && selectedSubject && selectedComponent) {
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
            <Button variant="ghost" onClick={enterProjector} aria-label="Mode projecteur" title="Mode projecteur">
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
                            if (block.block_type === "text") {
                              return (
                                <div key={k} style={{
                                  fontSize: 16.5, color: "#22262C", lineHeight: 1.68,
                                  whiteSpace: "pre-wrap", maxWidth: "66ch",
                                }}>
                                  {renderRichText(block.text_content)}
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
                              if (OFFLINE_ENABLED && !online) {
                                return (
                                  <div key={k} style={{ background: "#F3F4F6", border: "1px dashed #D1D5DB", borderRadius: 10, padding: "24px 16px", textAlign: "center", color: "#6B7280" }}>
                                    <div style={{ fontSize: "var(--ec-fs-6)", marginBottom: 6 }}>🎬</div>
                                    <div style={{ fontSize: "var(--ec-fs-3)", fontWeight: 600 }}>Vidéo disponible uniquement en ligne</div>
                                    {block.caption && <div style={{ fontSize: "var(--ec-fs-2)", marginTop: 4 }}>{block.caption}</div>}
                                  </div>
                                );
                              }
                              return (
                                <div key={k}>
                                  {isEmbeddable(block.media_url) ? (
                                    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
                                      <iframe
                                        src={getEmbedUrl(block.media_url)}
                                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    </div>
                                  ) : (
                                    <video
                                      src={block.media_url}
                                      controls
                                      playsInline
                                      style={{ width: "100%", borderRadius: 10, display: "block", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
                                    />
                                  )}
                                  {block.caption && (
                                    <div style={{ fontSize: "var(--ec-fs-3)", color: "#6B7280", marginTop: 6, textAlign: "center" }}>
                                      {block.caption}
                                    </div>
                                  )}
                                </div>
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

  // Projector keyboard control. A presentation pointer (clicker) sends key
  // events — usually PageDown/PageUp, sometimes arrows or Space. By default the
  // browser scrolls the DOCUMENT with those keys, not our fixed overlay, so in
  // projector mode nothing moved (it was scrolling the page hidden behind the
  // overlay). Here we intercept those keys and scroll the projector panel itself.
  useEffect(() => {
    if (!projectorMode) return;
    // Small step per keystroke (~4% of the screen) so holding / repeatedly
    // pressing the pointer scrolls the lesson smoothly and continuously,
    // rather than jumping a whole screen at a time. Instant behaviour keeps
    // rapid key-repeat responsive (smooth animations would stack and lag).
    const PROJECTOR_SCROLL_FRACTION = 0.04;
    const scrollPanel = (factor) => {
      const el = projectorScrollRef.current;
      if (!el) return;
      const step = Math.round((el.clientHeight || window.innerHeight) * PROJECTOR_SCROLL_FRACTION) * factor;
      el.scrollBy({ top: step, behavior: "auto" });
    };
    const onKey = (e) => {
      switch (e.key) {
        case "Escape":
          exitProjector();
          break;
        // Advance / forward → scroll DOWN (covers most clicker mappings).
        case "PageDown":
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault(); scrollPanel(1); break;
        // Back / previous → scroll UP.
        case "PageUp":
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault(); scrollPanel(-1); break;
        case " ": // Space (Shift+Space scrolls up)
          e.preventDefault(); scrollPanel(e.shiftKey ? -1 : 1); break;
        case "Home":
          e.preventDefault();
          projectorScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); break;
        case "End":
          e.preventDefault();
          if (projectorScrollRef.current)
            projectorScrollRef.current.scrollTo({ top: projectorScrollRef.current.scrollHeight, behavior: "smooth" });
          break;
        default: break;
      }
    };
    const onFsChange = () => { if (!document.fullscreenElement) setProjectorMode(false); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, [projectorMode]);

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
    const baseFontVw = len < 500 ? 2.8 : len < 1500 ? 2.2 : len < 4000 ? 1.7 : 1.4;
    const basePx = `max(18px, ${baseFontVw}vw)`;

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
          <button onClick={exitProjector} style={{
            background: "rgba(0,0,0,0.7)", color: "white", border: "none",
            borderRadius: 10, padding: "10px 20px", fontSize: "var(--ec-fs-4)", fontWeight: 700,
            cursor: "pointer", backdropFilter: "blur(8px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
          }}>✕ Quitter le projecteur</button>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "72px 16px 60px" : "60px 48px 80px" }}>
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
                        if (block.block_type === "text") {
                          // The Bilan section is the trace écrite ("à recopier"):
                          // heavier, larger and more open so it survives projector
                          // blur when pupils copy it letter by letter. Inline **bold**
                          // signposts stay at 700 and still stand out over the 600 base.
                          const isCopyText = section.section_type === "bilan";
                          return (
                            <div key={k} style={{
                              fontSize: isCopyText ? `max(21px, ${baseFontVw * 1.15}vw)` : basePx,
                              color: "#1F2937",
                              fontWeight: isCopyText ? 600 : 400,
                              lineHeight: isCopyText ? 2.1 : 1.9,
                              whiteSpace: "pre-wrap",
                              maxWidth: 1000
                            }}>
                              {renderRichText(block.text_content)}
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
                          if (OFFLINE_ENABLED && !online) {
                            return (
                              <div key={k} style={{ width: "100%", maxWidth: 1000, margin: "0 auto", background: "#F3F4F6", border: "1px dashed #D1D5DB", borderRadius: 16, padding: "40px 20px", textAlign: "center", color: "#6B7280" }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>🎬</div>
                                <div style={{ fontSize: `max(16px, ${baseFontVw * 0.8}vw)`, fontWeight: 700 }}>Vidéo disponible uniquement en ligne</div>
                              </div>
                            );
                          }
                          return (
                            <div key={k} style={{ width: "100%", maxWidth: 1000, margin: "0 auto" }}>
                              {isEmbeddable(block.media_url) ? (
                                <div style={{
                                  position: "relative", paddingBottom: "56.25%", height: 0,
                                  borderRadius: 16, overflow: "hidden",
                                  boxShadow: "0 4px 24px rgba(0,0,0,0.1)"
                                }}>
                                  <iframe
                                    src={getEmbedUrl(block.media_url)}
                                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              ) : (
                                <video
                                  src={block.media_url}
                                  controls
                                  playsInline
                                  style={{
                                    width: "100%", borderRadius: 16, display: "block",
                                    boxShadow: "0 4px 24px rgba(0,0,0,0.1)"
                                  }}
                                />
                              )}
                              {block.caption && (
                                <div style={{
                                  fontSize: `max(14px, ${baseFontVw * 0.7}vw)`,
                                  color: "#6B7280", marginTop: 12, textAlign: "center"
                                }}>
                                  {block.caption}
                                </div>
                              )}
                            </div>
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
      {OFFLINE_ENABLED && !online && (
        <div role="status" style={{
          background: COLORS.warnBg, color: COLORS.warn, textAlign: "center",
          fontSize: "var(--ec-fs-2)", fontWeight: 600, padding: "9px 12px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          Hors ligne — les leçons téléchargées restent disponibles.
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
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                }}>
                  <StatTile label="Moyenne" tint="blue"
                    value={avg20 != null ? fr(avg20) : "—"}
                    unit={avg20 != null ? "/20" : ""}
                    foot={withPct.length
                      ? `${withPct.length} contrôle${withPct.length > 1 ? "s" : ""} corrigé${withPct.length > 1 ? "s" : ""}`
                      : "aucun contrôle encore"} />
                  <StatTile label="Leçons à revoir" tint="amber"
                    value={reviewIds.size}
                    foot={reviewIds.size ? "à retravailler ensemble" : "aucune difficulté"} />
                  <StatTile label="Messages" tint="violet"
                    value={unreadCount}
                    foot={unreadCount ? "non lus" : "tout est lu"} />
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
            },
            {
              label: "Moyenne de classe", tint: "blue",
              value: classStats?.avg20 != null ? fr(classStats.avg20) : "—",
              unit: classStats?.avg20 != null ? "/20" : "",
              foot: classStats
                ? (classStats.evaluated
                    ? `${classStats.evaluated} élève${classStats.evaluated > 1 ? "s" : ""} évalué${classStats.evaluated > 1 ? "s" : ""} sur ${classStats.students}`
                    : "aucun résultat saisi")
                : "chargement…",
            },
            {
              label: "Élèves à suivre", tint: "amber",
              value: classStats ? classStats.atRisk : "—",
              foot: classStats
                ? (classStats.atRisk ? "moyenne sous 10 / 20" : "aucun élève sous 10 / 20")
                : "chargement…",
            },
          ];
          if (OFFLINE_ENABLED) {
            tiles.push({
              label: "Hors ligne", value: cachedIds.length, tint: "violet",
              foot: grantDaysLeft != null
                ? `leçons prêtes · accès ${grantDaysLeft} j`
                : "leçons prêtes sans réseau",
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
            meta: "Saisir et suivre les notes", onClick: () => setScreen("results"),
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
          if (PROFILES_ENABLED && (isAdmin || isSchoolAdmin)) quick.push({
            key: "activitylog", icon: "◔", tint: "violet", title: "Activité",
            meta: "Qui utilise vraiment EduCam", onClick: () => setScreen("activitylog"),
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
                  la découvrir en pleine classe est le pire des scénarios. */}
              {OFFLINE_ENABLED && grantDaysLeft != null && (
                <span
                  className="ec-btn ec-btn--sm"
                  style={{
                    cursor: "default", pointerEvents: "none",
                    background: grantDaysLeft <= 1 ? COLORS.warnBg : COLORS.g50,
                    borderColor: grantDaysLeft <= 1 ? "#E3CDA0" : COLORS.g200,
                    color: grantDaysLeft <= 1 ? COLORS.warn : COLORS.g800,
                    fontWeight: 700, gap: 8,
                  }}
                >
                  <i aria-hidden="true" style={{
                    width: 8, height: 8, borderRadius: "50%", flex: "none",
                    background: grantDaysLeft <= 1 ? COLORS.warn : COLORS.good,
                  }} />
                  {cachedIds.length > 0
                    ? `Hors ligne prêt · ${grantDaysLeft} jour${grantDaysLeft > 1 ? "s" : ""}`
                    : `Accès hors ligne · ${grantDaysLeft} jour${grantDaysLeft > 1 ? "s" : ""}`}
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
                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
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
                          onClick: () => setScreen("results") },
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
                      <StatTile key={t.label} label={t.label} value={t.value} unit={t.unit} tint={t.tint} foot={t.foot} />
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
                    {progress.map((s, i) => (
                      <div key={s.name} style={{
                        padding: "11px 0",
                        borderTop: i === 0 ? "none" : `1px solid ${COLORS.divider}`,
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
                    ))}
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
                      <div style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 3 }}>
                        {cachedIds.length > 0
                          ? "Disponibles même sans réseau."
                          : "Téléchargez la semaine pour faire cours sans réseau."}
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
                  {grantDaysLeft != null && grantDaysLeft <= 2 && (
                    <Callout tone="warn" icon="⏳" style={{ marginTop: 11 }}>
                      Votre accès hors ligne expire {grantDaysLeft === 0 ? "aujourd'hui" : `dans ${grantDaysLeft} jour${grantDaysLeft > 1 ? "s" : ""}`}.
                      Connectez-vous une fois en ligne pour repartir sur 7 jours.
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18 }}>
                  <StatTile label="Écoles" tint="green"
                    value={adminStats ? adminStats.schools : "—"}
                    foot={adminStats
                      ? (adminStats.schoolsActive === adminStats.schools && adminStats.schools > 0
                          ? "toutes actives cette semaine"
                          : `${adminStats.schoolsActive} active${adminStats.schoolsActive > 1 ? "s" : ""} cette semaine`)
                      : "chargement…"} />
                  <StatTile label="Enseignants" tint="blue"
                    value={adminStats ? adminStats.teachers : "—"}
                    foot={adminStats ? `${adminStats.teachers7} connecté${adminStats.teachers7 > 1 ? "s" : ""} ces 7 jours` : "chargement…"} />
                  <StatTile label="Parents actifs" tint="amber"
                    value={adminStats && adminStats.parents > 0
                      ? Math.round((adminStats.parents30 / adminStats.parents) * 100)
                      : "—"}
                    unit={adminStats && adminStats.parents > 0 ? "%" : ""}
                    foot={adminStats
                      ? `${adminStats.parents30} sur ${adminStats.parents} compte${adminStats.parents > 1 ? "s" : ""}`
                      : "chargement…"} />
                  <StatTile label="Anomalies ouvertes"
                    tint={Array.isArray(anomalies) && anomalies.length > 0 ? "crit" : "violet"}
                    value={Array.isArray(anomalies) ? anomalies.length : anomalies === false ? "—" : "…"}
                    foot={anomalies === false ? "détection non activée"
                      : Array.isArray(anomalies) && anomalies.length === 0 ? "rien à vérifier"
                      : "motifs à vérifier"} />
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

        {screen === "calendar" && <CalendarView />}
        {screen === "programme" && <ProgrammeView />}
        {screen === "readiness" && currentLesson && <ReadinessQuiz lesson={currentLesson} teacherId={teacher?.id} onPass={() => { setLessonPassed(true); setScreen("lesson"); }} onBack={() => setScreen("lesson")} />}
        {/* Call LessonScreen() as a function instead of <LessonScreen /> so its
            output is inlined into this render tree. Rendering it as an element
            remounted the whole subtree on every Dashboard state change (it's an
            inline-defined component with a fresh identity each render), which
            made the feedback comment box lose focus after each keystroke. */}
        {screen === "lesson" && LessonScreen()}
        {screen === "admin" && isAdmin && <Admin onBack={goBack} />}
        {screen === "schooldash" && isSchoolAdmin && (
          <SchoolDashboard
            school={schoolContext}
            onBack={goBack}
            onOpenTab={() => setScreen("schooladmin")}
          />
        )}
        {screen === "schooladmin" && isSchoolAdmin && <SchoolAdmin school={schoolContext} onBack={goBack} />}
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
                            <div style={{ fontSize: FONT.md, fontWeight: 700, color: COLORS.ink, minWidth: 0 }}>{t.full_name || t.id}{t.role === "school_admin" ? " · directeur" : ""}</div>
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
                <SchoolAdmin school={adminSchool} onBack={() => setAdminSchool(null)} />
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
                      {t.full_name || t.id}{t.role === "school_admin" ? " · directeur" : ""}
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
        {screen === "results" && PROFILES_ENABLED && !isAdmin && (
          isParent
            ? <Results parent={parent} student={parentStudent} results={parentResults} onOpenLesson={(id) => openLesson(id)} onBack={() => setScreen("home")} />
            : <Results teacher={teacher} school={schoolContext} onBack={goBack} />
        )}
        {screen === "activitylog" && PROFILES_ENABLED && (isAdmin || isSchoolAdmin) && <ActivityLog school={schoolContext} isAdmin={isAdmin} onBack={goBack} />}
        {screen === "messages" && PROFILES_ENABLED && MessagesInbox()}
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
      <ToastViewport />
    </div>
  );
}