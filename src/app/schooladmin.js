"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// School-admin timetable editor. Rendered only when PROFILES_ENABLED and the
// logged-in user is a school_admin. Edits each class's (= teacher's) weekly
// timetable, scoped by school_id + owner_teacher_id.

const DAY_NAMES = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

const SUBJECTS = [
  { id: "francais", name: "Français et Littérature", components: [
    { id: "expression-orale", name: "Expression orale" }, { id: "production-ecrits", name: "Production d'écrits" },
    { id: "litterature", name: "Littérature" }, { id: "grammaire", name: "Grammaire" },
    { id: "vocabulaire", name: "Vocabulaire" }, { id: "orthographe", name: "Orthographe" }, { id: "conjugaison", name: "Conjugaison" } ] },
  { id: "maths", name: "Mathématiques", components: [
    { id: "nombres-calculs", name: "Nombres et calculs" }, { id: "mesures-grandeurs", name: "Mesures et grandeurs" },
    { id: "geometrie", name: "Géométrie et espace" }, { id: "statistiques", name: "Statistiques" } ] },
  { id: "sciences", name: "Sciences et Technologies", components: [
    { id: "sciences-vie", name: "Sciences de la vie" }, { id: "sciences-physiques", name: "Sciences physiques et chimiques" },
    { id: "technologies", name: "Technologies" }, { id: "sciences-terre", name: "Sciences de la terre" },
    { id: "agropastoral", name: "Sciences agropastorales et piscicoles" }, { id: "environnement", name: "Éducation environnementale" } ] },
  { id: "english", name: "English Language", components: [
    { id: "listening", name: "Listening and Speaking" }, { id: "reading", name: "Reading" },
    { id: "writing", name: "Writing" }, { id: "grammar", name: "Grammar and Vocabulary" } ] },
  { id: "shs", name: "Sciences humaines et sociales", components: [
    { id: "morale", name: "Éducation morale" }, { id: "droits", name: "Droits et devoirs de l'enfant" },
    { id: "paix", name: "Éducation à la paix et à la sécurité" }, { id: "citoyennete", name: "Éducation à la citoyenneté" },
    { id: "regles-reglements", name: "Règles et règlements" }, { id: "histoire", name: "Histoire" },
    { id: "geographie-physique", name: "Géographie physique" }, { id: "geographie-humaine", name: "Géographie humaine" },
    { id: "geographie-economique", name: "Géographie économique" } ] },
  { id: "tic", name: "TIC", components: [
    { id: "env-info", name: "Environnements informatiques" }, { id: "production-tic", name: "Production avec les outils TIC" },
    { id: "internet", name: "Internet et communication" }, { id: "sante-securite-ethique", name: "Santé, sécurité et éthique" },
    { id: "programmation", name: "Notions de programmation" } ] },
  { id: "langues", name: "Langues et cultures nationales", components: [{ id: "langue-nationale", name: "Langue nationale" }] },
  { id: "arts", name: "Éducation artistique", components: [
    { id: "arts-visuels", name: "Arts visuels" }, { id: "musique", name: "Musique" },
    { id: "arts-dramatiques", name: "Arts dramatiques" }, { id: "danse", name: "Danse" } ] },
  { id: "eps", name: "Éducation physique et sportive", components: [
    { id: "athletisme", name: "Activités athlétiques" }, { id: "sports-co", name: "Sports collectifs" }, { id: "autodefense", name: "Autodéfense" } ] },
  { id: "devperso", name: "Développement personnel", components: [
    { id: "artisanat", name: "Artisanat et constructions artistiques" }, { id: "agropastoral-dp", name: "Activités agropastorales" }, { id: "domestique", name: "Activités domestiques et familiales" } ] },
];

const subjectById = (id) => SUBJECTS.find((s) => s.id === id);
const componentName = (subjId, compId) => (subjectById(subjId)?.components.find((c) => c.id === compId)?.name || "");

function randomPasscode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const input = { padding: "8px 10px", border: "1.5px solid #D1D5DB", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", background: "white" };

export default function SchoolAdmin({ school, onBack }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [slots, setSlots] = useState([]);
  const [classLabel, setClassLabel] = useState("");
  const [passcode, setPasscode] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { loadClasses(); /* eslint-disable-next-line */ }, [school?.id]);

  const loadClasses = async () => {
    setLoading(true);
    const { data } = await supabase.from("teachers")
      .select("id, full_name, level, class_label, parent_passcode, role")
      .eq("school_id", school.id).order("full_name");
    setClasses((data || []).filter((t) => t.role !== "admin"));
    setLoading(false);
  };

  const mapSlots = (rows) => (rows || []).map((s) => ({
    day_of_week: s.day_of_week, start_time: s.start_time || "", end_time: s.end_time || "",
    subject_id: s.subject_id, component_id: s.component_id,
  }));

  const openClass = async (t) => {
    setSelected(t); setClassLabel(t.class_label || ""); setPasscode(t.parent_passcode || ""); setMsg("");
    const { data } = await supabase.from("timetable_slots").select("*")
      .eq("owner_teacher_id", t.id).order("day_of_week").order("slot_order");
    setSlots(mapSlots(data));
  };

  const adoptStandard = async () => {
    if (!selected) return;
    const { data } = await supabase.from("timetable_slots").select("*")
      .eq("level", selected.level).is("owner_teacher_id", null).order("day_of_week").order("slot_order");
    setSlots(mapSlots(data));
    setMsg((data && data.length) ? "Emploi du temps standard chargé — ajustez puis enregistrez." : "Aucun emploi du temps standard pour ce niveau.");
  };

  const addSlot = (day) => {
    const first = SUBJECTS[0];
    setSlots((prev) => [...prev, { day_of_week: day, start_time: "", end_time: "", subject_id: first.id, component_id: first.components[0].id }]);
  };
  const updateSlot = (idx, field, value) => {
    setSlots((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      if (field === "subject_id") return { ...s, subject_id: value, component_id: subjectById(value)?.components[0]?.id || "" };
      return { ...s, [field]: value };
    }));
  };
  const removeSlot = (idx) => setSlots((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!selected) return;
    setSaving(true); setMsg("");
    try {
      await supabase.from("teachers").update({
        class_label: classLabel.trim() || null,
        parent_passcode: passcode.trim() || null,
      }).eq("id", selected.id);

      await supabase.from("timetable_slots").delete().eq("owner_teacher_id", selected.id);
      const byDay = {};
      const rows = slots.map((s) => {
        const order = (byDay[s.day_of_week] = (byDay[s.day_of_week] || 0) + 1);
        return {
          level: selected.level, day_of_week: s.day_of_week, slot_order: order,
          start_time: s.start_time || null, end_time: s.end_time || null,
          subject_id: s.subject_id, component_id: s.component_id,
          subject_name: subjectById(s.subject_id)?.name || null,
          component_name: componentName(s.subject_id, s.component_id) || null,
          school_id: school.id, owner_teacher_id: selected.id,
        };
      });
      if (rows.length) await supabase.from("timetable_slots").insert(rows);
      await loadClasses();
      setMsg("Enregistré ✓");
    } catch (_) {
      setMsg("Erreur lors de l'enregistrement.");
    }
    setSaving(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "#0F4C35", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 22 }}>🏫</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "white", fontSize: 17, fontWeight: 800 }}>Gestion de l'école</div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{school?.name} · code staff : {school?.staff_code || "—"}</div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px 80px" }}>
        <button onClick={() => (selected ? setSelected(null) : onBack())} style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16, padding: 0
        }}>← {selected ? "Retour aux classes" : "Retour"}</button>

        {!selected ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Classes de l'école</h1>
            <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 20 }}>Chaque enseignant a sa classe. Choisissez une classe pour gérer son emploi du temps et le code parents.</p>
            {loading ? (
              <p style={{ color: "#6B7280" }}>Chargement…</p>
            ) : classes.length === 0 ? (
              <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: "24px", textAlign: "center", color: "#6B7280" }}>
                Aucun enseignant n'a encore rejoint cette école. Partagez le code staff <b>{school?.staff_code}</b> pour qu'ils s'inscrivent.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {classes.map((t) => (
                  <div key={t.id} onClick={() => openClass(t)} style={{
                    background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: "14px 16px",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>{t.full_name || "Enseignant"}</div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>
                        {(t.class_label || t.level?.toUpperCase() || "Classe")}{t.parent_passcode ? ` · code parents : ${t.parent_passcode}` : " · pas de code parents"}
                      </div>
                    </div>
                    <span style={{ color: "#9CA3AF", fontSize: 20 }}>›</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 2 }}>{selected.full_name || "Enseignant"}</h1>
            <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 16 }}>Niveau : {selected.level?.toUpperCase() || "—"}</p>

            {/* Class settings */}
            <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Nom de la classe</label>
                  <input value={classLabel} onChange={(e) => setClassLabel(e.target.value)} placeholder="Ex : CM1 A" style={{ ...input, width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Code parents</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={passcode} onChange={(e) => setPasscode(e.target.value.toUpperCase())} placeholder="Code" style={{ ...input, flex: 1 }} />
                    <button onClick={() => setPasscode(randomPasscode())} style={{ ...input, cursor: "pointer", fontWeight: 700, color: "#0F4C35", whiteSpace: "nowrap" }}>Générer</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Timetable editor */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Emploi du temps</h2>
              <button onClick={adoptStandard} style={{ ...input, cursor: "pointer", fontWeight: 700, color: "#0F4C35" }}>Charger l'emploi du temps standard</button>
            </div>

            {[1, 2, 3, 4, 5].map((day) => {
              const daySlots = slots.map((s, i) => ({ ...s, __i: i })).filter((s) => s.day_of_week === day);
              return (
                <div key={day} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0F4C35", marginBottom: 10 }}>{DAY_NAMES[day]}</div>
                  {daySlots.length === 0 && <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 8 }}>Aucun créneau.</div>}
                  {daySlots.map((s) => {
                    const subj = subjectById(s.subject_id);
                    return (
                      <div key={s.__i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                        <input type="time" value={s.start_time || ""} onChange={(e) => updateSlot(s.__i, "start_time", e.target.value)} style={{ ...input, width: 110 }} />
                        <input type="time" value={s.end_time || ""} onChange={(e) => updateSlot(s.__i, "end_time", e.target.value)} style={{ ...input, width: 110 }} />
                        <select value={s.subject_id} onChange={(e) => updateSlot(s.__i, "subject_id", e.target.value)} style={{ ...input, flex: "1 1 160px", cursor: "pointer" }}>
                          {SUBJECTS.map((su) => <option key={su.id} value={su.id}>{su.name}</option>)}
                        </select>
                        <select value={s.component_id} onChange={(e) => updateSlot(s.__i, "component_id", e.target.value)} style={{ ...input, flex: "1 1 160px", cursor: "pointer" }}>
                          {(subj?.components || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={() => removeSlot(s.__i)} title="Supprimer" style={{ ...input, cursor: "pointer", color: "#DC2626", fontWeight: 700, width: 40, textAlign: "center" }}>✕</button>
                      </div>
                    );
                  })}
                  <button onClick={() => addSlot(day)} style={{ background: "none", border: "1px dashed #86EFAC", color: "#0F4C35", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>+ Ajouter un créneau</button>
                </div>
              );
            })}

            {msg && <div style={{ fontSize: 13, color: msg.includes("Erreur") ? "#DC2626" : "#16A34A", margin: "8px 0", fontWeight: 600 }}>{msg}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={save} disabled={saving} style={{
                padding: "12px 24px", background: saving ? "#6B7280" : "#0F4C35", color: "white",
                border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer"
              }}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
              <button onClick={() => setSelected(null)} style={{
                padding: "12px 20px", background: "white", border: "1px solid #D1D5DB", borderRadius: 10,
                fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
              }}>Retour aux classes</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
