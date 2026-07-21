"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

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
    id: "sciences", name: "Sciences et Technologies", icon: "🔬", color: "#10B981",
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
    id: "english", name: "English Language", icon: "🇬🇧", color: "#EF4444",
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
      { id: "paix", name: "Éducation à la paix" },
      { id: "citoyennete", name: "Éducation à la citoyenneté" },
      { id: "histoire", name: "Histoire" },
      { id: "geographie", name: "Géographie" },
    ]
  },
  {
    id: "tic", name: "TIC", icon: "💻", color: "#6366F1",
    components: [
      { id: "env-info", name: "Environnements informatiques" },
      { id: "production-tic", name: "Production avec les outils TIC" },
      { id: "internet", name: "Internet et communication" },
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
  "Septembre", "Octobre", "Novembre", "Déc/Janvier",
  "Février", "Mars", "Avril/Mai", "Juin"
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

const inputStyle = {
  width: "100%", padding: "10px 12px", border: "1.5px solid #D1D5DB",
  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
  background: "white"
};

const labelStyle = {
  fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6
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

  const [subjectId, setSubjectId] = useState("francais");
  const [componentId, setComponentId] = useState("expression-orale");
  const [levelId, setLevelId] = useState("cm1");
  const [unitNumber, setUnitNumber] = useState(1);
  const [weekNumber, setWeekNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
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
      .order("created_at", { ascending: false });
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

      await fetchAllLessons();
      setView("browse");
      resetForm();
    } catch (err) {
      setError("Erreur: " + err.message);
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
  const AdminHeader = () => (
    <div style={{ background: "#0F4C35", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>📚</span>
        <span style={{ color: "white", fontSize: 20, fontWeight: 800 }}>EduCam</span>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginLeft: 8 }}>Gestion</span>
      </div>
      <button onClick={onBack} style={{
        background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
        color: "white", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer"
      }}>
        ← Tableau de bord
      </button>
    </div>
  );

  // ============ BROWSER ============
  if (view === "browse") {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <AdminHeader />
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 60px" }}>

          {/* ---- SUBJECTS GRID ---- */}
          {!browseSubject && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Gestion des leçons</h1>
                  <p style={{ color: "#6B7280", margin: 0, fontSize: 14 }}>Choisissez une discipline pour gérer ses leçons par unité et par semaine.</p>
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Niveau</label>
                  <select value={browseLevel} onChange={(e) => setBrowseLevel(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                    {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              {loadingLessons ? (
                <p style={{ textAlign: "center", color: "#6B7280", padding: "40px 0" }}>Chargement...</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
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
                        <div style={{ fontSize: 32, marginBottom: 10 }}>{subject.icon}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937", marginBottom: 6, lineHeight: 1.3 }}>{subject.name}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: "#9CA3AF" }}>{subject.components.length} composantes</span>
                          <span style={{ fontSize: 12, color: subject.color, fontWeight: 600, background: `${subject.color}15`, padding: "3px 10px", borderRadius: 20 }}>
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
                color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20, padding: 0
              }}>← Toutes les disciplines</button>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                <div style={{ fontSize: 48 }}>{browseSubject.icon}</div>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>{browseSubject.name}</h1>
                  <p style={{ color: "#6B7280", margin: "4px 0 0", fontSize: 14 }}>{getLevelName(browseLevel)} · {browseSubject.components.length} composantes</p>
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
                          <span style={{ fontSize: 15, fontWeight: 600, color: "#1F2937" }}>{comp.name}</span>
                          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                            {count} leçon{count !== 1 ? "s" : ""} créée{count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <span style={{ color: "#9CA3AF" }}>›</span>
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
                color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20, padding: 0
              }}>← {browseSubject.name}</button>

              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>{browseComponent.name}</h1>
                <p style={{ color: "#6B7280", margin: 0, fontSize: 14 }}>{browseSubject.name} · {getLevelName(browseLevel)} · Une leçon par semaine</p>
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
                        justifyContent: "center", fontSize: 14, fontWeight: 700
                      }}>{unitNum}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>{theme}</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF" }}>{MONTH_UNIT_MAP[unitIdx]}</div>
                      </div>
                    </div>

                    <div style={{ marginLeft: 18, borderLeft: `2px solid ${color}30`, paddingLeft: 20 }}>
                      {[1, 2, 3].map(week => {
                        const lesson = lessonForWeek(browseSubject.id, browseComponent.id, unitNum, week);
                        const wkTopics = topicsForWeek(browseSubject.id, browseComponent.id, unitNum, week);
                        return (
                          <div key={week} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: color, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 }}>
                              Semaine {week}
                            </div>

                            {wkTopics.length > 0 && (
                              <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6, paddingLeft: 2 }}>
                                {wkTopics.map(t => t.topic_title).join(" · ")}
                              </div>
                            )}

                            {lesson ? (
                              <div style={{
                                background: "white", borderRadius: 8, border: "1px solid #E5E7EB",
                                padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10
                              }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>{lesson.title}</div>
                                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{lesson.duration}</div>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={() => startEdit(lesson)} style={{
                                    padding: "6px 12px", background: "#EFF6FF", border: "1px solid #BFDBFE",
                                    borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#3B82F6", cursor: "pointer", whiteSpace: "nowrap"
                                  }}>Modifier</button>
                                  {deleteConfirm === lesson.id ? (
                                    <div style={{ display: "flex", gap: 4 }}>
                                      <button onClick={() => handleDelete(lesson.id)} style={{
                                        padding: "6px 10px", background: "#DC2626", border: "none",
                                        borderRadius: 6, fontSize: 12, fontWeight: 600, color: "white", cursor: "pointer"
                                      }}>Oui</button>
                                      <button onClick={() => setDeleteConfirm(null)} style={{
                                        padding: "6px 10px", background: "#F3F4F6", border: "1px solid #D1D5DB",
                                        borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer"
                                      }}>Non</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setDeleteConfirm(lesson.id)} style={{
                                      padding: "6px 12px", background: "#FEF2F2", border: "1px solid #FECACA",
                                      borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: "pointer", whiteSpace: "nowrap"
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
                                border: "1px dashed #D1D5DB", borderRadius: 8, fontSize: 13,
                                fontWeight: 600, color: "#6B7280", cursor: "pointer", textAlign: "left"
                              }}>+ Créer la leçon de la semaine {week}</button>
                            )}
                          </div>
                        );
                      })}

                      {/* Week 4 note */}
                      <div style={{ fontSize: 12, color: "#D97706", background: "#FFFBEB", borderRadius: 6, padding: "6px 10px", marginTop: 4 }}>
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
  const cardTitleStyle = { fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <AdminHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        <button onClick={() => { resetForm(); setView("browse"); }} style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16, padding: 0
        }}>← Retour à la gestion</button>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 24 }}>
          {editingId ? "Modifier la leçon" : "Créer une nouvelle leçon"}
        </h1>

        {error && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
            padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#DC2626"
          }}>
            {error}
          </div>
        )}

        {/* ---- INFORMATIONS ---- */}
        <div style={sectionCardStyle}>
          <h3 style={cardTitleStyle}>Informations de la leçon</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: -4 }}>
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
              background: "#0F4C35", color: "white", border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}>+ Section</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {sections.map((section, i) => (
              <div key={i} style={{
                background: "#F9FAFB", borderRadius: 10, border: "1px solid #E5E7EB", padding: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>Section {i + 1}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => moveSection(i, -1)} disabled={i === 0} style={{
                      background: "white", border: "1px solid #D1D5DB", borderRadius: 6,
                      padding: "4px 10px", fontSize: 12, cursor: i === 0 ? "default" : "pointer",
                      opacity: i === 0 ? 0.4 : 1
                    }}>↑</button>
                    <button onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1} style={{
                      background: "white", border: "1px solid #D1D5DB", borderRadius: 6,
                      padding: "4px 10px", fontSize: 12, cursor: i === sections.length - 1 ? "default" : "pointer",
                      opacity: i === sections.length - 1 ? 0.4 : 1
                    }}>↓</button>
                    {sections.length > 1 && (
                      <button onClick={() => removeSection(i)} style={{
                        background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6,
                        padding: "4px 10px", fontSize: 12, color: "#DC2626", cursor: "pointer"
                      }}>Supprimer</button>
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
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
                  <p style={{ fontSize: 13, color: "#6B7280", fontStyle: "italic" }}>Les exercices se gèrent dans la section « Exercices » plus bas.</p>
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
                                  style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: 13 }}
                                >
                                  {BLOCK_TYPES.map(bt => <option key={bt.id} value={bt.id}>{bt.icon} {bt.name}</option>)}
                                </select>
                              </div>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button onClick={() => moveBlock(i, j, -1)} disabled={j === 0} style={{
                                  background: "white", border: "1px solid #D1D5DB", borderRadius: 6,
                                  padding: "4px 8px", fontSize: 12, cursor: j === 0 ? "default" : "pointer",
                                  opacity: j === 0 ? 0.4 : 1
                                }}>↑</button>
                                <button onClick={() => moveBlock(i, j, 1)} disabled={j === section.blocks.length - 1} style={{
                                  background: "white", border: "1px solid #D1D5DB", borderRadius: 6,
                                  padding: "4px 8px", fontSize: 12, cursor: j === section.blocks.length - 1 ? "default" : "pointer",
                                  opacity: j === section.blocks.length - 1 ? 0.4 : 1
                                }}>↓</button>
                                {section.blocks.length > 1 && (
                                  <button onClick={() => removeBlock(i, j)} style={{
                                    background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6,
                                    padding: "4px 8px", fontSize: 12, color: "#DC2626", cursor: "pointer"
                                  }}>✕</button>
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
                                {isUploading && <span style={{ fontSize: 12, color: "#6B7280" }}>Téléchargement en cours...</span>}
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
                        borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#6B7280", cursor: "pointer"
                      }}>+ Texte</button>
                      <button onClick={() => addBlock(i, "image")} style={{
                        padding: "8px 12px", background: "white", border: "1px dashed #D1D5DB",
                        borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#6B7280", cursor: "pointer"
                      }}>+ Image</button>
                      <button onClick={() => addBlock(i, "video")} style={{
                        padding: "8px 12px", background: "white", border: "1px dashed #D1D5DB",
                        borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#6B7280", cursor: "pointer"
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
              padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}>+ Exercice</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {exercises.map((ex, i) => (
              <div key={i} style={{
                background: "#F9FAFB", borderRadius: 10, border: "1px solid #E5E7EB", padding: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>Exercice {i + 1}</span>
                  {exercises.length > 1 && (
                    <button onClick={() => removeExercise(i)} style={{
                      background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6,
                      padding: "4px 10px", fontSize: 12, color: "#DC2626", cursor: "pointer"
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
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", width: 20 }}>{String.fromCharCode(65 + j)}.</span>
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
              padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}>+ Question</button>
          </div>

          <div style={{
            background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10,
            padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#6D28D9", lineHeight: 1.5
          }}>
            Ces questions vérifient que l'enseignant a bien compris la leçon avant de la présenter (score requis: 80%).
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {quizQuestions.map((q, i) => (
              <div key={i} style={{
                background: "#F9FAFB", borderRadius: 10, border: "1px solid #E5E7EB", padding: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>Question {i + 1}</span>
                  {quizQuestions.length > 1 && (
                    <button onClick={() => setQuizQuestions(quizQuestions.filter((_, j) => j !== i))} style={{
                      background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6,
                      padding: "4px 10px", fontSize: 12, color: "#DC2626", cursor: "pointer"
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
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
                          border: `2px solid ${q.correct_answer === letter ? "#7C3AED" : "#D1D5DB"}`,
                          background: q.correct_answer === letter ? "#7C3AED" : "white",
                          color: q.correct_answer === letter ? "white" : "#374151",
                          fontSize: 16, fontWeight: 700, cursor: "pointer"
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
            borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
          }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "12px 28px", background: saving ? "#6B7280" : "#0F4C35",
            color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700,
            cursor: saving ? "default" : "pointer"
          }}>
            {saving ? "Enregistrement..." : editingId ? "Sauvegarder les modifications ✓" : "Enregistrer la leçon ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
