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
    id: "francais", name: "Français et Littérature",
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
    id: "maths", name: "Mathématiques",
    components: [
      { id: "nombres-calculs", name: "Nombres et calculs" },
      { id: "mesures-grandeurs", name: "Mesures et grandeurs" },
      { id: "geometrie", name: "Géométrie et espace" },
      { id: "statistiques", name: "Statistiques" },
    ]
  },
  {
    id: "sciences", name: "Sciences et Technologies",
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
    id: "english", name: "English Language",
    components: [
      { id: "listening", name: "Listening and Speaking" },
      { id: "reading", name: "Reading" },
      { id: "writing", name: "Writing" },
      { id: "grammar", name: "Grammar and Vocabulary" },
    ]
  },
  {
    id: "shs", name: "Sciences humaines et sociales",
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
    id: "tic", name: "TIC",
    components: [
      { id: "env-info", name: "Environnements informatiques" },
      { id: "production-tic", name: "Production avec les outils TIC" },
      { id: "internet", name: "Internet et communication" },
      { id: "programmation", name: "Notions de programmation" },
    ]
  },
  {
    id: "langues", name: "Langues et cultures nationales",
    components: [
      { id: "langue-nationale", name: "Langue nationale" },
    ]
  },
  {
    id: "arts", name: "Éducation artistique",
    components: [
      { id: "arts-visuels", name: "Arts visuels" },
      { id: "musique", name: "Musique" },
      { id: "arts-dramatiques", name: "Arts dramatiques" },
      { id: "danse", name: "Danse" },
    ]
  },
  {
    id: "eps", name: "Éducation physique et sportive",
    components: [
      { id: "athletisme", name: "Activités athlétiques" },
      { id: "sports-co", name: "Sports collectifs" },
      { id: "autodefense", name: "Autodéfense" },
    ]
  },
  {
    id: "devperso", name: "Développement personnel",
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
  const [view, setView] = useState("list"); // list, create, edit
  const [allLessons, setAllLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
 
  // Form state
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingKey, setUploadingKey] = useState(null); // `${sectionIndex}-${blockIndex}` currently uploading
 
  const [subjectId, setSubjectId] = useState("francais");
  const [componentId, setComponentId] = useState("expression-orale");
  const [levelId, setLevelId] = useState("cm1");
  const [unitNumber, setUnitNumber] = useState(1);
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
 
  // Load all lessons
  useEffect(() => {
    fetchAllLessons();
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
 
  const resetForm = () => {
    setStep(1);
    setError("");
    setEditingId(null);
    setSubjectId("francais");
    setComponentId("expression-orale");
    setLevelId("cm1");
    setUnitNumber(1);
    setTitle("");
    setObjective("");
    setDuration("45 minutes");
    setSections([{ type: "intro", title: "Introduction", icon: "💡", blocks: [emptyBlock("text")] }]);
    setExercises([{ question: "", type: "open", options: ["", "", "", ""], answer: "" }]);
    setQuizQuestions([{ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }]);
  };
 
  const startCreate = () => {
    resetForm();
    setView("create");
  };
 
  const startEdit = async (lesson) => {
    setEditingId(lesson.id);
    setSubjectId(lesson.subject_id);
    setComponentId(lesson.component_id);
    setLevelId(lesson.level);
    setUnitNumber(lesson.unit_number);
    setTitle(lesson.title);
    setObjective(lesson.objective || "");
    setDuration(lesson.duration || "45 minutes");
    setStep(1);
    setError("");
 
    // Load sections
    const { data: sectionData } = await supabase
      .from("lesson_sections")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("section_order");
 
    if (sectionData && sectionData.length > 0) {
      // Load every block for every section of this lesson in one query
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
 
    setView("edit");
  };
 
 
  const handleDelete = async (lessonId) => {
    // Sections, blocks, exercises and readiness cascade delete thanks to our DB setup
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (!error) {
      setAllLessons(allLessons.filter(l => l.id !== lessonId));
      setDeleteConfirm(null);
    }
  };
 
  const handleSave = async () => {
    setSaving(true);
    setError("");
 
    try {
      let lessonId;
 
      if (editingId) {
        // UPDATE existing lesson
        const { error: updateError } = await supabase
          .from("lessons")
          .update({
            subject_id: subjectId,
            component_id: componentId,
            level: levelId,
            unit_number: unitNumber,
            theme: THEMES[unitNumber - 1],
            title: title,
            objective: objective,
            duration: duration,
          })
          .eq("id", editingId);
 
        if (updateError) throw updateError;
        lessonId = editingId;
 
        // Wipe old children before re-inserting. Deleting lesson_sections
        // cascade-deletes their section_blocks automatically.
        await supabase.from("lesson_sections").delete().eq("lesson_id", lessonId);
        await supabase.from("exercises").delete().eq("lesson_id", lessonId);
        await supabase.from("readiness_questions").delete().eq("lesson_id", lessonId);
      } else {
        // CREATE new lesson
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .insert({
            subject_id: subjectId,
            component_id: componentId,
            level: levelId,
            unit_number: unitNumber,
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
 
      // Insert sections (base fields only — content now lives in section_blocks)
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
 
      // Build blocks against the freshly-created section ids.
      // Supabase preserves insertion order in the returned rows, so
      // insertedSections[i] corresponds to sections[i].
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
 
      // Exercises
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
 
      // Readiness quiz (teacher prep quiz)
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
      setView("list");
      resetForm();
    } catch (err) {
      setError("Erreur: " + err.message);
    }
 
    setSaving(false);
  };
 
  // ============ HELPERS ============
  const getSubjectName = (id) => SUBJECTS.find(s => s.id === id)?.name || id;
  const getComponentName = (subId, compId) => {
    const sub = SUBJECTS.find(s => s.id === subId);
    return sub?.components.find(c => c.id === compId)?.name || compId;
  };
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
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginLeft: 8 }}>Administration</span>
      </div>
      <button onClick={onBack} style={{
        background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
        color: "white", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer"
      }}>
        ← Tableau de bord
      </button>
    </div>
  );
 
  // ============ LESSON LIST ============
  if (view === "list") {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <AdminHeader />
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 60px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
                Gestion des leçons
              </h1>
              <p style={{ color: "#6B7280", margin: 0, fontSize: 14 }}>
                {allLessons.length} leçon{allLessons.length !== 1 ? "s" : ""} créée{allLessons.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button onClick={startCreate} style={{
              padding: "12px 20px", background: "#0F4C35", color: "white",
              border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer"
            }}>
              + Nouvelle leçon
            </button>
          </div>
 
          {loadingLessons ? (
            <p style={{ textAlign: "center", color: "#6B7280", padding: "40px 0" }}>Chargement...</p>
          ) : allLessons.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 20px", background: "white",
              borderRadius: 12, border: "1px solid #E5E7EB"
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                Aucune leçon pour le moment
              </p>
              <p style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 20 }}>
                Commencez par créer votre première leçon
              </p>
              <button onClick={startCreate} style={{
                padding: "12px 24px", background: "#0F4C35", color: "white",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer"
              }}>
                + Créer une leçon
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allLessons.map(lesson => (
                <div key={lesson.id} style={{
                  background: "white", borderRadius: 10, border: "1px solid #E5E7EB",
                  padding: "16px 18px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937", marginBottom: 4 }}>
                        {lesson.title}
                      </div>
                      <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
                        {getSubjectName(lesson.subject_id)} → {getComponentName(lesson.subject_id, lesson.component_id)}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                          background: "#EFF6FF", color: "#3B82F6"
                        }}>
                          {getLevelName(lesson.level)}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                          background: "#F0FDF4", color: "#16A34A"
                        }}>
                          Unité {lesson.unit_number}: {lesson.theme}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                          background: "#F5F3FF", color: "#7C3AED"
                        }}>
                          {lesson.duration}
                        </span>
                      </div>
                    </div>
 
                    <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                      <button onClick={() => startEdit(lesson)} style={{
                        padding: "6px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE",
                        borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#3B82F6", cursor: "pointer"
                      }}>
                        Modifier
                      </button>
                      {deleteConfirm === lesson.id ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => handleDelete(lesson.id)} style={{
                            padding: "6px 10px", background: "#DC2626", border: "none",
                            borderRadius: 6, fontSize: 12, fontWeight: 600, color: "white", cursor: "pointer"
                          }}>
                            Confirmer
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} style={{
                            padding: "6px 10px", background: "#F3F4F6", border: "1px solid #D1D5DB",
                            borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer"
                          }}>
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(lesson.id)} style={{
                          padding: "6px 14px", background: "#FEF2F2", border: "1px solid #FECACA",
                          borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: "pointer"
                        }}>
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
 
  // ============ CREATE / EDIT FORM ============
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <AdminHeader />
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 60px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
          {editingId ? "Modifier la leçon" : "Créer une nouvelle leçon"}
        </h1>
        <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 28 }}>
          Étape {step} sur 4 — {step === 1 ? "Informations de base" : step === 2 ? "Contenu de la leçon" : step === 3 ? "Exercices" : "Quiz de préparation"}
        </p>
 
        {/* Progress bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 4,
              background: s <= step ? "#0F4C35" : "#E5E7EB"
            }} />
          ))}
        </div>
 
        {error && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
            padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#DC2626"
          }}>
            {error}
          </div>
        )}
 
        {/* STEP 1 */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
              <select value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle}>
                <option value="30 minutes">30 minutes</option>
                <option value="45 minutes">45 minutes</option>
                <option value="60 minutes">60 minutes</option>
                <option value="90 minutes">90 minutes</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <button onClick={() => { resetForm(); setView("list"); }} style={{
                padding: "12px 24px", background: "white", border: "1px solid #D1D5DB",
                borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
              }}>
                ← Annuler
              </button>
              <button onClick={() => {
                if (!title.trim() || !objective.trim()) { setError("Veuillez remplir le titre et l'objectif"); return; }
                setError(""); setStep(2);
              }} style={{
                padding: "12px 28px", background: "#0F4C35", color: "white",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer"
              }}>
                Suivant →
              </button>
            </div>
          </div>
        )}
 
        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {sections.map((section, i) => (
                <div key={i} style={{
                  background: "white", borderRadius: 10, border: "1px solid #E5E7EB", padding: "18px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>Section {i + 1}</span>
                    {sections.length > 1 && (
                      <button onClick={() => removeSection(i)} style={{
                        background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6,
                        padding: "4px 10px", fontSize: 12, color: "#DC2626", cursor: "pointer"
                      }}>Supprimer la section</button>
                    )}
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
                    <p style={{ fontSize: 13, color: "#6B7280", fontStyle: "italic" }}>Les exercices seront ajoutés à l'étape suivante.</p>
                  ) : (
                    <div>
                      <label style={labelStyle}>Contenu (texte, images et vidéos, dans l'ordre)</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {section.blocks.map((block, j) => {
                          const uploadKey = `${i}-${j}`;
                          const isUploading = uploadingKey === uploadKey;
                          return (
                            <div key={j} style={{
                              background: "#FAFAFA", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px"
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
                                  placeholder="Texte de ce bloc..."
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
            <button onClick={addSection} style={{
              width: "100%", padding: "12px", marginTop: 14,
              background: "white", border: "2px dashed #D1D5DB", borderRadius: 10,
              fontSize: 14, fontWeight: 600, color: "#6B7280", cursor: "pointer"
            }}>+ Ajouter une section</button>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <button onClick={() => setStep(1)} style={{
                padding: "12px 24px", background: "white", border: "1px solid #D1D5DB",
                borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
              }}>← Précédent</button>
              <button onClick={() => setStep(3)} style={{
                padding: "12px 28px", background: "#0F4C35", color: "white",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer"
              }}>Suivant →</button>
            </div>
          </div>
        )}
 
        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {exercises.map((ex, i) => (
                <div key={i} style={{
                  background: "white", borderRadius: 10, border: "1px solid #E5E7EB", padding: "18px"
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
            <button onClick={addExercise} style={{
              width: "100%", padding: "12px", marginTop: 14,
              background: "white", border: "2px dashed #D1D5DB", borderRadius: 10,
              fontSize: 14, fontWeight: 600, color: "#6B7280", cursor: "pointer"
            }}>+ Ajouter un exercice</button>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <button onClick={() => setStep(2)} style={{
                padding: "12px 24px", background: "white", border: "1px solid #D1D5DB",
                borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
              }}>← Précédent</button>
              <button onClick={() => setStep(4)} style={{
                padding: "12px 28px", background: "#0F4C35", color: "white",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer"
              }}>Suivant →</button>
            </div>
          </div>
        )}
 
        {/* STEP 4 - QUIZ */}
        {step === 4 && (
          <div>
            <div style={{
              background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10,
              padding: "14px 16px", marginBottom: 20
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#5B21B6", marginBottom: 4 }}>
                Quiz de préparation pour l'enseignant
              </div>
              <div style={{ fontSize: 13, color: "#6D28D9", lineHeight: 1.5 }}>
                Ces questions vérifient que l'enseignant a bien compris la leçon avant de la présenter.
                Créez au moins 5 questions à choix multiple. L'enseignant doit obtenir 80% pour valider.
              </div>
            </div>
 
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {quizQuestions.map((q, i) => (
                <div key={i} style={{
                  background: "white", borderRadius: 10, border: "1px solid #E5E7EB", padding: "18px"
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
                    {["a", "b", "c", "d"].map((letter, j) => (
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
 
            <button onClick={() => setQuizQuestions([...quizQuestions, { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }])} style={{
              width: "100%", padding: "12px", marginTop: 14,
              background: "white", border: "2px dashed #D1D5DB", borderRadius: 10,
              fontSize: 14, fontWeight: 600, color: "#6B7280", cursor: "pointer"
            }}>+ Ajouter une question</button>
 
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <button onClick={() => setStep(3)} style={{
                padding: "12px 24px", background: "white", border: "1px solid #D1D5DB",
                borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
              }}>← Précédent</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "12px 28px", background: saving ? "#6B7280" : "#0F4C35",
                color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: saving ? "default" : "pointer"
              }}>
                {saving ? "Enregistrement..." : editingId ? "Sauvegarder les modifications ✓" : "Enregistrer la leçon ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}