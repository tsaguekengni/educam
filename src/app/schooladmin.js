"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { ConfirmDialog } from "../components/overlays";
import { Button, Card, CardLabel, ListRow, IconButton, EmptyState, SkeletonRows } from "../components/ui";
import { Field } from "../components/forms";
import { COLORS, FONT } from "../lib/theme";
import { notifyParentWhatsApp } from "../lib/whatsapp";

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

// Pauses éditables dans l'emploi du temps (non curriculaires → créneaux non cliquables).
const BREAK_TYPES = [
  { subject_id: "pause", component_id: "recreation", name: "Récréation", comp: "" },
  { subject_id: "pause", component_id: "dejeuner", name: "Pause déjeuner", comp: "" },
  { subject_id: "etude", component_id: "devoirs", name: "Étude surveillée", comp: "Devoirs" },
];
const isBreak = (sid) => sid === "pause" || sid === "etude";
const breakType = (sid, cid) => BREAK_TYPES.find((b) => b.subject_id === sid && b.component_id === cid);
const slotTypeValue = (s) => (isBreak(s.subject_id) ? `brk:${s.subject_id}:${s.component_id}` : `subj:${s.subject_id}`);

function randomPasscode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Per-child parent code — longer (8 chars) since each is unique and secret.
function randomCode(len = 8) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const input = { padding: "8px 10px", border: "1.5px solid #D1D5DB", borderRadius: 8, fontSize: "var(--ec-fs-3)", outline: "none", boxSizing: "border-box", background: "white" };
const toneColor = (p) => (p == null ? "#9CA3AF" : p < 50 ? "#DC2626" : p < 70 ? "#D97706" : "#16A34A");

export default function SchoolAdmin({ school, onBack }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [slots, setSlots] = useState([]);
  const [classLabel, setClassLabel] = useState("");
  const [passcode, setPasscode] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { t, tone: "ok" | "err" } — plus de classification par chaîne
  // Students of the selected class + parent-code issuance.
  const [students, setStudents] = useState([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [stuSaving, setStuSaving] = useState(false);
  const [stuQuery, setStuQuery] = useState(""); // recherche dans la liste d'élèves
  // School dashboard + director's observations.
  const [view, setView] = useState("dashboard"); // "dashboard" | "classes"
  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [obs, setObs] = useState([]);
  const [obsText, setObsText] = useState("");
  const [obsSaving, setObsSaving] = useState(false);
  // Messaging a student's parent.
  const [allStudents, setAllStudents] = useState([]);
  const [composeFor, setComposeFor] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeLink, setComposeLink] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeMsg, setComposeMsg] = useState("");

  useEffect(() => { loadClasses(); /* eslint-disable-next-line */ }, [school?.id]);
  useEffect(() => { if (!selected && view === "dashboard" && classes.length >= 0) loadDashboard(); /* eslint-disable-next-line */ }, [view, selected, classes.length, school?.id]);

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
    setSelected(t); setClassLabel(t.class_label || ""); setPasscode(t.parent_passcode || ""); setMsg(null);
    setNewName(""); setNewEmail(""); setNewPhone(""); setStudents([]);
    const { data } = await supabase.from("timetable_slots").select("*")
      .eq("owner_teacher_id", t.id).order("day_of_week").order("slot_order");
    setSlots(mapSlots(data));
    loadStudents(t.id);
  };

  const loadStudents = async (teacherId) => {
    const { data } = await supabase.from("students")
      .select("id, full_name, access_code, parent_email, parent_phone, created_at")
      .eq("teacher_id", teacherId).order("full_name");
    setStudents(data || []);
  };

  // Insert a student with a unique parent code (retry on the rare code collision).
  const addStudent = async () => {
    if (!selected || !newName.trim()) return;
    setStuSaving(true); setMsg(null);
    let ok = false;
    for (let attempt = 0; attempt < 4 && !ok; attempt++) {
      const { error } = await supabase.from("students").insert({
        school_id: school.id, teacher_id: selected.id,
        full_name: newName.trim(), access_code: randomCode(),
        parent_email: newEmail.trim() || null,
        parent_phone: newPhone.trim() || null,
      });
      if (!error) ok = true;
      else if (error.code !== "23505") break; // not a uniqueness clash → stop retrying
    }
    if (ok) { setNewName(""); setNewEmail(""); setNewPhone(""); await loadStudents(selected.id); }
    else setMsg({ t: "Erreur lors de l'ajout de l'élève.", tone: "err" });
    setStuSaving(false);
  };

  const removeStudent = async (id) => {
    await supabase.from("students").delete().eq("id", id);
    await loadStudents(selected.id);
  };

  const regenerateCode = async (id) => {
    setStuSaving(true);
    let ok = false;
    for (let attempt = 0; attempt < 4 && !ok; attempt++) {
      const { error } = await supabase.from("students").update({ access_code: randomCode() }).eq("id", id);
      if (!error) ok = true;
      else if (error.code !== "23505") break;
    }
    await loadStudents(selected.id);
    setStuSaving(false);
  };

  const copyText = (t) => { try { navigator.clipboard?.writeText(t); } catch (_) {} };
  const copyAllCodes = () => {
    const lines = students
      .map((s) => `${s.full_name} — ${s.access_code}${s.parent_email ? " (" + s.parent_email + ")" : ""}`)
      .join("\n");
    copyText(lines);
    setMsg({ t: "Codes copiés", tone: "ok" });
  };

  const adoptStandard = async () => {
    if (!selected) return;
    const { data } = await supabase.from("timetable_slots").select("*")
      .eq("level", selected.level).is("owner_teacher_id", null).order("day_of_week").order("slot_order");
    setSlots(mapSlots(data));
    setMsg((data && data.length) ? { t: "Emploi du temps standard chargé — ajustez puis enregistrez.", tone: "ok" } : { t: "Aucun emploi du temps standard pour ce niveau.", tone: "err" });
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
  const setSlotType = (idx, value) => {
    setSlots((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      if (value.startsWith("brk:")) {
        const [, sid, cid] = value.split(":");
        return { ...s, subject_id: sid, component_id: cid };
      }
      const sid = value.slice(5); // après "subj:"
      return { ...s, subject_id: sid, component_id: subjectById(sid)?.components[0]?.id || "" };
    }));
  };
  const removeSlot = (idx) => setSlots((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!selected) return;
    setSaving(true); setMsg(null);
    try {
      await supabase.from("teachers").update({
        class_label: classLabel.trim() || null,
        parent_passcode: passcode.trim() || null,
      }).eq("id", selected.id);

      await supabase.from("timetable_slots").delete().eq("owner_teacher_id", selected.id);
      const byDay = {};
      const rows = slots.map((s) => {
        const order = (byDay[s.day_of_week] = (byDay[s.day_of_week] || 0) + 1);
        const brk = breakType(s.subject_id, s.component_id);
        return {
          level: selected.level, day_of_week: s.day_of_week, slot_order: order,
          start_time: s.start_time || null, end_time: s.end_time || null,
          subject_id: s.subject_id, component_id: s.component_id,
          subject_name: brk ? brk.name : (subjectById(s.subject_id)?.name || null),
          component_name: brk ? brk.comp : (componentName(s.subject_id, s.component_id) || null),
          school_id: school.id, owner_teacher_id: selected.id,
        };
      });
      if (rows.length) await supabase.from("timetable_slots").insert(rows);
      await loadClasses();
      setMsg({ t: "Enregistré", tone: "ok" });
    } catch (_) {
      setMsg({ t: "Erreur lors de l'enregistrement.", tone: "err" });
    }
    setSaving(false);
  };

  const loadDashboard = async () => {
    setDashLoading(true);
    const teacherIds = classes.map((c) => c.id);
    const [{ data: studs }, { data: results }, taughtRes, { data: observations }] = await Promise.all([
      supabase.from("students").select("id, full_name, teacher_id").eq("school_id", school.id),
      supabase.from("daily_results").select("student_id, teacher_id, score, total, difficulty").eq("school_id", school.id),
      teacherIds.length
        ? supabase.from("lessons_taught").select("teacher_id, lesson_id").in("teacher_id", teacherIds)
        : Promise.resolve({ data: [] }),
      supabase.from("school_observations").select("*").eq("school_id", school.id).order("created_at", { ascending: false }),
    ]);
    const taught = taughtRes?.data || [];

    const perStu = {};
    (results || []).forEach((r) => {
      const a = (perStu[r.student_id] = perStu[r.student_id] || { n: 0, sumPct: 0, diff: 0 });
      a.n += 1;
      if (r.total > 0 && r.score != null) a.sumPct += Math.round((r.score / r.total) * 100);
      if (r.difficulty) a.diff += 1;
    });
    const taughtByT = {};
    taught.forEach((r) => { taughtByT[r.teacher_id] = (taughtByT[r.teacher_id] || 0) + 1; });

    const studList = (studs || []).map((s) => {
      const a = perStu[s.id] || { n: 0, sumPct: 0, diff: 0 };
      return { ...s, checks: a.n, avg: a.n ? Math.round(a.sumPct / a.n) : null, diff: a.diff };
    });
    const nameById = Object.fromEntries(classes.map((c) => [c.id, c.class_label || c.full_name || "Classe"]));
    const classCards = classes.map((c) => {
      const cs = studList.filter((s) => s.teacher_id === c.id);
      const withAvg = cs.filter((s) => s.avg != null);
      const classAvg = withAvg.length ? Math.round(withAvg.reduce((x, s) => x + s.avg, 0) / withAvg.length) : null;
      const strugglers = cs.filter((s) => s.diff > 0 || (s.avg != null && s.avg < 50)).length;
      return { id: c.id, name: nameById[c.id], students: cs.length, avg: classAvg, strugglers, taught: taughtByT[c.id] || 0 };
    });
    const allWithAvg = studList.filter((s) => s.avg != null);
    const schoolAvg = allWithAvg.length ? Math.round(allWithAvg.reduce((x, s) => x + s.avg, 0) / allWithAvg.length) : null;
    const attention = studList
      .filter((s) => s.diff > 0 || (s.avg != null && s.avg < 50))
      .map((s) => ({ ...s, className: nameById[s.teacher_id] || "" }))
      .sort((a, b) => (a.avg ?? 999) - (b.avg ?? 999));

    setDash({ classes: classes.length, students: studList.length, avg: schoolAvg, inDifficulty: attention.length, classCards, attention });
    setAllStudents(studList.map((s) => ({ id: s.id, full_name: s.full_name, className: nameById[s.teacher_id] || "" })));
    setObs(observations || []);
    setDashLoading(false);
  };

  const sendMessage = async () => {
    if (!composeFor || !composeSubject.trim() || !composeBody.trim()) return;
    setComposeSending(true); setComposeMsg("");
    // Address the message to the STUDENT. Whoever is linked as that child's
    // parent will receive it. We resolve a parent id if one exists (for the
    // recipient_id convenience field), but we never hard-block on it —
    // messaging is keyed by student_id, so it works even before the parent
    // has created their account (they'll see it once they link the code).
    const { data: p } = await supabase.from("parents").select("id").eq("student_id", composeFor).limit(1);
    const parentId = p && p.length ? p[0].id : null;
    const { data: u } = await supabase.auth.getUser();
    const { data: ins, error } = await supabase.from("messages").insert({
      school_id: school.id, sender_id: u?.user?.id || null, audience: "parent",
      recipient_id: parentId, student_id: composeFor,
      subject: composeSubject.trim(), body: composeBody.trim(), link_url: composeLink.trim() || null,
    }).select("id").single();
    if (error) setComposeMsg("Erreur lors de l'envoi.");
    else {
      // Best-effort WhatsApp nudge to the parent (no-op unless configured + flag on).
      notifyParentWhatsApp({ studentId: composeFor, messageId: ins?.id, kind: "message" });
      setComposeMsg(parentId ? "Message envoyé ✓" : "Message enregistré ✓ — le parent le verra dès son inscription.");
      setComposeSubject(""); setComposeBody(""); setComposeLink("");
    }
    setComposeSending(false);
  };

  const addObservation = async () => {
    if (!obsText.trim()) return;
    setObsSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("school_observations").insert({
      school_id: school.id, author_id: u?.user?.id || null, body: obsText.trim(),
    });
    if (!error) {
      setObsText("");
      const { data } = await supabase.from("school_observations").select("*").eq("school_id", school.id).order("created_at", { ascending: false });
      setObs(data || []);
    }
    setObsSaving(false);
  };

  /* ------------------------------------------------------------------
     Confirmations de suppression.
     Retirer un élève effaçait ses résultats et son historique sans le
     moindre avertissement, sur un bouton de 34 px. La confirmation NOMME
     désormais ce qui va disparaître.
     ------------------------------------------------------------------ */
  const [confirm, setConfirm] = useState(null); // { kind, id, label, extra } | null
  const [confirmBusy, setConfirmBusy] = useState(false);

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      if (confirm.kind === "student") {
        const { error } = await supabase.from("students").delete().eq("id", confirm.id);
        if (error) throw error;
        await loadStudents(selected.id);
      } else if (confirm.kind === "observation") {
        const { error } = await supabase.from("school_observations").delete().eq("id", confirm.id);
        if (error) throw error;
        setObs((prev) => prev.filter((o) => o.id !== confirm.id));
      } else if (confirm.kind === "slot") {
        setSlots((prev) => prev.filter((_, i) => i !== confirm.id));
      }
      setConfirm(null);
    } catch (_) {
      setMsg({ t: "Erreur : la suppression a échoué.", tone: "err" });
      setConfirm(null);
    }
    setConfirmBusy(false);
  };

  const deleteObservation = async (id) => {
    await supabase.from("school_observations").delete().eq("id", id);
    setObs((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="ec-app">
      <div className="ec-main">
        <button
          onClick={() => (selected ? setSelected(null) : onBack())}
          className="ec-link"
          style={{ minHeight: 40, marginBottom: 14, textDecoration: "none", color: COLORS.ink2 }}
        >
          ‹ {selected ? "Retour aux classes" : "Retour"}
        </button>

        <h1 className="ec-h1">Gestion de l'école</h1>
        <p className="ec-sub">{school?.name}</p>

        {!selected ? (
          <div className="ec-grid" style={{ marginTop: 18 }}>

            {/* Carte d'invitation : le code passe d'un texte cliquable à une
                vraie action. Un <code> n'est pas un élément interactif. */}
            <Card className="ec-c5" style={{ background: COLORS.g50, borderColor: COLORS.g200 }}>
              <div className="ec-cardhd"><h2 className="ec-cardtitle">Inviter les enseignants</h2></div>
              <p style={{ fontSize: FONT.sm, color: COLORS.g800, lineHeight: 1.5, marginBottom: 11 }}>
                Communiquez ce code à vos enseignants : il relie leur compte à l'école
                et installe automatiquement leur emploi du temps.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{
                  flex: "1 1 160px", background: "#fff", border: `1px solid ${COLORS.g200}`,
                  borderRadius: 9, padding: "12px 14px", fontSize: FONT.base, fontWeight: 800,
                  letterSpacing: ".08em", textAlign: "center", fontFamily: "ui-monospace, monospace",
                }}>
                  {school?.staff_code || "—"}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => { copyText(school?.staff_code || ""); setMsg({ t: "Code école copié", tone: "ok" }); }}
                  disabled={!school?.staff_code}
                >
                  Copier le code
                </Button>
              </div>
            </Card>

            {/* Classes — chaque ligne est un vrai bouton, navigable au clavier */}
            <Card className="ec-c7">
              <div className="ec-cardhd">
                <h2 className="ec-cardtitle">Classes de l'école</h2>
                <span className="ec-more" style={{ color: COLORS.ink3, fontWeight: 600 }}>
                  {classes.length} classe{classes.length > 1 ? "s" : ""}
                </span>
              </div>
              <p style={{ color: COLORS.ink3, fontSize: FONT.sm, marginBottom: 14, lineHeight: 1.5 }}>
                Chaque enseignant a sa classe. Choisissez-en une pour gérer son emploi du
                temps, ses élèves et les codes parents.
              </p>
              {loading ? (
                <SkeletonRows rows={3} />
              ) : classes.length === 0 ? (
                <EmptyState icon="🧑‍🏫" title="Aucun enseignant n'a rejoint l'école">
                  Partagez le code <strong>{school?.staff_code}</strong> pour qu'ils s'inscrivent.
                </EmptyState>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {classes.map((t) => (
                    <ListRow
                      key={t.id}
                      icon={(t.class_label || t.level || "?").slice(0, 3).toUpperCase()}
                      title={t.full_name || "Enseignant"}
                      meta={`${t.class_label || t.level?.toUpperCase() || "Classe"}${t.parent_passcode ? ` · code parents : ${t.parent_passcode}` : " · pas de code parents"}`}
                      onClick={() => openClass(t)}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="ec-grid" style={{ marginTop: 18 }}>

            <div className="ec-c12">
              <h2 style={{ fontSize: FONT.lg, fontWeight: 800, letterSpacing: "-.02em" }}>
                {selected.full_name || "Enseignant"}
              </h2>
              <p style={{ color: COLORS.ink3, fontSize: FONT.sm, marginTop: 2 }}>
                Niveau : {selected.level?.toUpperCase() || "—"}
              </p>
            </div>

            {/* Réglages de la classe */}
            <Card className="ec-c4">
              <div className="ec-cardhd"><h2 className="ec-cardtitle">Réglages</h2></div>
              <Field
                label="Nom de la classe"
                value={classLabel}
                onChange={(e) => setClassLabel(e.target.value)}
                placeholder="Ex : CM1 A"
              />
              <div style={{ marginTop: 12 }}>
                <label htmlFor="ec-passcode" style={{
                  display: "block", fontSize: FONT.sm, fontWeight: 650, color: COLORS.ink2, marginBottom: 5,
                }}>
                  Code parents
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    id="ec-passcode"
                    className="ec-input"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                    placeholder="Code"
                    style={{ flex: 1 }}
                  />
                  <Button variant="ghost" onClick={() => setPasscode(randomPasscode())}>Générer</Button>
                </div>
                <p style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 7, lineHeight: 1.45 }}>
                  Ce code permet aux parents de rattacher leur compte à cette classe.
                </p>
              </div>
            </Card>

            {/* Élèves & codes parents */}
            <Card className="ec-c8" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "18px 18px 0" }}>
                <div className="ec-cardhd">
                  <h2 className="ec-cardtitle">Élèves &amp; codes parents</h2>
                  <span className="ec-more" style={{ color: COLORS.ink3, fontWeight: 600 }}>
                    {students.length} élève{students.length > 1 ? "s" : ""}
                  </span>
                </div>
                <p style={{ fontSize: FONT.sm, color: COLORS.ink3, marginBottom: 12, lineHeight: 1.5 }}>
                  Un code parent unique est généré pour chaque élève — transmettez-le au
                  parent pour qu'il suive uniquement son enfant.
                </p>

                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <input className="ec-input" value={newName} onChange={(e) => setNewName(e.target.value)}
                    aria-label="Nom de l'élève" placeholder="Nom de l'élève" style={{ flex: "2 1 150px" }} />
                  <input className="ec-input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    aria-label="E-mail du parent (optionnel)" placeholder="E-mail du parent (optionnel)" style={{ flex: "2 1 150px" }} />
                  <input className="ec-input" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                    aria-label="Téléphone WhatsApp du parent (optionnel)" placeholder="Tél. WhatsApp (+237…)" style={{ flex: "2 1 150px" }} />
                  <Button onClick={addStudent} disabled={stuSaving || !newName.trim()}>+ Ajouter</Button>
                </div>

                {students.length > 8 && (
                  <div style={{ marginBottom: 12 }}>
                    <label htmlFor="ec-stu-search" className="ec-sr">Rechercher un élève</label>
                    <input id="ec-stu-search" className="ec-input" type="search"
                      placeholder="Rechercher un élève, un code…"
                      value={stuQuery} onChange={(e) => setStuQuery(e.target.value)} />
                  </div>
                )}
              </div>

              {students.length === 0 ? (
                <div style={{ padding: "0 18px 18px" }}>
                  <EmptyState icon="👥" title="Aucun élève enregistré">
                    Ajoutez vos élèves ci-dessus ; leur code parent sera généré automatiquement.
                  </EmptyState>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="ec-table">
                    <thead>
                      <tr>
                        <th scope="col">Élève</th>
                        <th scope="col">Parent</th>
                        <th scope="col">Code parent</th>
                        <th scope="col"><span className="ec-sr">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .filter((s) => {
                          const q = stuQuery.trim().toLowerCase();
                          if (!q) return true;
                          return (s.full_name || "").toLowerCase().includes(q)
                            || (s.access_code || "").toLowerCase().includes(q)
                            || (s.parent_email || "").toLowerCase().includes(q)
                            || (s.parent_phone || "").toLowerCase().includes(q);
                        })
                        .map((s) => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 650 }}>{s.full_name}</td>
                            <td style={{ color: COLORS.ink3 }}>{[s.parent_email, s.parent_phone].filter(Boolean).join(" · ") || "—"}</td>
                            <td>
                              {/* Un <code> n'est pas interactif : c'est un vrai bouton. */}
                              <button
                                onClick={() => { copyText(s.access_code); setMsg({ t: `Code de ${s.full_name} copié`, tone: "ok" }); }}
                                aria-label={`Copier le code parent de ${s.full_name}`}
                                style={{
                                  fontFamily: "ui-monospace, monospace", fontSize: FONT.md, fontWeight: 700,
                                  color: COLORS.g700, background: COLORS.g50,
                                  border: `1px solid ${COLORS.g200}`, borderRadius: 7,
                                  padding: "6px 11px", letterSpacing: 1, minHeight: 36,
                                }}
                              >
                                {s.access_code}
                              </button>
                            </td>
                            <td>
                              <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <IconButton label={`Régénérer le code de ${s.full_name}`}
                                  onClick={() => regenerateCode(s.id)} disabled={stuSaving}>↻</IconButton>
                                <IconButton label={`Retirer ${s.full_name} de la classe`}
                                  onClick={() => setConfirm({ kind: "student", id: s.id, label: s.full_name })}>
                                  <span style={{ color: COLORS.crit, fontWeight: 700 }}>✕</span>
                                </IconButton>
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {students.length > 0 && (
                <div style={{ padding: "12px 18px 18px" }}>
                  <Button variant="ghost" size="sm" onClick={copyAllCodes}>Copier tous les codes</Button>
                </div>
              )}
            </Card>

            {/* Emploi du temps */}
            <Card className="ec-c12">
              <div className="ec-cardhd">
                <h2 className="ec-cardtitle">Emploi du temps</h2>
                <button className="ec-more ec-link" style={{ textDecoration: "none" }} onClick={adoptStandard}>
                  Charger l'emploi du temps standard
                </button>
              </div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                {[1, 2, 3, 4, 5].map((day) => {
                  const daySlots = slots.map((s, i) => ({ ...s, __i: i })).filter((s) => s.day_of_week === day);
                  return (
                    <div key={day} style={{
                      border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12,
                      background: COLORS.panel,
                    }}>
                      <div style={{
                        fontSize: FONT.xs, fontWeight: 750, letterSpacing: ".09em",
                        textTransform: "uppercase", color: COLORS.g700, marginBottom: 10,
                      }}>
                        {DAY_NAMES[day]}
                      </div>
                      {daySlots.length === 0 && (
                        <div style={{ fontSize: FONT.sm, color: COLORS.ink3, marginBottom: 8 }}>Aucun créneau.</div>
                      )}
                      {daySlots.map((s) => {
                        const subj = subjectById(s.subject_id);
                        return (
                          <div key={s.__i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                            <input type="time" className="ec-input" aria-label="Heure de début"
                              value={s.start_time || ""} onChange={(e) => updateSlot(s.__i, "start_time", e.target.value)}
                              style={{ width: 108 }} />
                            <input type="time" className="ec-input" aria-label="Heure de fin"
                              value={s.end_time || ""} onChange={(e) => updateSlot(s.__i, "end_time", e.target.value)}
                              style={{ width: 108 }} />
                            <select className="ec-input" aria-label="Type de créneau" value={slotTypeValue(s)}
                              onChange={(e) => setSlotType(s.__i, e.target.value)}
                              style={{ flex: "1 1 150px", cursor: "pointer" }}>
                              <optgroup label="Matières">
                                {SUBJECTS.map((su) => <option key={su.id} value={`subj:${su.id}`}>{su.name}</option>)}
                              </optgroup>
                              <optgroup label="Pauses">
                                {BREAK_TYPES.map((b) => (
                                  <option key={`${b.subject_id}:${b.component_id}`} value={`brk:${b.subject_id}:${b.component_id}`}>{b.name}</option>
                                ))}
                              </optgroup>
                            </select>
                            {!isBreak(s.subject_id) && (
                              <select className="ec-input" aria-label="Composante" value={s.component_id}
                                onChange={(e) => updateSlot(s.__i, "component_id", e.target.value)}
                                style={{ flex: "1 1 150px", cursor: "pointer" }}>
                                {(subj?.components || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            )}
                            <IconButton
                              label="Supprimer ce créneau"
                              onClick={() => setConfirm({ kind: "slot", id: s.__i, label: `${s.subject_name || "ce créneau"}${s.start_time ? " · " + String(s.start_time).slice(0, 5) : ""}` })}
                            >
                              <span style={{ color: COLORS.crit, fontWeight: 700 }}>✕</span>
                            </IconButton>
                          </div>
                        );
                      })}
                      <Button variant="ghost" size="sm" onClick={() => addSlot(day)} style={{ marginTop: 4 }}>
                        + Ajouter un créneau
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Barre d'enregistrement */}
            <div className="ec-c12">
              {msg && (
                <div role="status" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontSize: FONT.md, fontWeight: 650, marginBottom: 10,
                  padding: "9px 12px", borderRadius: 9,
                  background: msg.tone === "err" ? COLORS.critBg : COLORS.g50,
                  color: msg.tone === "err" ? COLORS.crit : COLORS.g700,
                }}>
                  <span aria-hidden="true">{msg.tone === "err" ? "!" : "✓"}</span>{msg.t}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
                <Button variant="ghost" onClick={() => setSelected(null)}>Retour aux classes</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* La confirmation NOMME l'élève et énonce la conséquence réelle. */}
      <ConfirmDialog
        open={!!confirm}
        destructive
        busy={confirmBusy}
        title={
          confirm?.kind === "student" ? `Retirer ${confirm.label} ?`
          : confirm?.kind === "observation" ? "Supprimer cette observation ?"
          : "Supprimer ce créneau ?"
        }
        confirmLabel={
          confirm?.kind === "student" ? "Retirer l'élève"
          : "Supprimer"
        }
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      >
        {confirm?.kind === "student" && (
          <>Ses résultats et son historique seront <strong>définitivement supprimés</strong>,
          et son code d'accès parent cessera de fonctionner. Cette action est irréversible.</>
        )}
        {confirm?.kind === "observation" && (
          <>Cette observation sera définitivement supprimée du dossier de l'école.</>
        )}
        {confirm?.kind === "slot" && (
          <>Le créneau <strong>{confirm.label}</strong> sera retiré de l'emploi du temps.
          La suppression ne prend effet qu'après l'enregistrement de l'emploi du temps.</>
        )}
      </ConfirmDialog>
    </div>
  );
}
