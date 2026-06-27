"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Admin from "./admin";

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
    components: [
      { id: "langue-nationale", name: "Langue nationale" },
    ]
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

export default function Dashboard({ teacher, onLogout }) {
  const [selectedLevel, setSelectedLevel] = useState(
    LEVELS.find(l => l.id === teacher?.level) || LEVELS[2]
  );
  const [screen, setScreen] = useState("dashboard");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [expandedSection, setExpandedSection] = useState(0);

  // Database-loaded content
  const [availableLessons, setAvailableLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [lessonSections, setLessonSections] = useState([]);
  const [lessonExercises, setLessonExercises] = useState([]);
  const [loadingLesson, setLoadingLesson] = useState(false);

  // Fetch available lessons when component or level changes
  useEffect(() => {
    if (selectedComponent && selectedSubject) {
      fetchAvailableLessons();
    }
  }, [selectedComponent, selectedSubject, selectedLevel]);

  const fetchAvailableLessons = async () => {
    const { data } = await supabase
      .from("lessons")
      .select("id, unit_number, theme, title")
      .eq("subject_id", selectedSubject.id)
      .eq("component_id", selectedComponent.id)
      .eq("level", selectedLevel.id);
    setAvailableLessons(data || []);
  };

  const fetchLesson = async (lessonId) => {
    setLoadingLesson(true);

    const { data: lesson } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single();

    const { data: sections } = await supabase
      .from("lesson_sections")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("section_order");

    const { data: exercises } = await supabase
      .from("exercises")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("exercise_order");

    setCurrentLesson(lesson);
    setLessonSections(sections || []);
    setLessonExercises(exercises || []);
    setLoadingLesson(false);
    setExpandedSection(0);
  };

  const goTo = (newScreen, subject, component) => {
    setScreen(newScreen);
    if (subject !== undefined) setSelectedSubject(subject);
    if (component !== undefined) setSelectedComponent(component);
  };

  const openLesson = (lessonId) => {
    fetchLesson(lessonId);
    setScreen("lesson");
  };

  // ============ HEADER ============
  const Header = () => (
    <div style={{
      background: "#0F4C35",
      padding: "14px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "sticky",
      top: 0,
      zIndex: 10
    }}>
      <div
        onClick={() => goTo("dashboard", null, null)}
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
      >
        <span style={{ fontSize: 24 }}>📚</span>
        <span style={{ color: "white", fontSize: 20, fontWeight: 800 }}>EduCam</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <select
          value={selectedLevel.id}
          onChange={(e) => setSelectedLevel(LEVELS.find(l => l.id === e.target.value))}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            outline: "none"
          }}
        >
          {LEVELS.map(l => (
            <option key={l.id} value={l.id} style={{ color: "#1F2937" }}>
              {l.name} — {l.primary}
            </option>
          ))}
        </select>
        <button
          onClick={async () => {
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
            await supabase.auth.signOut();
            onLogout();
          }}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Déconnexion
        </button>
      </div>
    </div>
  );

  // ============ BREADCRUMB ============
  const Breadcrumb = () => {
    const crumbs = [{ label: "Tableau de bord", action: () => goTo("dashboard", null, null) }];
    if (selectedSubject) crumbs.push({ label: selectedSubject.name, action: () => goTo("subject", selectedSubject, null) });
    if (selectedComponent) crumbs.push({ label: selectedComponent.name, action: () => goTo("component", selectedSubject, selectedComponent) });
    if (screen === "lesson") crumbs.push({ label: currentLesson?.title || "Leçon", action: null });

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280", flexWrap: "wrap", marginBottom: 24 }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <span style={{ color: "#D1D5DB" }}>›</span>}
            {c.action ? (
              <span onClick={c.action} style={{ cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>{c.label}</span>
            ) : (
              <span style={{ color: "#0F4C35", fontWeight: 600 }}>{c.label}</span>
            )}
          </span>
        ))}
      </div>
    );
  };

  // ============ DASHBOARD SCREEN ============
  const DashboardScreen = () => (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
          Bonjour, {teacher?.full_name || "Enseignant"} 👋
        </h1>
        <p style={{ color: "#6B7280", margin: 0, fontSize: 15 }}>
          {selectedLevel.name} — {selectedLevel.full}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
        {[
          { n: "10", l: "Disciplines", c: "#3B82F6" },
          { n: "8", l: "Unités / discipline", c: "#10B981" },
          { n: "30h", l: "Volume hebdomadaire", c: "#8B5CF6" }
        ].map((s, i) => (
          <div key={i} style={{ background: "white", borderRadius: 12, padding: "20px", border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.c }}>{s.n}</div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div
        onClick={() => goTo("admin")}
        style={{
          background: "linear-gradient(135deg, #0F4C35, #1A7A56)",
          borderRadius: 12, padding: "18px 20px", marginBottom: 24,
          cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>+ Créer une nouvelle leçon</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
            Ajouter du contenu à la plateforme
          </div>
        </div>
        <span style={{ color: "white", fontSize: 22 }}>→</span>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#374151", marginBottom: 16 }}>Toutes les disciplines</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {SUBJECTS.map(subject => (
          <div
            key={subject.id}
            onClick={() => goTo("subject", subject, null)}
            style={{
              background: "white", borderRadius: 12, padding: "20px",
              border: "1px solid #E5E7EB", cursor: "pointer",
              transition: "all 0.2s", position: "relative", overflow: "hidden"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = subject.color;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "#E5E7EB";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: subject.color }} />
            <div style={{ fontSize: 32, marginBottom: 10 }}>{subject.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937", marginBottom: 6, lineHeight: 1.3 }}>{subject.name}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#9CA3AF" }}>{subject.components.length} composantes</span>
              <span style={{
                fontSize: 12, color: subject.color, fontWeight: 600,
                background: `${subject.color}15`, padding: "3px 10px", borderRadius: 20
              }}>{subject.hours}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============ SUBJECT SCREEN ============
  const SubjectScreen = () => {
    if (!selectedSubject) return null;
    const s = selectedSubject;
    return (
      <div>
        <Breadcrumb />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div style={{ fontSize: 48 }}>{s.icon}</div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>{s.name}</h1>
            <p style={{ color: "#6B7280", margin: "4px 0 0", fontSize: 14 }}>
              {selectedLevel.name} · {s.hours} · {s.components.length} composantes
            </p>
          </div>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 14 }}>Composantes</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {s.components.map(comp => (
            <div
              key={comp.id}
              onClick={() => goTo("component", s, comp)}
              style={{
                background: "white", borderRadius: 10, padding: "16px 18px",
                border: "1px solid #E5E7EB", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.background = `${s.color}08`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "white"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1F2937" }}>{comp.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "#9CA3AF" }}>8 leçons</span>
                <span style={{ color: "#9CA3AF" }}>›</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============ COMPONENT SCREEN ============
  const ComponentScreen = () => {
    if (!selectedComponent || !selectedSubject) return null;

    return (
      <div>
        <Breadcrumb />
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
            {selectedComponent.name}
          </h1>
          <p style={{ color: "#6B7280", margin: 0, fontSize: 14 }}>
            {selectedSubject.name} · {selectedLevel.name}
          </p>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 14 }}>
          Unités d'apprentissage
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {THEMES.map((theme, i) => {
            const lesson = availableLessons.find(l => l.unit_number === i + 1);
            const available = !!lesson;

            return (
              <div
                key={i}
                onClick={available ? () => openLesson(lesson.id) : undefined}
                style={{
                  background: "white", borderRadius: 10, padding: "16px 18px",
                  border: "1px solid #E5E7EB", cursor: available ? "pointer" : "default",
                  transition: "all 0.15s", opacity: available ? 1 : 0.55
                }}
                onMouseEnter={e => { if (available) { e.currentTarget.style.borderColor = selectedSubject.color; e.currentTarget.style.background = `${selectedSubject.color}08`; } }}
                onMouseLeave={e => { if (available) { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "white"; } }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: available ? selectedSubject.color : "#E5E7EB",
                      color: "white", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 14, fontWeight: 700
                    }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#1F2937" }}>
                        Unité {i + 1}: {theme}
                      </div>
                      <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                        {available ? lesson.title : "Contenu à venir"}
                      </div>
                    </div>
                  </div>
                  {available ? (
                    <span style={{
                      fontSize: 12, color: "#10B981", fontWeight: 600,
                      background: "#10B98115", padding: "4px 10px", borderRadius: 20
                    }}>Disponible</span>
                  ) : (
                    <span style={{
                      fontSize: 12, color: "#9CA3AF", fontWeight: 600,
                      background: "#F3F4F6", padding: "4px 10px", borderRadius: 20
                    }}>Bientôt</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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
    const color = selectedSubject?.color || "#3B82F6";

    return (
      <div>
        <Breadcrumb />

        {/* Lesson header */}
        <div style={{
          background: `linear-gradient(135deg, ${color}15, ${color}05)`,
          borderRadius: 12, padding: "24px",
          marginBottom: 24, border: `1px solid ${color}30`
        }}>
          <div style={{ fontSize: 12, color: color, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Unité {currentLesson.unit_number} · {currentLesson.theme}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
            {currentLesson.title}
          </h1>
          <p style={{ fontSize: 14, color: "#4B5563", margin: "0 0 12px", lineHeight: 1.6 }}>
            {currentLesson.objective}
          </p>
          <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#6B7280" }}>
            <span>⏱ {currentLesson.duration}</span>
            <span>📚 {selectedLevel?.name}</span>
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lessonSections.map((section, i) => {
            const isOpen = expandedSection === i;
            const accentColors = {
              intro: "#3B82F6", content: "#0F4C35", video: "#EF4444",
              activity: "#8B5CF6", exercise: "#F59E0B"
            };
            const accent = accentColors[section.section_type] || "#6B7280";
            const sectionExercises = lessonExercises.filter(() => section.section_type === "exercise");

            return (
              <div key={i} style={{
                background: "white", borderRadius: 10,
                border: `1px solid ${isOpen ? accent + "40" : "#E5E7EB"}`,
                overflow: "hidden", transition: "all 0.2s"
              }}>
                <div
                  onClick={() => setExpandedSection(isOpen ? -1 : i)}
                  style={{
                    padding: "14px 18px", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: isOpen ? `${accent}08` : "transparent"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{section.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>{section.title}</span>
                  </div>
                  <span style={{
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s", color: "#9CA3AF", fontSize: 18
                  }}>▾</span>
                </div>

                {isOpen && (
                  <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${accent}15` }}>
                    {section.section_type === "video" ? (
                      <div style={{
                        background: "#1F2937", borderRadius: 10, padding: "50px 20px",
                        textAlign: "center", marginTop: 14
                      }}>
                        <div style={{
                          width: 64, height: 64, borderRadius: "50%",
                          background: "rgba(255,255,255,0.2)", display: "inline-flex",
                          alignItems: "center", justifyContent: "center", fontSize: 28
                        }}>▶</div>
                        <div style={{ color: "white", fontSize: 15, fontWeight: 600, marginTop: 14 }}>
                          Vidéo: {section.title}
                        </div>
                        {section.video_url && (
                          <div style={{ color: "#9CA3AF", fontSize: 13, marginTop: 4 }}>
                            {section.video_url}
                          </div>
                        )}
                      </div>
                    ) : section.section_type === "exercise" ? (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                        {lessonExercises.map((ex, j) => (
                          <div key={j} style={{
                            background: "#FFFBEB", borderRadius: 10, padding: "14px 16px",
                            border: "1px solid #FDE68A"
                          }}>
                            <div style={{ fontSize: 12, color: "#D97706", fontWeight: 700, marginBottom: 6 }}>
                              Exercice {j + 1}
                            </div>
                            <div style={{ fontSize: 14, color: "#1F2937", lineHeight: 1.6 }}>{ex.question}</div>
                            {ex.exercise_type === "choice" && ex.options && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                                {(typeof ex.options === "string" ? JSON.parse(ex.options) : ex.options).map((opt, k) => (
                                  <div key={k} style={{
                                    padding: "8px 12px", background: "white", borderRadius: 6,
                                    fontSize: 14, color: "#374151", border: "1px solid #E5E7EB", cursor: "pointer"
                                  }}>
                                    {String.fromCharCode(65 + k)}. {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        marginTop: 14, fontSize: 15, color: "#374151",
                        lineHeight: 1.8, whiteSpace: "pre-wrap"
                      }}>
                        {section.content}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={() => goTo("component", selectedSubject, selectedComponent)}
            style={{
              padding: "12px 20px", background: "white", border: "1px solid #D1D5DB",
              borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
            }}
          >
            ← Retour aux unités
          </button>
        </div>
      </div>
    );
  };

  // ============ MAIN RENDER ============
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <Header />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 60px" }}>
        {screen === "dashboard" && <DashboardScreen />}
        {screen === "subject" && <SubjectScreen />}
        {screen === "component" && <ComponentScreen />}
        {screen === "lesson" && <LessonScreen />}
        {screen === "admin" && <Admin onBack={() => goTo("dashboard", null, null)} />}
      </div>
    </div>
  );
}