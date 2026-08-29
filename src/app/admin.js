"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { PARENT_TIP_ENABLED } from "../lib/flags";
import { takeBackup, clearBackup, rollback } from "../lib/lesson-backup";
import { COLORS, FONT } from "../lib/theme";
import { IconButton } from "../components/ui";

const LEVELS = [
  { id: "ce1", name: "CE1 — Primary 3" },
  { id: "ce2", name: "CE2 — Primary 4" },
  { id: "cm1", name: "CM1 — Primary 5" },
  { id: "cm2", name: "CM2 — Primary 6" },
];

const SUBJECTS = [
  {
    id: "francais", name: "Français et Littérature", icon: "📖", color: "#3B82F6",
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
    id: "maths", name: "Mathématiques", icon: "🔢", color: "#8B5CF6",
    components: [
      { id: "nombres-calculs", name: "Nombres et calculs" },
      { id: "mesures-grandeurs", name: "Mesures et grandeurs" },
      { id: "geometrie", name: "Géométrie et espace" },
      { id: "statistiques", name: "Statistiques" },
    ]
  },
  {
    id: "sciences", name: "Sciences et Technologies", icon: "🔬", color: COLORS.good,
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
    id: "english", name: "English Language", icon: "🇬🇧", color: COLORS.crit,
    components: [
      { id: "listening", name: "Listening and Speaking" },
      { id: "reading", name: "Reading" },
      { id: "writing", name: "Writing" },
      { id: "grammar", name: "Grammar and Vocabulary" },
    ]
  },
  {
    id: "shs", name: "Sciences humaines et sociales", icon: "🌍", color: "#F59E0B",
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
    id: "tic", name: "TIC", icon: "💻", color: "#6366F1",
    components: [
      { id: "env-info", name: "Environnements informatiques" },
      { id: "production-tic", name: "Production avec les outils TIC" },
      { id: "internet", name: "Internet et communication" },
      { id: "sante-securite-ethique", name: "Santé, sécurité et éthique" },
      { id: "programmation", name: "Notions de programmation" },
    ]
  },
  {
    id: "langues", name: "Langues et cultures nationales", icon: "🗣️", color: "#059669",
    components: [
      { id: "langue-nationale", name: "Langue nationale" },
    ]
  },
  {
    id: "arts", name: "Éducation artistique", icon: "🎨", color: "#EC4899",
    components: [
      { id: "arts-visuels", name: "Arts visuels" },
      { id: "musique", name: "Musique" },
      { id: "arts-dramatiques", name: "Arts dramatiques" },
      { id: "danse", name: "Danse" },
    ]
  },
  {
    id: "eps", name: "Éducation physique et sportive", icon: "⚽", color: "#14B8A6",
    components: [
      { id: "athletisme", name: "Activités athlétiques" },
      { id: "sports-co", name: "Sports collectifs" },
      { id: "autodefense", name: "Autodéfense" },
    ]
  },
  {
    id: "devperso", name: "Développement personnel", icon: "🌱", color: "#78716C",
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

const MONTH_UNIT_MAP = [
  "Septembre", "Octobre", "Novembre", "Décembre",
  "Janvier", "Février", "Mars", "Avril"
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

// Les deux constantes de style partagées du fichier. Les repasser aux jetons
// corrige d'un coup tous les champs et tous les libellés de la console, sans
// toucher aux quelque quarante appels — y compris la cible tactile de 44 px,
// que l'éditeur de leçon n'atteignait nulle part.
// Plafonds de lecture explicites : la console chargeait sans limite.
const LESSONS_CAP = 600;
const FEEDBACK_CAP = 400;

const inputStyle = {
  width: "100%", padding: "11px 13px", minHeight: 44,
  border: `1px solid ${COLORS.border2}`, borderRadius: 9,
  fontSize: FONT.md, outline: "none", boxSizing: "border-box",
  background: COLORS.card, color: COLORS.ink,
};

const labelStyle = {
  fontSize: FONT.sm, fontWeight: 650, color: COLORS.ink2, display: "block", marginBottom: 5,
};

export default function Admin({ onBack }) {
  const [view, setView] = useState("browse"); // browse, editor
  const [allLessons, setAllLessons] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Browser navigation state
  const [browseLevel, setBrowseLevel] = useState("cm1");
  const [browseSubject, setBrowseSubject] = useState(null);   // subject object
  const [browseComponent, setBrowseComponent] = useState(null); // component object

  // Form state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingKey, setUploadingKey] = useState(null); // `${sectionIndex}-${blockIndex}` currently uploading
  // Teacher feedback review console.
  const [feedbackRows, setFeedbackRows] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [teacherNames, setTeacherNames] = useState({});
  const [feedbackTab, setFeedbackTab] = useState("new"); // "new" | "done"
  const [pendingDelete, setPendingDelete] = useState(null); // feedback id awaiting delete confirm

  const [subjectId, setSubjectId] = useState("francais");
  const [componentId, setComponentId] = useState("expression-orale");
  const [levelId, setLevelId] = useState("cm1");
  const [unitNumber, setUnitNumber] = useState(1);
  const [weekNumber, setWeekNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [parentTip, setParentTip] = useState("");   // conseil au parent (drapeau PARENT_TIP_ENABLED)
  const [duration, setDuration] = useState("45 minutes");

  const [sections, setSections] = useState([
    { type: "intro", title: "Introduction", icon: "💡", blocks: [emptyBlock("text")] },
  ]);

  const [exercises, setExercises] = useState([
    { question: "", type: "open", options: ["", "", "", ""], answer: "" },
  ]);

  // Readiness quiz
  const [quizQuestions, setQuizQuestions] = useState([
    { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" },
  ]);

  const selectedSubject = SUBJECTS.find(s => s.id === subjectId);
  const components = selectedSubject?.components || [];

  useEffect(() => {
    fetchAllLessons();
    fetchTopics();
  }, []);

  const fetchAllLessons = async () => {
    setLoadingLessons(true);
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(LESSONS_CAP);
    setAllLessons(data || []);
    setLoadingLessons(false);
  };

  const fetchTopics = async () => {
    const { data } = await supabase.from("curriculum_topics").select("*");
    setTopics(data || []);
  };

  // ---- Browser lookups ----
  const lessonsForComponent = (subId, compId) =>
    allLessons.filter(l => l.level === browseLevel && l.subject_id === subId && l.component_id === compId);

  const lessonForWeek = (subId, compId, unitNum, weekNum) =>
    allLessons.find(l =>
      l.level === browseLevel &&
      l.subject_id === subId &&
      l.component_id === compId &&
      l.unit_number === unitNum &&
      (l.week_number || 1) === weekNum
    );

  const topicsForWeek = (subId, compId, unitNum, weekNum) =>
    topics.filter(t =>
      t.level === browseLevel &&
      t.subject_id === subId &&
      t.component_id === compId &&
      t.unit_number === unitNum &&
      t.week_number === weekNum
    );

  const resetForm = () => {
    setError("");
    setEditingId(null);
    setSubjectId("francais");
    setComponentId("expression-orale");
    setLevelId("cm1");
    setUnitNumber(1);
    setWeekNumber(1);
    setTitle("");
    setObjective("");
    setParentTip("");
    setDuration("45 minutes");
    setSections([{ type: "intro", title: "Introduction", icon: "💡", blocks: [emptyBlock("text")] }]);
    setExercises([{ question: "", type: "open", options: ["", "", "", ""], answer: "" }]);
    setQuizQuestions([{ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }]);
  };

  // Create a lesson pre-filled with the browser context (subject/component/unit/week).
  const startCreate = (ctx = {}) => {
    resetForm();
    if (ctx.subjectId) setSubjectId(ctx.subjectId);
    if (ctx.componentId) setComponentId(ctx.componentId);
    if (ctx.levelId) setLevelId(ctx.levelId);
    if (ctx.unitNumber) setUnitNumber(ctx.unitNumber);
    if (ctx.weekNumber) setWeekNumber(ctx.weekNumber);
    setView("editor");
  };

  const startEdit = async (lesson) => {
    setEditingId(lesson.id);
    setSubjectId(lesson.subject_id);
    setComponentId(lesson.component_id);
    setLevelId(lesson.level);
    setUnitNumber(lesson.unit_number);
    setWeekNumber(lesson.week_number || 1);
    setTitle(lesson.title);
    setObjective(lesson.objective || "");
    setParentTip(lesson.parent_tip || "");
    setDuration(lesson.duration || "45 minutes");
    setError("");

    // Load sections
    const { data: sectionData } = await supabase
      .from("lesson_sections")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("section_order");

    if (sectionData && sectionData.length > 0) {
      const sectionIds = sectionData.map(s => s.id);
      const { data: blockData } = await supabase
        .from("section_blocks")
        .select("*")
        .in("section_id", sectionIds)
        .order("block_order");

      setSections(sectionData.map(s => {
        const ownBlocks = (blockData || [])
          .filter(b => b.section_id === s.id)
          .map(b => ({
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
          blocks: ownBlocks.length > 0 ? ownBlocks : [emptyBlock("text")],
        };
      }));
    } else {
      setSections([{ type: "intro", title: "Introduction", icon: "💡", blocks: [emptyBlock("text")] }]);
    }

    // Load exercises
    const { data: exerciseData } = await supabase
      .from("exercises")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("exercise_order");

    if (exerciseData && exerciseData.length > 0) {
      setExercises(exerciseData.map(ex => ({
        question: ex.question,
        type: ex.exercise_type,
        options: ex.options ? (typeof ex.options === "string" ? JSON.parse(ex.options) : ex.options).concat(["", "", "", ""]).slice(0, 4) : ["", "", "", ""],
        answer: ex.answer || "",
      })));
    } else {
      setExercises([{ question: "", type: "open", options: ["", "", "", ""], answer: "" }]);
    }

    // Load quiz questions
    const { data: quizData } = await supabase
      .from("readiness_questions")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("question_order");

    if (quizData && quizData.length > 0) {
      setQuizQuestions(quizData.map(q => ({
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
      })));
    } else {
      setQuizQuestions([{ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }]);
    }

    setView("editor");
  };

  const loadFeedback = async () => {
    setFeedbackLoading(true);
    const [{ data: fb }, { data: ts }] = await Promise.all([
      supabase.from("lesson_feedback").select("*").order("updated_at", { ascending: false }).limit(FEEDBACK_CAP),
      supabase.from("teachers").select("id, full_name"),
    ]);
    setTeacherNames(Object.fromEntries((ts || []).map((t) => [t.id, t.full_name])));
    setFeedbackRows((fb || []).filter((f) => (f.comment && f.comment.trim()) || f.rating));
    setFeedbackLoading(false);
  };

  // Mark a feedback processed (or reopen it). Admin-only via RLS.
  const setFeedbackProcessed = async (id, processed) => {
    const { data: u } = await supabase.auth.getUser();
    const patch = processed
      ? { processed_at: new Date().toISOString(), processed_by: u?.user?.id || null }
      : { processed_at: null, processed_by: null };
    const { error } = await supabase.from("lesson_feedback").update(patch).eq("id", id);
    if (!error) setFeedbackRows((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  // Delete a feedback the admin judges unimportant. Admin-only via RLS.
  const deleteFeedback = async (id) => {
    const { error } = await supabase.from("lesson_feedback").delete().eq("id", id);
    if (!error) setFeedbackRows((prev) => prev.filter((f) => f.id !== id));
    setPendingDelete(null);
  };

  // Export a list (grouped by lesson) as a readable .txt the admin can keep
  // and work from while modifying lessons.
  const downloadFeedbackList = (rows, label) => {
    const today = new Date().toISOString().slice(0, 10);
    const byL = {};
    rows.forEach((f) => { (byL[f.lesson_id] = byL[f.lesson_id] || []).push(f); });
    const lines = [
      `EduCam — Retours des enseignants — ${label}`,
      `Exporté le ${today} · ${rows.length} commentaire(s)`,
      "",
    ];
    Object.keys(byL).forEach((lid) => {
      const lesson = allLessons.find((l) => String(l.id) === String(lid));
      lines.push("========================================================");
      lines.push(`LEÇON : ${lesson?.title || "Leçon #" + lid}  (#${lid})`);
      lines.push("========================================================");
      byL[lid].forEach((f) => {
        const who = teacherNames[f.teacher_id] || "Enseignant";
        const stars = f.rating ? `${"★".repeat(f.rating)}${"☆".repeat(5 - f.rating)}` : "—";
        const sec = f.section_title ? ` [${f.section_title}]` : "";
        const date = (f.updated_at || "").slice(0, 10);
        const done = f.processed_at ? ` · traité le ${(f.processed_at || "").slice(0, 10)}` : "";
        lines.push(`- ${who} · ${stars}${sec} · ${date}${done}`);
        if (f.comment) lines.push("  " + f.comment.replace(/\n/g, "\n  "));
        lines.push("");
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `retours-${label.toLowerCase()}-${today}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (lessonId) => {
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (!error) {
      setAllLessons(allLessons.filter(l => l.id !== lessonId));
      setDeleteConfirm(null);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !objective.trim()) {
      setError("Veuillez remplir le titre et l'objectif de la leçon.");
      return;
    }
    setSaving(true);
    setError("");

    // FILET DE SÉCURITÉ (2026-08-13). Plus bas, l'enregistrement SUPPRIME
    // sections, exercices et questions avant de les réinsérer : une coupure
    // réseau au milieu laissait la leçon amputée, sans avertissement. Le filet
    // existait dans le lecteur de leçon depuis le 2026-08-11 mais PAS ici,
    // c'est-à-dire pas dans l'écran où l'on édite le plus.
    // Si l'instantané échoue, on renonce à enregistrer : sans lui on n'aurait
    // plus rien pour réparer.
    let snap = null;
    if (editingId) {
      try {
        snap = await takeBackup(editingId);
      } catch (_) {
        setError("Impossible de sécuriser la leçon avant l'enregistrement. Vérifiez votre connexion et réessayez.");
        setSaving(false);
        return;
      }
    }

    try {
      let lessonId;

      if (editingId) {
        const { error: updateError } = await supabase
          .from("lessons")
          .update({
            subject_id: subjectId,
            component_id: componentId,
            level: levelId,
            unit_number: unitNumber,
            week_number: weekNumber,
            theme: THEMES[unitNumber - 1],
            title: title,
            objective: objective,
            duration: duration,
            ...(PARENT_TIP_ENABLED ? { parent_tip: parentTip || null } : {}),
          })
          .eq("id", editingId);

        if (updateError) throw updateError;
        lessonId = editingId;

        await supabase.from("lesson_sections").delete().eq("lesson_id", lessonId);
        await supabase.from("exercises").delete().eq("lesson_id", lessonId);
        await supabase.from("readiness_questions").delete().eq("lesson_id", lessonId);
      } else {
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .insert({
            subject_id: subjectId,
            component_id: componentId,
            level: levelId,
            unit_number: unitNumber,
            week_number: weekNumber,
            theme: THEMES[unitNumber - 1],
            title: title,
            objective: objective,
            duration: duration,
            ...(PARENT_TIP_ENABLED ? { parent_tip: parentTip || null } : {}),
          })
          .select()
          .single();

        if (lessonError) throw lessonError;
        lessonId = lessonData.id;
      }

      // Insert sections (base fields only — content lives in section_blocks)
      const sectionsToInsert = sections.map((s, i) => ({
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

      const blocksToInsert = [];
      sections.forEach((s, i) => {
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

      const exercisesToInsert = exercises
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

      const quizToInsert = quizQuestions
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

      if (editingId) clearBackup(editingId);

      await fetchAllLessons();
      setView("browse");
      resetForm();
    } catch (err) {
      // Échec en cours de route : on remet la leçon dans son état d'origine.
      const restored = await rollback(snap);
      setError(
        snap == null
          ? "Erreur : " + err.message
          : restored
            ? "L'enregistrement a échoué — la leçon a été remise dans son état précédent. Vos modifications sont toujours à l'écran : réessayez."
            : "L'enregistrement a échoué et la restauration automatique aussi. NE FERMEZ PAS cette page : une copie de sécurité est conservée, réessayez dès que la connexion revient."
      );
    }

    setSaving(false);
  };

  // ============ HELPERS ============
  const getSubjectName = (id) => SUBJECTS.find(s => s.id === id)?.name || id;
  const getLevelName = (id) => LEVELS.find(l => l.id === id)?.name || id;

  const addSection = () => {
    setSections([...sections, { type: "content", title: "", icon: "📖", blocks: [emptyBlock("text")] }]);
  };
  const updateSection = (index, field, value) => {
    const updated = [...sections];
    updated[index][field] = value;
    if (field === "type") {
      const typeInfo = SECTION_TYPES.find(t => t.id === value);
      updated[index].icon = typeInfo?.icon || "📖";
    }
    setSections(updated);
  };
  const removeSection = (index) => { if (sections.length > 1) setSections(sections.filter((_, i) => i !== index)); };
  const moveSection = (index, direction) => {
    const updated = [...sections];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= updated.length) return;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSections(updated);
  };

  // ---- Block helpers (text / image / video within a section) ----
  const addBlock = (sIndex, type = "text") => {
    const updated = [...sections];
    updated[sIndex] = { ...updated[sIndex], blocks: [...updated[sIndex].blocks, emptyBlock(type)] };
    setSections(updated);
  };
  const updateBlock = (sIndex, bIndex, field, value) => {
    const updated = [...sections];
    const blocks = [...updated[sIndex].blocks];
    blocks[bIndex] = { ...blocks[bIndex], [field]: value };
    updated[sIndex] = { ...updated[sIndex], blocks };
    setSections(updated);
  };
  const removeBlock = (sIndex, bIndex) => {
    const updated = [...sections];
    if (updated[sIndex].blocks.length > 1) {
      updated[sIndex] = { ...updated[sIndex], blocks: updated[sIndex].blocks.filter((_, i) => i !== bIndex) };
      setSections(updated);
    }
  };
  const moveBlock = (sIndex, bIndex, direction) => {
    const updated = [...sections];
    const blocks = [...updated[sIndex].blocks];
    const newIndex = bIndex + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    [blocks[bIndex], blocks[newIndex]] = [blocks[newIndex], blocks[bIndex]];
    updated[sIndex] = { ...updated[sIndex], blocks };
    setSections(updated);
  };

  const handleImageUpload = async (sIndex, bIndex, file) => {
    if (!file) return;
    const key = `${sIndex}-${bIndex}`;
    setUploadingKey(key);
    setError("");
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("lesson-images").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("lesson-images").getPublicUrl(fileName);
      updateBlock(sIndex, bIndex, "media_url", urlData.publicUrl);
    } catch (err) {
      setError("Erreur upload image: " + err.message);
    }
    setUploadingKey(null);
  };

  const addExercise = () => {
    setExercises([...exercises, { question: "", type: "open", options: ["", "", "", ""], answer: "" }]);
  };
  const updateExercise = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };
  const updateOption = (exIndex, optIndex, value) => {
    const updated = [...exercises];
    updated[exIndex].options[optIndex] = value;
    setExercises(updated);
  };
  const removeExercise = (index) => { if (exercises.length > 1) setExercises(exercises.filter((_, i) => i !== index)); };

  // ============ HEADER ============
  // Le bandeau vert et la police `Segoe UI` codée en dur ont disparu : l'écran
  // vit dans le chrome commun (rail + `ec-main`), comme tous les autres.
  const AdminHeader = () => (
    <button onClick={onBack} className="ec-link"
      style={{ minHeight: 40, marginBottom: 14, textDecoration: "none", color: COLORS.ink2 }}>
      ‹ Retour au tableau de bord
    </button>
  );

  // ============ BROWSER ============
  if (view === "feedback") {
    const newRows = feedbackRows.filter((f) => !f.processed_at);
    const doneRows = feedbackRows.filter((f) => f.processed_at);
    const activeRows = feedbackTab === "done" ? doneRows : newRows;
    const label = feedbackTab === "done" ? "Traités" : "Nouveaux";
    const byLesson = {};
    activeRows.forEach((f) => { (byLesson[f.lesson_id] = byLesson[f.lesson_id] || []).push(f); });
    const lessonIds = Object.keys(byLesson);
    const tabBtn = (key, text, count, active) => (
      <button onClick={() => { setFeedbackTab(key); setPendingDelete(null); }} style={{
        padding: "8px 16px", borderRadius: 999, fontSize: "var(--ec-fs-3)", fontWeight: 700, cursor: "pointer",
        border: active ? "none" : "1.5px solid #E5E7EB",
        background: active ? "#0F4C35" : "white", color: active ? "white" : COLORS.ink2,
      }}>{text} ({count})</button>
    );
    const actBtn = (bg, color, border) => ({
      padding: "5px 10px", borderRadius: 7, fontSize: "var(--ec-fs-2)", fontWeight: 700, cursor: "pointer",
      background: bg, color, border: border || "none",
    });
    return (
      <div>
        <AdminHeader />
        <div>
          <button onClick={() => setView("browse")} style={{
            display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            color: COLORS.ink3, fontSize: "var(--ec-fs-3)", fontWeight: 600, cursor: "pointer", marginBottom: 16, padding: 0
          }}>← Retour à la gestion</button>
          <h1 style={{ fontSize: "var(--ec-fs-6)", fontWeight: 800, color: COLORS.ink, margin: "0 0 4px" }}>Retours des enseignants</h1>
          <p style={{ color: COLORS.ink3, margin: "0 0 16px", fontSize: "var(--ec-fs-3)" }}>
            Les nouveaux retours à examiner, séparés de ceux déjà traités. Téléchargez une liste pour la garder sous la main, marquez un retour « traité » une fois pris en compte, ou supprimez-le s'il est sans intérêt.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {tabBtn("new", "Nouveaux", newRows.length, feedbackTab === "new")}
            {tabBtn("done", "Traités", doneRows.length, feedbackTab === "done")}
            <button onClick={() => downloadFeedbackList(activeRows, label)} disabled={activeRows.length === 0} style={{
              marginLeft: "auto", padding: "8px 14px", borderRadius: 8, fontSize: "var(--ec-fs-3)", fontWeight: 700,
              border: "1.5px solid #0F4C35", background: "white", color: COLORS.g700,
              cursor: activeRows.length === 0 ? "default" : "pointer", opacity: activeRows.length === 0 ? 0.5 : 1, whiteSpace: "nowrap",
            }}>⬇ Télécharger la liste</button>
          </div>
          {feedbackLoading ? (
            <p style={{ color: COLORS.ink3 }}>Chargement…</p>
          ) : lessonIds.length === 0 ? (
            <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: "28px", textAlign: "center", color: COLORS.ink3 }}>
              {feedbackTab === "done" ? "Aucun retour traité pour le moment." : "Aucun nouveau retour."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {lessonIds.map((lid) => {
                const lesson = allLessons.find((l) => String(l.id) === String(lid));
                const rows = byLesson[lid];
                return (
                  <div key={lid} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 800, color: COLORS.ink }}>{lesson?.title || `Leçon #${lid}`}</div>
                        <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3 }}>{rows.length} commentaire(s)</div>
                      </div>
                      <button onClick={async () => {
                        const { data } = await supabase.from("lessons").select("*").eq("id", Number(lid)).maybeSingle();
                        if (data) startEdit(data);
                      }} style={{
                        padding: "8px 16px", background: COLORS.g700, color: "white", border: "none",
                        borderRadius: 8, fontSize: "var(--ec-fs-3)", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
                      }}>✏️ Modifier cette leçon</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {rows.map((f) => (
                        <div key={f.id} style={{ background: COLORS.page, border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: "var(--ec-fs-3)", fontWeight: 700, color: COLORS.ink }}>{teacherNames[f.teacher_id] || "Enseignant"}</span>
                            {f.rating ? <span style={{ fontSize: "var(--ec-fs-2)", color: "#F59E0B" }}>{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span> : null}
                            {f.section_title ? <span style={{ fontSize: "var(--ec-fs-2)", color: "#7C3AED", background: "#F5F3FF", borderRadius: 999, padding: "2px 8px" }}>{f.section_title}</span> : null}
                            <span style={{ fontSize: "var(--ec-fs-1)", color: COLORS.ink3, marginLeft: "auto" }}>{(f.updated_at || "").slice(0, 10)}</span>
                          </div>
                          {f.comment && <div style={{ fontSize: "var(--ec-fs-3)", color: COLORS.ink2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{f.comment}</div>}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            {f.processed_at ? (
                              <>
                                <span style={{ fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.good }}>✓ Traité le {(f.processed_at || "").slice(0, 10)}</span>
                                <button onClick={() => setFeedbackProcessed(f.id, false)} style={actBtn("white", "#374151", "1.5px solid #E5E7EB")}>↩ Rouvrir</button>
                              </>
                            ) : (
                              <button onClick={() => setFeedbackProcessed(f.id, true)} style={actBtn("#0F4C35", "white")}>✓ Marquer comme traité</button>
                            )}
                            {pendingDelete === f.id ? (
                              <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                                <span style={{ fontSize: "var(--ec-fs-2)", color: COLORS.crit, fontWeight: 700 }}>Supprimer ?</span>
                                <button onClick={() => deleteFeedback(f.id)} style={actBtn("#DC2626", "white")}>Oui</button>
                                <button onClick={() => setPendingDelete(null)} style={actBtn("white", "#374151", "1.5px solid #E5E7EB")}>Non</button>
                              </span>
                            ) : (
                              <button onClick={() => setPendingDelete(f.id)} style={{ ...actBtn("white", "#DC2626", "1.5px solid #FCA5A5"), marginLeft: "auto" }}>🗑 Supprimer</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "browse") {
    return (
      <div>
        <AdminHeader />
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 60px" }}>

          {/* ---- SUBJECTS GRID ---- */}
          {!browseSubject && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1 style={{ fontSize: "var(--ec-fs-6)", fontWeight: 800, color: COLORS.ink, margin: "0 0 4px" }}>Gestion des leçons</h1>
                  <p style={{ color: COLORS.ink3, margin: 0, fontSize: "var(--ec-fs-3)" }}>Choisissez une discipline pour gérer ses leçons par unité et par semaine.</p>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                  <button onClick={() => { setView("feedback"); loadFeedback(); }} style={{
                    padding: "9px 14px", background: "white", border: "1.5px solid #7C3AED", color: "#7C3AED",
                    borderRadius: 8, fontSize: "var(--ec-fs-3)", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
                  }}>💬 Retours des enseignants</button>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>Niveau</label>
                    <select value={browseLevel} onChange={(e) => setBrowseLevel(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                      {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {loadingLessons ? (
                <p style={{ textAlign: "center", color: COLORS.ink3, padding: "40px 0" }}>Chargement...</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                  {SUBJECTS.map(subject => {
                    const count = allLessons.filter(l => l.level === browseLevel && l.subject_id === subject.id).length;
                    return (
                      <div key={subject.id}
                        onClick={() => { setBrowseSubject(subject); setBrowseComponent(null); }}
                        style={{
                          background: "white", borderRadius: 12, padding: "20px",
                          border: "1px solid #E5E7EB", cursor: "pointer",
                          transition: "all 0.2s", position: "relative", overflow: "hidden"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = subject.color; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: subject.color }} />
                        <div style={{ fontSize: "var(--ec-fs-7)", marginBottom: 10 }}>{subject.icon}</div>
                        <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink, marginBottom: 6, lineHeight: 1.3 }}>{subject.name}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "var(--ec-fs-3)", color: COLORS.ink3 }}>{subject.components.length} composantes</span>
                          <span style={{ fontSize: "var(--ec-fs-2)", color: subject.color, fontWeight: 600, background: `${subject.color}15`, padding: "3px 10px", borderRadius: 20 }}>
                            {count} leçon{count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ---- COMPONENTS LIST ---- */}
          {browseSubject && !browseComponent && (
            <div>
              <button onClick={() => setBrowseSubject(null)} style={{
                display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                color: COLORS.ink3, fontSize: "var(--ec-fs-3)", fontWeight: 600, cursor: "pointer", marginBottom: 20, padding: 0
              }}>← Toutes les disciplines</button>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                <div style={{ fontSize: 48 }}>{browseSubject.icon}</div>
                <div>
                  <h1 style={{ fontSize: "var(--ec-fs-6)", fontWeight: 800, color: COLORS.ink, margin: 0 }}>{browseSubject.name}</h1>
                  <p style={{ color: COLORS.ink3, margin: "4px 0 0", fontSize: "var(--ec-fs-3)" }}>{getLevelName(browseLevel)} · {browseSubject.components.length} composantes</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {browseSubject.components.map(comp => {
                  const count = lessonsForComponent(browseSubject.id, comp.id).length;
                  return (
                    <div key={comp.id}
                      onClick={() => setBrowseComponent(comp)}
                      style={{
                        background: "white", borderRadius: 10, padding: "16px 18px",
                        border: "1px solid #E5E7EB", cursor: "pointer",
                        display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = browseSubject.color; e.currentTarget.style.background = `${browseSubject.color}08`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "white"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: browseSubject.color }} />
                        <div>
                          <span style={{ fontSize: "var(--ec-fs-4)", fontWeight: 600, color: COLORS.ink }}>{comp.name}</span>
                          <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 2 }}>
                            {count} leçon{count !== 1 ? "s" : ""} créée{count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <span style={{ color: COLORS.ink3 }}>›</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- UNIT / WEEK MANAGEMENT TIMELINE ---- */}
          {browseSubject && browseComponent && (
            <div>
              <button onClick={() => setBrowseComponent(null)} style={{
                display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                color: COLORS.ink3, fontSize: "var(--ec-fs-3)", fontWeight: 600, cursor: "pointer", marginBottom: 20, padding: 0
              }}>← {browseSubject.name}</button>

              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: "var(--ec-fs-6)", fontWeight: 800, color: COLORS.ink, margin: "0 0 4px" }}>{browseComponent.name}</h1>
                <p style={{ color: COLORS.ink3, margin: 0, fontSize: "var(--ec-fs-3)" }}>{browseSubject.name} · {getLevelName(browseLevel)} · Une leçon par semaine</p>
              </div>

              {THEMES.map((theme, unitIdx) => {
                const unitNum = unitIdx + 1;
                const color = browseSubject.color;
                return (
                  <div key={unitNum} style={{ marginBottom: 22 }}>
                    {/* Unit header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, background: color,
                        color: "white", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "var(--ec-fs-3)", fontWeight: 700
                      }}>{unitNum}</div>
                      <div>
                        <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink }}>{theme}</div>
                        <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3 }}>{MONTH_UNIT_MAP[unitIdx]}</div>
                      </div>
                    </div>

                    <div style={{ marginLeft: 18, borderLeft: `2px solid ${color}30`, paddingLeft: 20 }}>
                      {[1, 2, 3].map(week => {
                        const lesson = lessonForWeek(browseSubject.id, browseComponent.id, unitNum, week);
                        const wkTopics = topicsForWeek(browseSubject.id, browseComponent.id, unitNum, week);
                        return (
                          <div key={week} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: "var(--ec-fs-2)", fontWeight: 700, color: color, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 }}>
                              Semaine {week}
                            </div>

                            {wkTopics.length > 0 && (
                              <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginBottom: 6, paddingLeft: 2 }}>
                                {wkTopics.map(t => t.topic_title).join(" · ")}
                              </div>
                            )}

                            {lesson ? (
                              <div style={{
                                background: "white", borderRadius: 8, border: "1px solid #E5E7EB",
                                padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10
                              }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "var(--ec-fs-3)", fontWeight: 600, color: COLORS.ink }}>{lesson.title}</div>
                                  <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 2 }}>{lesson.duration}</div>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={() => startEdit(lesson)} style={{
                                    padding: "6px 12px", background: "#EFF6FF", border: "1px solid #BFDBFE",
                                    borderRadius: 6, fontSize: "var(--ec-fs-2)", fontWeight: 600, color: "#3B82F6", cursor: "pointer", whiteSpace: "nowrap"
                                  }}>Modifier</button>
                                  {deleteConfirm === lesson.id ? (
                                    <div style={{ display: "flex", gap: 4 }}>
                                      <button onClick={() => handleDelete(lesson.id)} style={{
                                        padding: "6px 10px", background: COLORS.crit, border: "none",
                                        borderRadius: 6, fontSize: "var(--ec-fs-2)", fontWeight: 600, color: "white", cursor: "pointer"
                                      }}>Oui</button>
                                      <button onClick={() => setDeleteConfirm(null)} style={{
                                        padding: "6px 10px", background: "#F3F4F6", border: "1px solid #D1D5DB",
                                        borderRadius: 6, fontSize: "var(--ec-fs-2)", fontWeight: 600, color: COLORS.ink2, cursor: "pointer"
                                      }}>Non</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setDeleteConfirm(lesson.id)} style={{
                                      padding: "6px 12px", background: "#FEF2F2", border: "1px solid #FECACA",
                                      borderRadius: 6, fontSize: "var(--ec-fs-2)", fontWeight: 600, color: COLORS.crit, cursor: "pointer", whiteSpace: "nowrap"
                                    }}>Supprimer</button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => startCreate({
                                subjectId: browseSubject.id, componentId: browseComponent.id,
                                levelId: browseLevel, unitNumber: unitNum, weekNumber: week
                              })} style={{
                                width: "100%", padding: "10px 14px", background: "white",
                                border: "1px dashed #D1D5DB", borderRadius: 8, fontSize: "var(--ec-fs-3)",
                                fontWeight: 600, color: COLORS.ink3, cursor: "pointer", textAlign: "left"
                              }}>+ Créer la leçon de la semaine {week}</button>
                            )}
                          </div>
                        );
                      })}

                      {/* Week 4 note */}
                      <div style={{ fontSize: "var(--ec-fs-2)", color: "#D97706", background: "#FFFBEB", borderRadius: 6, padding: "6px 10px", marginTop: 4 }}>
                        Semaine 4 — Intégration et évaluation (pas de leçon)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ SINGLE-PAGE EDITOR ============
  const sectionCardStyle = {
    background: "white", borderRadius: 12, border: "1px solid #E5E7EB",
    padding: "20px", marginBottom: 20
  };
  const cardTitleStyle = { fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink, margin: "0 0 16px" };

  // Adjacent existing lessons (across units) of the lesson being edited, so the
  // editor can step to the previous/next lesson without going back to the list.
  const getAdjacentAdminLessons = () => {
    if (!editingId) return { prev: null, next: null };
    const siblings = (allLessons || [])
      .filter(l => l.subject_id === subjectId && l.component_id === componentId)
      .sort((a, b) => (a.unit_number - b.unit_number) || ((a.week_number || 1) - (b.week_number || 1)));
    const idx = siblings.findIndex(l => l.id === editingId);
    if (idx === -1) return { prev: null, next: null };
    return {
      prev: idx > 0 ? siblings[idx - 1] : null,
      next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
    };
  };

  const goToAdminLesson = (lesson) => {
    if (!lesson) return;
    if (!window.confirm("Passer à une autre leçon ? Les modifications non enregistrées seront perdues.")) return;
    startEdit(lesson);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <AdminHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        <button onClick={() => { resetForm(); setView("browse"); }} style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: COLORS.ink3, fontSize: "var(--ec-fs-3)", fontWeight: 600, cursor: "pointer", marginBottom: 16, padding: 0
        }}>← Retour à la gestion</button>

        {editingId && (() => {
          const { prev: prevLesson, next: nextLesson } = getAdjacentAdminLessons();
          const navBtn = (active, align) => ({
            flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
            alignItems: align === "right" ? "flex-end" : "flex-start", gap: 2,
            padding: "10px 16px", borderRadius: 10, textAlign: align === "right" ? "right" : "left",
            border: `1.5px solid ${active ? "#0F4C3540" : COLORS.border}`,
            background: active ? "white" : COLORS.page,
            color: active ? "#0F4C35" : COLORS.ink3,
            cursor: active ? "pointer" : "not-allowed",
          });
          return (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
              <button onClick={() => goToAdminLesson(prevLesson)} disabled={!prevLesson}
                title={prevLesson ? prevLesson.title : "Première leçon"} style={navBtn(!!prevLesson, "left")}>
                <span style={{ fontSize: "var(--ec-fs-1)", fontWeight: 600, opacity: 0.8 }}>← Leçon précédente</span>
                <span style={{ fontSize: "var(--ec-fs-3)", fontWeight: 700, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {prevLesson ? prevLesson.title : "Début du programme"}
                </span>
              </button>
              <button onClick={() => goToAdminLesson(nextLesson)} disabled={!nextLesson}
                title={nextLesson ? nextLesson.title : "Dernière leçon"} style={navBtn(!!nextLesson, "right")}>
                <span style={{ fontSize: "var(--ec-fs-1)", fontWeight: 600, opacity: 0.8 }}>Leçon suivante →</span>
                <span style={{ fontSize: "var(--ec-fs-3)", fontWeight: 700, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {nextLesson ? nextLesson.title : "Fin du programme"}
                </span>
              </button>
            </div>
          );
        })()}

        <h1 style={{ fontSize: "var(--ec-fs-6)", fontWeight: 800, color: COLORS.ink, marginBottom: 24 }}>
          {editingId ? "Modifier la leçon" : "Créer une nouvelle leçon"}
        </h1>

        {error && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
            padding: "10px 14px", marginBottom: 20, fontSize: "var(--ec-fs-3)", color: COLORS.crit
          }}>
            {error}
          </div>
        )}

        {/* ---- INFORMATIONS ---- */}
        <div style={sectionCardStyle}>
          <h3 style={cardTitleStyle}>Informations de la leçon</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              <div>
                <label style={labelStyle}>Discipline *</label>
                <select value={subjectId} onChange={(e) => {
                  setSubjectId(e.target.value);
                  const newSubject = SUBJECTS.find(s => s.id === e.target.value);
                  setComponentId(newSubject?.components[0]?.id || "");
                }} style={inputStyle}>
                  {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Composante *</label>
                <select value={componentId} onChange={(e) => setComponentId(e.target.value)} style={inputStyle}>
                  {components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Niveau *</label>
                <select value={levelId} onChange={(e) => setLevelId(e.target.value)} style={inputStyle}>
                  {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Unité *</label>
                <select value={unitNumber} onChange={(e) => setUnitNumber(parseInt(e.target.value))} style={inputStyle}>
                  {THEMES.map((t, i) => <option key={i} value={i + 1}>Unité {i + 1}: {t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Semaine *</label>
                <select value={weekNumber} onChange={(e) => setWeekNumber(parseInt(e.target.value))} style={inputStyle}>
                  <option value={1}>Semaine 1</option>
                  <option value={2}>Semaine 2</option>
                  <option value={3}>Semaine 3</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: -4 }}>
              Pour déplacer une leçon vers une autre semaine ou unité, changez simplement ces champs puis enregistrez.
            </div>
            <div>
              <label style={labelStyle}>Titre de la leçon *</label>
              <input type="text" placeholder="Ex: La matière: les quatre états" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Objectif pédagogique *</label>
              <textarea placeholder="Ex: Identifier les quatre états de la matière..." value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            {PARENT_TIP_ENABLED && (
              <div>
                <label style={labelStyle}>Conseil d'accompagnement pour le parent</label>
                <textarea
                  placeholder="Ex: Prenez une bande de papier. Demandez à votre enfant de la couper en 2 parts égales, puis en 4. Demandez-lui quelle part est la plus grande."
                  value={parentTip} onChange={(e) => setParentTip(e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: "vertical" }} />
                <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, marginTop: 6, lineHeight: 1.5 }}>
                  Une manipulation concrète, avec des objets du quotidien. Le parent
                  peut ne pas avoir été scolarisé : aucun terme technique, 2 à 4 phrases.
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Durée</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }}>
                <option value="30 minutes">30 minutes</option>
                <option value="45 minutes">45 minutes</option>
                <option value="60 minutes">60 minutes</option>
                <option value="90 minutes">90 minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* ---- SECTIONS / CONTENU ---- */}
        <div style={sectionCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ ...cardTitleStyle, margin: 0 }}>Contenu de la leçon</h3>
            <button onClick={addSection} style={{
              background: COLORS.g700, color: "white", border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: "var(--ec-fs-3)", fontWeight: 600, cursor: "pointer"
            }}>+ Section</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {sections.map((section, i) => (
              <div key={i} style={{
                background: COLORS.page, borderRadius: 10, border: "1px solid #E5E7EB", padding: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink }}>Section {i + 1}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <IconButton label={`Monter la section ${i + 1}`} onClick={() => moveSection(i, -1)} disabled={i === 0}>↑</IconButton>
                    <IconButton label={`Descendre la section ${i + 1}`} onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1}>↓</IconButton>
                    {sections.length > 1 && (
                      <button onClick={() => removeSection(i)} style={{
                        background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6,
                        padding: "4px 10px", fontSize: "var(--ec-fs-2)", color: COLORS.crit, cursor: "pointer"
                      }}>Supprimer</button>
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select value={section.type} onChange={(e) => updateSection(i, "type", e.target.value)} style={inputStyle}>
                      {SECTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Titre</label>
                    <input type="text" placeholder="Titre de la section" value={section.title} onChange={(e) => updateSection(i, "title", e.target.value)} style={inputStyle} />
                  </div>
                </div>

                {section.type === "exercise" ? (
                  <p style={{ fontSize: "var(--ec-fs-3)", color: COLORS.ink3, fontStyle: "italic" }}>Les exercices se gèrent dans la section « Exercices » plus bas.</p>
                ) : (
                  <div>
                    <label style={labelStyle}>Contenu (texte, images et vidéos, dans l'ordre)</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {section.blocks.map((block, j) => {
                        const uploadKey = `${i}-${j}`;
                        const isUploading = uploadingKey === uploadKey;
                        return (
                          <div key={j} style={{
                            background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <select
                                  value={block.block_type}
                                  onChange={(e) => updateBlock(i, j, "block_type", e.target.value)}
                                  style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: "var(--ec-fs-3)" }}
                                >
                                  {BLOCK_TYPES.map(bt => <option key={bt.id} value={bt.id}>{bt.icon} {bt.name}</option>)}
                                </select>
                              </div>
                              <div style={{ display: "flex", gap: 4 }}>
                                <IconButton label={`Monter le bloc ${j + 1}`} onClick={() => moveBlock(i, j, -1)} disabled={j === 0}>↑</IconButton>
                                <IconButton label={`Descendre le bloc ${j + 1}`} onClick={() => moveBlock(i, j, 1)} disabled={j === section.blocks.length - 1}>↓</IconButton>
                                {section.blocks.length > 1 && (
                                  <IconButton label={`Supprimer le bloc ${j + 1}`} onClick={() => removeBlock(i, j)}>
                                    <span style={{ color: COLORS.crit, fontWeight: 700 }}>✕</span>
                                  </IconButton>
                                )}
                              </div>
                            </div>

                            {block.block_type === "text" && (
                              <textarea
                                placeholder="Texte de ce bloc... (utilisez **texte** pour le mettre en gras)"
                                value={block.text_content}
                                onChange={(e) => updateBlock(i, j, "text_content", e.target.value)}
                                rows={5}
                                style={{ ...inputStyle, resize: "vertical" }}
                              />
                            )}

                            {block.block_type === "image" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(i, j, e.target.files?.[0])}
                                  disabled={isUploading}
                                />
                                {isUploading && <span style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3 }}>Téléchargement en cours...</span>}
                                {block.media_url && !isUploading && (
                                  <img src={block.media_url} alt={block.alt_text || ""} style={{ maxWidth: 240, borderRadius: 6, border: "1px solid #E5E7EB" }} />
                                )}
                                <input
                                  type="text"
                                  placeholder="Légende (optionnel)"
                                  value={block.caption}
                                  onChange={(e) => updateBlock(i, j, "caption", e.target.value)}
                                  style={inputStyle}
                                />
                                <input
                                  type="text"
                                  placeholder="Texte alternatif (accessibilité)"
                                  value={block.alt_text}
                                  onChange={(e) => updateBlock(i, j, "alt_text", e.target.value)}
                                  style={inputStyle}
                                />
                              </div>
                            )}

                            {block.block_type === "video" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <input
                                  type="text"
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  value={block.media_url}
                                  onChange={(e) => updateBlock(i, j, "media_url", e.target.value)}
                                  style={inputStyle}
                                />
                                <input
                                  type="text"
                                  placeholder="Légende (optionnel)"
                                  value={block.caption}
                                  onChange={(e) => updateBlock(i, j, "caption", e.target.value)}
                                  style={inputStyle}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => addBlock(i, "text")} style={{
                        padding: "8px 12px", background: "white", border: "1px dashed #D1D5DB",
                        borderRadius: 6, fontSize: "var(--ec-fs-2)", fontWeight: 600, color: COLORS.ink3, cursor: "pointer"
                      }}>+ Texte</button>
                      <button onClick={() => addBlock(i, "image")} style={{
                        padding: "8px 12px", background: "white", border: "1px dashed #D1D5DB",
                        borderRadius: 6, fontSize: "var(--ec-fs-2)", fontWeight: 600, color: COLORS.ink3, cursor: "pointer"
                      }}>+ Image</button>
                      <button onClick={() => addBlock(i, "video")} style={{
                        padding: "8px 12px", background: "white", border: "1px dashed #D1D5DB",
                        borderRadius: 6, fontSize: "var(--ec-fs-2)", fontWeight: 600, color: COLORS.ink3, cursor: "pointer"
                      }}>+ Vidéo</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ---- EXERCICES ---- */}
        <div style={sectionCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ ...cardTitleStyle, margin: 0 }}>Exercices</h3>
            <button onClick={addExercise} style={{
              background: "#F59E0B", color: "white", border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: "var(--ec-fs-3)", fontWeight: 600, cursor: "pointer"
            }}>+ Exercice</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {exercises.map((ex, i) => (
              <div key={i} style={{
                background: COLORS.page, borderRadius: 10, border: "1px solid #E5E7EB", padding: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink }}>Exercice {i + 1}</span>
                  {exercises.length > 1 && (
                    <button onClick={() => removeExercise(i)} style={{
                      background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6,
                      padding: "4px 10px", fontSize: "var(--ec-fs-2)", color: COLORS.crit, cursor: "pointer"
                    }}>Supprimer</button>
                  )}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Type d'exercice</label>
                  <select value={ex.type} onChange={(e) => updateExercise(i, "type", e.target.value)} style={inputStyle}>
                    <option value="open">Question ouverte</option>
                    <option value="fill">Texte à trous</option>
                    <option value="choice">Choix multiple</option>
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Question</label>
                  <textarea placeholder="Votre question..." value={ex.question} onChange={(e) => updateExercise(i, "question", e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                {ex.type === "choice" && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Options</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {ex.options.map((opt, j) => (
                        <div key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: "var(--ec-fs-3)", fontWeight: 600, color: COLORS.ink3, width: 20 }}>{String.fromCharCode(65 + j)}.</span>
                          <input type="text" placeholder={`Option ${j + 1}`} value={opt} onChange={(e) => updateOption(i, j, e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(ex.type === "fill" || ex.type === "choice") && (
                  <div>
                    <label style={labelStyle}>Réponse correcte</label>
                    <input type="text" placeholder="Réponse..." value={ex.answer} onChange={(e) => updateExercise(i, "answer", e.target.value)} style={inputStyle} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ---- QUIZ ---- */}
        <div style={sectionCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ ...cardTitleStyle, margin: 0 }}>Quiz de préparation (enseignant)</h3>
            <button onClick={() => setQuizQuestions([...quizQuestions, { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }])} style={{
              background: "#7C3AED", color: "white", border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: "var(--ec-fs-3)", fontWeight: 600, cursor: "pointer"
            }}>+ Question</button>
          </div>

          <div style={{
            background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10,
            padding: "12px 14px", marginBottom: 16, fontSize: "var(--ec-fs-3)", color: "#6D28D9", lineHeight: 1.5
          }}>
            Ces questions vérifient que l'enseignant a bien compris la leçon avant de la présenter (score requis: 80%).
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {quizQuestions.map((q, i) => (
              <div key={i} style={{
                background: COLORS.page, borderRadius: 10, border: "1px solid #E5E7EB", padding: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink }}>Question {i + 1}</span>
                  {quizQuestions.length > 1 && (
                    <button onClick={() => setQuizQuestions(quizQuestions.filter((_, j) => j !== i))} style={{
                      background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6,
                      padding: "4px 10px", fontSize: "var(--ec-fs-2)", color: COLORS.crit, cursor: "pointer"
                    }}>Supprimer</button>
                  )}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Question</label>
                  <textarea
                    placeholder="Ex: Combien d'états de la matière les élèves doivent-ils identifier?"
                    value={q.question}
                    onChange={(e) => {
                      const updated = [...quizQuestions];
                      updated[i].question = e.target.value;
                      setQuizQuestions(updated);
                    }}
                    rows={2}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 12 }}>
                  {["a", "b", "c", "d"].map((letter) => (
                    <div key={letter}>
                      <label style={labelStyle}>Option {letter.toUpperCase()}</label>
                      <input
                        type="text"
                        placeholder={`Option ${letter.toUpperCase()}`}
                        value={q[`option_${letter}`]}
                        onChange={(e) => {
                          const updated = [...quizQuestions];
                          updated[i][`option_${letter}`] = e.target.value;
                          setQuizQuestions(updated);
                        }}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label style={labelStyle}>Bonne réponse</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["A", "B", "C", "D"].map(letter => (
                      <button key={letter}
                        onClick={() => {
                          const updated = [...quizQuestions];
                          updated[i].correct_answer = letter;
                          setQuizQuestions(updated);
                        }}
                        style={{
                          width: 44, height: 44, borderRadius: 8,
                          border: `2px solid ${q.correct_answer === letter ? "#7C3AED" : COLORS.border2}`,
                          background: q.correct_answer === letter ? "#7C3AED" : "white",
                          color: q.correct_answer === letter ? "white" : COLORS.ink2,
                          fontSize: "var(--ec-fs-4)", fontWeight: 700, cursor: "pointer"
                        }}
                      >{letter}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---- SAVE BAR ---- */}
        <div style={{
          display: "flex", gap: 12, justifyContent: "flex-end",
          padding: "20px 0", borderTop: "1px solid #E5E7EB"
        }}>
          <button onClick={() => { resetForm(); setView("browse"); }} disabled={saving} style={{
            padding: "12px 24px", background: "white", border: "1px solid #D1D5DB",
            borderRadius: 8, fontSize: "var(--ec-fs-3)", fontWeight: 600, color: COLORS.ink2, cursor: "pointer"
          }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "12px 28px", background: saving ? "#6B7280" : COLORS.g700,
            color: "white", border: "none", borderRadius: 8, fontSize: "var(--ec-fs-3)", fontWeight: 700,
            cursor: saving ? "default" : "pointer"
          }}>
            {saving ? "Enregistrement..." : editingId ? "Sauvegarder les modifications ✓" : "Enregistrer la leçon ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
