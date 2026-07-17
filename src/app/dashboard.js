"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Admin from "./admin";
import ReadinessQuiz from "./readiness";

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
      { id: "paix", name: "Éducation à la paix" },
      { id: "citoyennete", name: "Éducation à la citoyenneté" },
      { id: "histoire", name: "Histoire" },
      { id: "geographie", name: "Géographie" },
    ]
  },
  {
    id: "tic", name: "TIC", icon: "💻", color: "#6366F1", hours: "2h/sem",
    components: [
      { id: "env-info", name: "Environnements informatiques" },
      { id: "production-tic", name: "Production avec les outils TIC" },
      { id: "internet", name: "Internet et communication" },
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

const DAY_NAMES = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

const MONTH_UNIT_MAP = [
  { month: "Septembre", unit: 1 },
  { month: "Octobre", unit: 2 },
  { month: "Novembre", unit: 3 },
  { month: "Déc/Janvier", unit: 4 },
  { month: "Février", unit: 5 },
  { month: "Mars", unit: 6 },
  { month: "Avril/Mai", unit: 7 },
  { month: "Juin", unit: 8 },
];

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

export default function Dashboard({ teacher, onLogout }) {
  const [selectedLevel, setSelectedLevel] = useState(
    LEVELS.find(l => l.id === teacher?.level) || LEVELS[2]
  );
  const [screen, setScreen] = useState("home");
  const [tab, setTab] = useState("calendar");

  // Calendar state
  const [selectedUnit, setSelectedUnit] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);

  // Programme state
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [programmeView, setProgrammeView] = useState("subjects"); // subjects, components, topics

  // Lesson state
  const [expandedSection, setExpandedSection] = useState(0);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [lessonSections, setLessonSections] = useState([]);
  const [sectionBlocks, setSectionBlocks] = useState({}); // { [section_id]: [block, ...] in order }
  const [lessonExercises, setLessonExercises] = useState([]);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [lessonPassed, setLessonPassed] = useState(false);
  const [projectorMode, setProjectorMode] = useState(false);

  // Data
  const [timetable, setTimetable] = useState([]);
  const [topics, setTopics] = useState([]);
  const [availableLessons, setAvailableLessons] = useState([]);

  useEffect(() => {
    fetchTimetable();
    fetchTopics();
    fetchAllLessons();
  }, [selectedLevel]);

  const fetchTimetable = async () => {
    const { data } = await supabase.from("timetable_slots").select("*")
      .eq("level", selectedLevel.id).order("day_of_week").order("slot_order");
    setTimetable(data || []);
  };

  const fetchTopics = async () => {
    const { data } = await supabase.from("curriculum_topics").select("*")
      .eq("level", selectedLevel.id);
    setTopics(data || []);
  };

  const fetchAllLessons = async () => {
    const { data } = await supabase.from("lessons").select("id, subject_id, component_id, level, unit_number, title")
      .eq("level", selectedLevel.id);
    setAvailableLessons(data || []);
  };

  const getTopic = (unitNum, weekNum, subjectId, componentId) => {
    return topics.find(t => t.unit_number === unitNum && t.week_number === weekNum && t.subject_id === subjectId && t.component_id === componentId)
      || topics.find(t => t.unit_number === unitNum && t.week_number <= weekNum && t.subject_id === subjectId && t.component_id === componentId);
  };

  const getTopicsForComponent = (subjectId, componentId) => {
    return topics.filter(t => t.subject_id === subjectId && t.component_id === componentId)
      .sort((a, b) => a.unit_number - b.unit_number || a.week_number - b.week_number);
  };

  const getLessonForTopic = (subjectId, componentId, unitNumber) => {
    return availableLessons.find(l => l.subject_id === subjectId && l.component_id === componentId && l.unit_number === unitNumber);
  };

  const getDaySlots = (dayNum) => timetable.filter(s => s.day_of_week === dayNum);

  const openLesson = async (lessonId) => {
    setLoadingLesson(true);
    const { data: lesson } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
    const { data: sections } = await supabase.from("lesson_sections").select("*").eq("lesson_id", lessonId).order("section_order");
    const { data: exercises } = await supabase.from("exercises").select("*").eq("lesson_id", lessonId).order("exercise_order");
    const { data: readiness } = await supabase.from("teacher_readiness").select("*").eq("teacher_id", teacher?.id).eq("lesson_id", lessonId).eq("passed", true).maybeSingle();

    // Fetch every block for every section of this lesson in one query, then
    // group them by section so the lesson screen can render text/image/video
    // in the order the content team laid them out.
    const sectionIds = (sections || []).map(s => s.id);
    let blocksBySection = {};
    if (sectionIds.length > 0) {
      const { data: blocks } = await supabase
        .from("section_blocks")
        .select("*")
        .in("section_id", sectionIds)
        .order("block_order");
      (blocks || []).forEach(b => {
        if (!blocksBySection[b.section_id]) blocksBySection[b.section_id] = [];
        blocksBySection[b.section_id].push(b);
      });
    }

    setCurrentLesson(lesson);
    setLessonSections(sections || []);
    setSectionBlocks(blocksBySection);
    setLessonExercises(exercises || []);
    setExpandedSection(0);
    setLessonPassed(!!readiness);
    setScreen("lesson");
    setLoadingLesson(false);
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
  const Header = () => (
    <div style={{
      background: "#0F4C35", padding: "14px 24px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      position: "sticky", top: 0, zIndex: 10
    }}>
      <div onClick={() => { setScreen(tab); setProgrammeView("subjects"); }}
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <span style={{ fontSize: 24 }}>📚</span>
        <span style={{ color: "white", fontSize: 20, fontWeight: 800 }}>EduCam</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <select value={selectedLevel.id}
          onChange={(e) => setSelectedLevel(LEVELS.find(l => l.id === e.target.value))}
          style={{
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
            color: "white", padding: "8px 12px", borderRadius: 8, fontSize: 14,
            fontWeight: 600, cursor: "pointer", outline: "none"
          }}>
          {LEVELS.map(l => <option key={l.id} value={l.id} style={{ color: "#1F2937" }}>{l.name} — {l.primary}</option>)}
        </select>
        <button onClick={async () => { await supabase.auth.signOut(); onLogout(); }} style={{
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
          color: "white", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer"
        }}>Déconnexion</button>
      </div>
    </div>
  );

  // ============ BOTTOM NAV ============
  const BottomNav = () => (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "white", borderTop: "1px solid #E5E7EB",
      display: "flex", justifyContent: "center", gap: 24, padding: "10px 0", zIndex: 10
    }}>
      <button onClick={() => setScreen("home")} style={{
        background: "none", border: "none", cursor: "pointer", textAlign: "center",
        color: screen === "home" ? "#0F4C35" : "#9CA3AF"
      }}>
        <div style={{ fontSize: 22 }}>🏠</div>
        <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>Accueil</div>
      </button>
      <button onClick={() => { setTab("calendar"); setScreen("calendar"); }} style={{
        background: "none", border: "none", cursor: "pointer", textAlign: "center",
        color: screen === "calendar" ? "#0F4C35" : "#9CA3AF"
      }}>
        <div style={{ fontSize: 22 }}>📅</div>
        <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>Emploi du temps</div>
      </button>
      <button onClick={() => { setTab("programme"); setScreen("programme"); setProgrammeView("subjects"); }} style={{
        background: "none", border: "none", cursor: "pointer", textAlign: "center",
        color: screen === "programme" ? "#0F4C35" : "#9CA3AF"
      }}>
        <div style={{ fontSize: 22 }}>📚</div>
        <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>Programme</div>
      </button>
      <button onClick={() => { setScreen("admin"); }} style={{
        background: "none", border: "none", cursor: "pointer", textAlign: "center",
        color: screen === "admin" ? "#0F4C35" : "#9CA3AF"
      }}>
        <div style={{ fontSize: 22 }}>⚙️</div>
        <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>Gestion</div>
      </button>
    </div>
  );

  // ============ CALENDAR VIEW ============
  const CalendarView = () => {
    const isIntegrationWeek = selectedWeek === 4;
    const daySlots = getDaySlots(selectedDay);

    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
            Bonjour, {teacher?.full_name || "Enseignant"} 👋
          </h1>
          <p style={{ color: "#6B7280", margin: 0, fontSize: 14 }}>{selectedLevel.name} — {selectedLevel.full}</p>
        </div>

        {/* Month selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Période</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {MONTH_UNIT_MAP.map(m => (
              <button key={m.unit} onClick={() => { setSelectedUnit(m.unit); setSelectedWeek(1); }}
                style={{
                  padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", border: "none",
                  background: selectedUnit === m.unit ? "#0F4C35" : "white",
                  color: selectedUnit === m.unit ? "white" : "#374151",
                  boxShadow: selectedUnit === m.unit ? "none" : "0 1px 3px rgba(0,0,0,0.1)"
                }}>{m.month}</button>
            ))}
          </div>
        </div>

        {/* Theme banner */}
        <div style={{
          background: "linear-gradient(135deg, #0F4C3515, #1A7A5610)",
          border: "1px solid #0F4C3530", borderRadius: 12, padding: "16px 20px", marginBottom: 20
        }}>
          <div style={{ fontSize: 12, color: "#0F4C35", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Centre d'intérêt {selectedUnit}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginTop: 4 }}>{THEMES[selectedUnit - 1]}</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{MONTH_UNIT_MAP[selectedUnit - 1]?.month} · {selectedLevel.name}</div>
        </div>

        {/* Week selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[1, 2, 3, 4].map(w => (
            <button key={w} onClick={() => setSelectedWeek(w)}
              style={{
                flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: "pointer", border: "none",
                background: selectedWeek === w ? (w === 4 ? "#F59E0B" : "#0F4C35") : "white",
                color: selectedWeek === w ? "white" : "#374151",
                boxShadow: selectedWeek === w ? "none" : "0 1px 3px rgba(0,0,0,0.1)"
              }}>{w === 4 ? "Sem. 4 (Évaluation)" : `Semaine ${w}`}</button>
          ))}
        </div>

        {isIntegrationWeek ? (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>Semaine d'intégration et d'évaluation</h3>
            <p style={{ fontSize: 14, color: "#92400E", lineHeight: 1.6, maxWidth: 500, margin: "0 auto" }}>
              Cette semaine est consacrée à la mobilisation des ressources, aux activités d'évaluation
              des compétences et aux remédiations pour le centre d'intérêt: {THEMES[selectedUnit - 1]}.
            </p>
          </div>
        ) : (
          <>
            {/* Day selector */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(d => (
                <button key={d} onClick={() => setSelectedDay(d)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                    cursor: "pointer", border: "none",
                    background: selectedDay === d ? "#3B82F6" : "white",
                    color: selectedDay === d ? "white" : "#374151",
                    boxShadow: selectedDay === d ? "none" : "0 1px 3px rgba(0,0,0,0.1)"
                  }}>{DAY_NAMES[d]}</button>
              ))}
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
              {DAY_NAMES[selectedDay]} — Semaine {selectedWeek}
            </h2>

            {daySlots.length === 0 ? (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: "40px 20px", textAlign: "center" }}>
                <p style={{ color: "#6B7280" }}>Emploi du temps disponible uniquement pour le CM1 pour le moment.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {daySlots.map((slot, i) => {
                  const topic = getTopic(selectedUnit, selectedWeek, slot.subject_id, slot.component_id);
                  const color = getSubjectColor(slot.subject_id);
                  const icon = getSubjectIcon(slot.subject_id);
                  const lesson = topic ? getLessonForTopic(slot.subject_id, slot.component_id, selectedUnit) : null;
                  const hasBreak = i === 2;

                  return (
                    <div key={i}>
                      {hasBreak && (
                        <div style={{ textAlign: "center", padding: "8px", fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>
                          ☕ Pause (09:00 - 09:15)
                        </div>
                      )}
                      <div style={{
                        background: "white", borderRadius: 10, border: `1px solid ${topic ? color + "40" : "#E5E7EB"}`,
                        overflow: "hidden", cursor: lesson ? "pointer" : "default", transition: "all 0.15s"
                      }}
                        onClick={() => { if (lesson) openLesson(lesson.id); }}
                        onMouseEnter={e => { if (lesson) { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; } }}
                        onMouseLeave={e => { if (lesson) { e.currentTarget.style.borderColor = color + "40"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; } }}
                      >
                        <div style={{ display: "flex" }}>
                          <div style={{
                            width: 80, minWidth: 80, padding: "14px 0",
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", borderRight: "1px solid #F3F4F6", background: "#FAFAFA"
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{slot.start_time}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{slot.end_time}</div>
                          </div>
                          <div style={{ flex: 1, padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 16 }}>{icon}</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: color }}>{slot.subject_name}</span>
                              <span style={{ fontSize: 12, color: "#9CA3AF" }}>· {slot.component_name}</span>
                            </div>
                            {topic ? (
                              <div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: "#1F2937", marginTop: 4 }}>{topic.topic_title}</div>
                                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2, lineHeight: 1.5 }}>{topic.topic_description}</div>
                                {lesson ? (
                                  <span style={{ display: "inline-block", marginTop: 6, fontSize: 11, fontWeight: 600, color: "#10B981", background: "#10B98115", padding: "3px 8px", borderRadius: 20 }}>
                                    Leçon disponible — cliquez pour ouvrir
                                  </span>
                                ) : (
                                  <span style={{ display: "inline-block", marginTop: 6, fontSize: 11, fontWeight: 600, color: "#9CA3AF", background: "#F3F4F6", padding: "3px 8px", borderRadius: 20 }}>
                                    Contenu à ajouter
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", marginTop: 2 }}>Sujet à définir pour cette semaine</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ============ PROGRAMME VIEW ============
  const ProgrammeView = () => {
    // SUBJECTS LIST
    if (programmeView === "subjects") {
      return (
        <div>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Programme scolaire</h1>
            <p style={{ color: "#6B7280", margin: 0, fontSize: 14 }}>{selectedLevel.name} — Toutes les disciplines et leur contenu</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {SUBJECTS.map(subject => (
              <div key={subject.id}
                onClick={() => { setSelectedSubject(subject); setProgrammeView("components"); }}
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
                  <span style={{ fontSize: 12, color: subject.color, fontWeight: 600, background: `${subject.color}15`, padding: "3px 10px", borderRadius: 20 }}>{subject.hours}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // COMPONENTS LIST
    if (programmeView === "components" && selectedSubject) {
      return (
        <div>
          <button onClick={() => setProgrammeView("subjects")} style={{
            display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20, padding: 0
          }}>← Toutes les disciplines</button>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
            <div style={{ fontSize: 48 }}>{selectedSubject.icon}</div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>{selectedSubject.name}</h1>
              <p style={{ color: "#6B7280", margin: "4px 0 0", fontSize: 14 }}>{selectedLevel.name} · {selectedSubject.hours} · {selectedSubject.components.length} composantes</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {selectedSubject.components.map(comp => {
              const compTopics = getTopicsForComponent(selectedSubject.id, comp.id);
              const compLessons = availableLessons.filter(l => l.subject_id === selectedSubject.id && l.component_id === comp.id);
              return (
                <div key={comp.id}
                  onClick={() => { setSelectedComponent(comp); setProgrammeView("topics"); }}
                  style={{
                    background: "white", borderRadius: 10, padding: "16px 18px",
                    border: "1px solid #E5E7EB", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = selectedSubject.color; e.currentTarget.style.background = `${selectedSubject.color}08`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "white"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: selectedSubject.color }} />
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#1F2937" }}>{comp.name}</span>
                      <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                        {compTopics.length} sujets · {compLessons.length} leçon{compLessons.length !== 1 ? "s" : ""} disponible{compLessons.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <span style={{ color: "#9CA3AF" }}>›</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // TOPICS TIMELINE
    if (programmeView === "topics" && selectedSubject && selectedComponent) {
      const compTopics = getTopicsForComponent(selectedSubject.id, selectedComponent.id);
      const color = selectedSubject.color;

      return (
        <div>
          <button onClick={() => setProgrammeView("components")} style={{
            display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20, padding: 0
          }}>← {selectedSubject.name}</button>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>{selectedComponent.name}</h1>
            <p style={{ color: "#6B7280", margin: 0, fontSize: 14 }}>{selectedSubject.name} · {selectedLevel.name} · Progression annuelle</p>
          </div>

          {/* Group by unit */}
          {THEMES.map((theme, unitIdx) => {
            const unitNum = unitIdx + 1;
            const unitTopics = compTopics.filter(t => t.unit_number === unitNum);
            const lesson = getLessonForTopic(selectedSubject.id, selectedComponent.id, unitNum);
            const monthInfo = MONTH_UNIT_MAP[unitIdx];

            return (
              <div key={unitNum} style={{ marginBottom: 20 }}>
                {/* Unit header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, marginBottom: 10
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: unitTopics.length > 0 ? color : "#E5E7EB",
                    color: "white", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 14, fontWeight: 700
                  }}>{unitNum}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>
                      {theme}
                    </div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>{monthInfo?.month}</div>
                  </div>
                </div>

                {unitTopics.length > 0 ? (
                  <div style={{ marginLeft: 18, borderLeft: `2px solid ${color}30`, paddingLeft: 20 }}>
                    {/* Weekly topics */}
                    {[1, 2, 3].map(week => {
                      const weekTopics = unitTopics.filter(t => t.week_number === week);
                      if (weekTopics.length === 0) return null;
                      return (
                        <div key={week} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", marginBottom: 6 }}>
                            Semaine {week}
                          </div>
                          {weekTopics.map((topic, ti) => (
                            <div key={ti} style={{
                              background: "white", borderRadius: 8, padding: "10px 14px",
                              border: "1px solid #E5E7EB", marginBottom: 6
                            }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>{topic.topic_title}</div>
                              {topic.topic_description && (
                                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2, lineHeight: 1.5 }}>{topic.topic_description}</div>
                              )}
                              {topic.savoir_etre && (
                                <div style={{ fontSize: 11, color: color, marginTop: 4 }}>Savoir-être: {topic.savoir_etre}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {/* Lesson link */}
                    {lesson ? (
                      <div onClick={() => openLesson(lesson.id)}
                        style={{
                          background: `${color}08`, borderRadius: 8, padding: "10px 14px",
                          border: `1px solid ${color}30`, marginBottom: 10, cursor: "pointer"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${color}15`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#10B981", background: "#10B98115", padding: "2px 8px", borderRadius: 20 }}>Leçon disponible</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: color }}>{lesson.title}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic", marginBottom: 10, paddingLeft: 4 }}>
                        Leçon à créer pour cette unité
                      </div>
                    )}

                    {/* Week 4 */}
                    <div style={{ fontSize: 12, color: "#D97706", background: "#FFFBEB", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
                      Semaine 4 — Intégration et évaluation
                    </div>
                  </div>
                ) : (
                  <div style={{ marginLeft: 18, borderLeft: "2px solid #E5E7EB", paddingLeft: 20, paddingBottom: 10 }}>
                    <div style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>Sujets à définir pour cette unité</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  // ============ LESSON SCREEN ============
  const LessonScreen = () => {
    if (loadingLesson) {
      return (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>📖</div>
          <p style={{ color: "#6B7280", fontSize: 16 }}>Chargement de la leçon...</p>
        </div>
      );
    }
    if (!currentLesson) return null;
    const color = getSubjectColor(currentLesson.subject_id);

    return (
      <div>
        <button onClick={() => setScreen(tab)} style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20, padding: 0
        }}>← Retour</button>

        <div style={{
          background: `linear-gradient(135deg, ${color}15, ${color}05)`,
          borderRadius: 12, padding: "24px", marginBottom: 24, border: `1px solid ${color}30`
        }}>
          <div style={{ fontSize: 12, color: color, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Unité {currentLesson.unit_number} · {currentLesson.theme}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>{currentLesson.title}</h1>
          <p style={{ fontSize: 14, color: "#4B5563", margin: "0 0 12px", lineHeight: 1.6 }}>{currentLesson.objective}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#6B7280" }}>
              <span>⏱ {currentLesson.duration}</span>
              <span>📚 {selectedLevel.name}</span>
            </div>
            <button onClick={enterProjector} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#0F4C35", color: "white", border: "none",
              borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s"
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1A7A56"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#0F4C35"; e.currentTarget.style.transform = "none"; }}
            >
              <span style={{ fontSize: 18 }}>📽</span> Mode Projecteur
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lessonSections.map((section, i) => {
            const isOpen = expandedSection === i;
            const accentColors = { intro: "#3B82F6", content: "#0F4C35", video: "#EF4444", activity: "#8B5CF6", exercise: "#F59E0B" };
            const accent = accentColors[section.section_type] || "#6B7280";
            const blocks = sectionBlocks[section.id] || [];

            return (
              <div key={i} style={{
                background: "white", borderRadius: 10,
                border: `1px solid ${isOpen ? accent + "40" : "#E5E7EB"}`, overflow: "hidden"
              }}>
                <div onClick={() => setExpandedSection(isOpen ? -1 : i)}
                  style={{
                    padding: "14px 18px", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: isOpen ? `${accent}08` : "transparent"
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{section.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>{section.title}</span>
                  </div>
                  <span style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "#9CA3AF", fontSize: 18 }}>▾</span>
                </div>
                {isOpen && (
                  <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${accent}15` }}>
                    {section.section_type === "exercise" ? (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                        {lessonExercises.map((ex, j) => (
                          <div key={j} style={{ background: "#FFFBEB", borderRadius: 10, padding: "14px 16px", border: "1px solid #FDE68A" }}>
                            <div style={{ fontSize: 12, color: "#D97706", fontWeight: 700, marginBottom: 6 }}>Exercice {j + 1}</div>
                            <div style={{ fontSize: 14, color: "#1F2937", lineHeight: 1.6 }}>{ex.question}</div>
                            {ex.exercise_type === "choice" && ex.options && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                                {(typeof ex.options === "string" ? JSON.parse(ex.options) : ex.options).map((opt, k) => (
                                  <div key={k} style={{ padding: "8px 12px", background: "white", borderRadius: 6, fontSize: 14, color: "#374151", border: "1px solid #E5E7EB" }}>
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
                          <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "20px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
                            Contenu à venir pour cette section.
                          </div>
                        ) : (
                          blocks.map((block, k) => {
                            if (block.block_type === "text") {
                              return (
                                <div key={k} style={{ fontSize: 15, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                                  {block.text_content}
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
                                      maxWidth: "100%", borderRadius: 10, display: "block",
                                      cursor: "pointer", transition: "transform 0.2s",
                                      boxShadow: "0 2px 12px rgba(0,0,0,0.08)"
                                    }}
                                    onClick={e => { e.currentTarget.style.transform = e.currentTarget.style.transform === "scale(1.5)" ? "none" : "scale(1.5)"; }}
                                  />
                                  {block.caption && (
                                    <figcaption style={{ fontSize: 13, color: "#6B7280", marginTop: 6, textAlign: "center" }}>
                                      {block.caption}
                                    </figcaption>
                                  )}
                                </figure>
                              );
                            }
                            if (block.block_type === "video" && block.media_url) {
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
                                    <div style={{ fontSize: 13, color: "#6B7280", marginTop: 6, textAlign: "center" }}>
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
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Readiness status + quiz */}
        <div style={{
          marginTop: 28, padding: "20px", borderRadius: 12,
          background: lessonPassed ? "#F0FDF4" : "#F5F3FF",
          border: `1px solid ${lessonPassed ? "#BBF7D0" : "#DDD6FE"}`
        }}>
          {lessonPassed ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 32 }}>✅</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#16A34A" }}>Préparation validée</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Vous avez réussi le quiz. Vous pouvez présenter cette leçon à vos élèves.</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 32 }}>📝</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#5B21B6" }}>Quiz de préparation</div>
                  <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                    Après avoir lu cette leçon, passez le quiz pour valider votre préparation avant la présentation aux élèves.
                  </div>
                </div>
              </div>
              <button onClick={() => setScreen("readiness")} style={{
                padding: "12px 24px", background: "#7C3AED", color: "white",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer"
              }}>Passer le quiz de préparation →</button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <button onClick={() => setScreen(tab)} style={{
            padding: "12px 20px", background: "white", border: "1px solid #D1D5DB",
            borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
          }}>← Retour</button>
        </div>
      </div>
    );
  };

  // ============ PROJECTOR VIEW ============
  const enterProjector = () => {
    setProjectorMode(true);
    try { document.documentElement.requestFullscreen?.(); } catch (_) {}
  };
  const exitProjector = () => {
    setProjectorMode(false);
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch (_) {}
  };

  // Close projector on ESC or when browser exits fullscreen
  useEffect(() => {
    if (!projectorMode) return;
    const onKey = (e) => { if (e.key === "Escape") exitProjector(); };
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

    // Auto-scale: measure total text and pick font size
    const allText = lessonSections.flatMap(s =>
      (sectionBlocks[s.id] || []).filter(b => b.block_type === "text").map(b => b.text_content || "")
    ).join("");
    const len = allText.length;
    const baseFontVw = len < 500 ? 2.8 : len < 1500 ? 2.2 : len < 4000 ? 1.7 : 1.4;
    const basePx = `max(18px, ${baseFontVw}vw)`;

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "white",
        overflow: "auto", fontFamily: "'Segoe UI', system-ui, sans-serif"
      }}>
        {/* Floating controls */}
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 10000,
          display: "flex", gap: 10
        }}>
          <button onClick={exitProjector} style={{
            background: "rgba(0,0,0,0.7)", color: "white", border: "none",
            borderRadius: 10, padding: "10px 20px", fontSize: 15, fontWeight: 700,
            cursor: "pointer", backdropFilter: "blur(8px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
          }}>✕ Quitter le projecteur</button>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 48px 80px" }}>
          {/* Lesson header */}
          <div style={{
            background: `linear-gradient(135deg, ${color}18, ${color}08)`,
            borderRadius: 20, padding: "48px 56px", marginBottom: 48,
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
            {lessonSections.filter(s => s.section_type !== "exercise").map((section, i) => {
              const accentColors = { intro: "#3B82F6", content: "#0F4C35", video: "#EF4444", activity: "#8B5CF6" };
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
                          return (
                            <div key={k} style={{
                              fontSize: basePx, color: "#1F2937",
                              lineHeight: 1.9, whiteSpace: "pre-wrap",
                              maxWidth: 1000
                            }}>
                              {block.text_content}
                            </div>
                          );
                        }
                        if (block.block_type === "image" && block.media_url) {
                          return (
                            <figure key={k} style={{
                              margin: "16px auto", textAlign: "center", maxWidth: "90%"
                            }}>
                              <img
                                src={block.media_url}
                                alt={block.alt_text || ""}
                                style={{
                                  maxWidth: "100%", maxHeight: "75vh",
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
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {projectorMode && <ProjectorView />}
      <Header />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
        {screen === "home" && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
                Bonjour, {teacher?.full_name || "Enseignant"} 👋
              </h1>
              <p style={{ color: "#6B7280", margin: 0, fontSize: 14 }}>
                {selectedLevel.name} — {selectedLevel.full}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div onClick={() => { setTab("calendar"); setScreen("calendar"); }}
                style={{
                  background: "white", borderRadius: 14, padding: "28px 24px",
                  border: "1px solid #E5E7EB", cursor: "pointer", transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#0F4C35"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: "linear-gradient(135deg, #0F4C35, #1A7A56)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28
                  }}>📅</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Emploi du temps</div>
                    <div style={{ fontSize: 14, color: "#6B7280", marginTop: 4, lineHeight: 1.5 }}>
                      Consultez vos cours du jour, heure par heure, avec les sujets à enseigner chaque semaine.
                    </div>
                  </div>
                  <span style={{ color: "#9CA3AF", fontSize: 22 }}>›</span>
                </div>
              </div>

              <div onClick={() => { setTab("programme"); setScreen("programme"); setProgrammeView("subjects"); }}
                style={{
                  background: "white", borderRadius: 14, padding: "28px 24px",
                  border: "1px solid #E5E7EB", cursor: "pointer", transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: "linear-gradient(135deg, #2563EB, #3B82F6)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28
                  }}>📚</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Programme scolaire</div>
                    <div style={{ fontSize: 14, color: "#6B7280", marginTop: 4, lineHeight: 1.5 }}>
                      Explorez toutes les disciplines, composantes, et la progression annuelle complète du curriculum.
                    </div>
                  </div>
                  <span style={{ color: "#9CA3AF", fontSize: 22 }}>›</span>
                </div>
              </div>

              <div onClick={() => { setScreen("admin"); }}
                style={{
                  background: "white", borderRadius: 14, padding: "28px 24px",
                  border: "1px solid #E5E7EB", cursor: "pointer", transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#F59E0B"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: "linear-gradient(135deg, #D97706, #F59E0B)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28
                  }}>⚙️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Gestion des leçons</div>
                    <div style={{ fontSize: 14, color: "#6B7280", marginTop: 4, lineHeight: 1.5 }}>
                      Créez, modifiez et supprimez le contenu pédagogique de la plateforme.
                    </div>
                  </div>
                  <span style={{ color: "#9CA3AF", fontSize: 22 }}>›</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {screen === "calendar" && <CalendarView />}
        {screen === "programme" && <ProgrammeView />}
        {screen === "readiness" && currentLesson && <ReadinessQuiz lesson={currentLesson} teacherId={teacher?.id} onPass={() => { setLessonPassed(true); setScreen("lesson"); }} onBack={() => setScreen("lesson")} />}
        {screen === "lesson" && <LessonScreen />}
        {screen === "admin" && <Admin onBack={() => { setScreen(tab); }} />}
      </div>
      {screen !== "lesson" && screen !== "home" && <BottomNav />}
    </div>
  );
}