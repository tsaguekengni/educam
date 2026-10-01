"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { cachedQueryMeta, freshnessLabel } from "../lib/offline";
import { ConfirmDialog } from "../components/overlays";
import { Button, Card, CardLabel, ListRow, IconButton, EmptyState, SkeletonRows } from "../components/ui";
import { Field } from "../components/forms";
import { COLORS, FONT } from "../lib/theme";
import { notifyParentWhatsApp } from "../lib/whatsapp";
// Un numéro mal saisi ne produit AUCUNE erreur : Meta refuse l'envoi en silence
// et le parent ne reçoit jamais rien. D'où la normalisation à l'écriture et le
// badge « à vérifier » sur les valeurs existantes non envoyables.
import { normalizePhone, formatPhone, isSendablePhone } from "../lib/phone";

// School-admin timetable editor. Rendered only when PROFILES_ENABLED and the
// logged-in user is a school_admin. Edits each class's (= teacher's) weekly
// timetable, scoped by school_id + owner_teacher_id.
//
// ─── HORS LIGNE (décision Maxime, 2026-09-29) ────────────────────────────────
// Le directeur et le référent travaillent sur le même réseau que les
// enseignants, donc ils subissent les mêmes coupures. Cet écran se scinde en
// deux :
//
//   · LECTURE  — classes, élèves, codes parents, emploi du temps, tableau de
//     bord : tout est mis en cache et reste consultable sans réseau, avec la
//     date de la dernière lecture affichée en tête.
//
//   · ÉCRITURE — ajouter ou retirer un élève, régénérer un code, enregistrer un
//     emploi du temps : REFUSÉ hors ligne, franchement, avant d'être tenté.
//
// Pourquoi ne pas les mettre en file d'attente comme les notes des enseignants ?
// Parce qu'une note a une clé naturelle — (élève, leçon, date) — donc la
// rejouer est sans danger et « la saisie de l'enseignant gagne » a un sens. Un
// changement d'inscription ou de rôle n'a pas cette clé : rejoué trois jours
// plus tard, il écraserait en silence ce qui s'est passé entre-temps, sans que
// personne puisse dire quelle version était voulue. Mieux vaut un bouton qui
// dit non qu'une modification qui part de travers.

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
  // Ajoutés le 2026-10-01 avec l'emploi du temps de l'enseignante. Ces types
  // existaient DÉJÀ en base (chargés dans CM1-A le même jour) mais pas ici :
  // un « Enregistrer » depuis cet écran aurait remis leur libellé à null, et
  // la journée aurait affiché des créneaux sans nom. Qui ajoute un type de
  // créneau côté enseignante l'ajoute ICI dans le même lot.
  { subject_id: "pause", component_id: "programme", name: "Programme de l'école", comp: "" },
  { subject_id: "pause", component_id: "english", name: "English (enseignant extérieur)", comp: "" },
  { subject_id: "pause", component_id: "tic", name: "TIC", comp: "" },
  { subject_id: "pause", component_id: "evaluation", name: "Évaluation", comp: "" },
  { subject_id: "pause", component_id: "revision", name: "Révision", comp: "" },
  { subject_id: "etude", component_id: "devoirs", name: "Étude surveillée", comp: "Devoirs" },
];
const isBreak = (sid) => sid === "pause" || sid === "etude";
const breakType = (sid, cid) => BREAK_TYPES.find((b) => b.subject_id === sid && b.component_id === cid);
const slotTypeValue = (s) => (isBreak(s.subject_id) ? `brk:${s.subject_id}:${s.component_id}` : `subj:${s.subject_id}`);

// ⚠️ LE « CODE PARENTS » DE CLASSE A ÉTÉ RETIRÉ (2026-09-29, décision de Maxime).
//
// Il restait de la conception d'origine, où un seul code servait toute une
// classe. L'inscription d'un parent valide en réalité `students.access_code`,
// le code INDIVIDUEL de l'enfant (voir `page.js` → `educam_find_student_by_code`).
// Le code de classe n'était donc plus lu par personne — mais il s'affichait
// encore ici, sous le libellé « code parents », juste au-dessus du texte qui
// explique correctement le code par élève. Un directeur pouvait le distribuer à
// toute une classe de bonne foi : aucun parent n'aurait pu s'inscrire, et la
// plateforme aurait eu l'air cassée.
//
// La colonne `teachers.parent_passcode` est LAISSÉE EN BASE : la retirer est une
// opération destructive qui demande un oui explicite, et elle ne coûte rien.
// La fonction SQL `educam_find_teacher_by_passcode()` existe aussi encore et
// n'est appelée par personne — même raisonnement.

// Per-child parent code — longer (8 chars) since each is unique and secret.
function randomCode(len = 8) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const input = { padding: "8px 10px", border: "1.5px solid #D1D5DB", borderRadius: 8, fontSize: "var(--ec-fs-3)", outline: "none", boxSizing: "border-box", background: "white" };
const toneColor = (p) => (p == null ? "#9CA3AF" : p < 50 ? "#DC2626" : p < 70 ? "#D97706" : "#16A34A");

// ─── QUI PEUT CRÉER (décision Maxime, 2026-09-29) ────────────────────────────
// Cet écran est PARTAGÉ : le directeur/référent y arrive par « Ma classe /
// Direction », et Maxime (super-administrateur) par « Écoles ». Pendant le
// pilote, c'est Maxime qui crée les écoles, les enseignants et les élèves ;
// l'école prend la main progressivement.
//
// D'où la propriété `asAdmin` :
//   · asAdmin = true  → chemin « Écoles » de Maxime : tout est ouvert.
//   · asAdmin = false → directeur et référent : ils VOIENT tout (élèves, codes
//     parents, emploi du temps, tableau de bord) et gardent l'emploi du temps
//     et les codes, mais ne peuvent plus AJOUTER ni RETIRER un élève, ni
//     renommer la classe, ni lire les coordonnées d'un parent.
//
// ⚠️ La valeur par défaut est `false` — volontairement. Si un jour un nouvel
// endroit monte cet écran sans passer la propriété, le défaut ferme les
// commandes au lieu de les ouvrir à tout le monde par distraction.
//
// ─── COORDONNÉES DES PARENTS : LE VERROU EST EN BASE, PAS ICI ────────────────
// Masquer la colonne à l'écran ne protégeait rien : la sécurité niveau ligne de
// Supabase filtre les LIGNES, jamais les COLONNES — la ligne élève arrivait donc
// dans le navigateur avec le numéro dedans, lisible dans les outils de
// développement. Par n'importe quel ENSEIGNANT de l'école, d'ailleurs, pas
// seulement par la direction : la politique de lecture des élèves porte sur
// l'école entière, sans condition de rôle.
//
// Le verrou réel est donc posé en base, avec les DROITS PAR COLONNE de
// PostgreSQL : le rôle `authenticated` — toute session navigateur, Maxime
// compris — n'a plus le droit de lire ni d'écrire `parent_phone` et
// `parent_email`. Conséquences à connaître avant de toucher à ce fichier :
//
//   · les DEMANDER ferait échouer la requête ENTIÈRE (erreur 42501) ;
//   · `has_parent_contact` (colonne calculée par Postgres) dit s'il y a un
//     contact, jamais lequel — c'est ce que lit la liste ;
//   · les VALEURS passent par `educam_student_contacts()` en lecture et
//     `educam_set_student_contact()` en écriture, qui vérifient le rôle EN
//     BASE. `asAdmin` ne fait plus que choisir l'affichage : même trafiqué
//     dans le navigateur, il ne rend aucune coordonnée lisible ;
//   · les fonctions Edge (WhatsApp) tournent avec la clé de service, un rôle
//     DIFFÉRENT, qui garde ses droits — elles n'ont pas été touchées.
//
// Détail, ordre de déploiement et pièges : `claude/EduCam_Confidentialite_Coordonnees_Parents.md`.
export default function SchoolAdmin({ school, onBack, asAdmin = false }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [slots, setSlots] = useState([]);
  const [classLabel, setClassLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { t, tone: "ok" | "err" } — plus de classification par chaîne
  // Students of the selected class + parent-code issuance.
  const [students, setStudents] = useState([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  // { [student_id]: { parent_phone, parent_phone_2, parent_email } } — rempli
  // seulement pour Maxime, et seulement en ligne. Vide pour la direction,
  // toujours. Deux numéros depuis le 2026-10-01 : le père et la mère.
  const [contacts, setContacts] = useState({});
  // Correction d'un contact : quel élève est en cours d'édition, et les valeurs
  // saisies. `null` = personne.
  const [editId, setEditId] = useState(null);
  const [editPhone, setEditPhone] = useState("");
  // Deuxième numéro : chaque enfant a le père ET la mère (demande de Maxime,
  // 2026-10-01). Les deux reçoivent les messages le concernant.
  const [editPhone2, setEditPhone2] = useState("");
  const [editEmail, setEditEmail] = useState("");
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

  // ---- Hors ligne ----
  // `online` est un ÉTAT (et pas seulement `navigator.onLine` lu au vol) parce
  // qu'il faut réafficher les boutons au moment où le réseau revient.
  const [online, setOnline] = useState(true);
  const [staleAt, setStaleAt] = useState(null);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Un seul garde-fou pour toutes les écritures : il refuse et il DIT pourquoi.
  // Renvoie true quand l'action doit s'arrêter là.
  const blockedOffline = () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setMsg({ t: "Modification impossible hors connexion — reconnectez-vous pour enregistrer.", tone: "err" });
      return true;
    }
    return false;
  };

  useEffect(() => { loadClasses(); /* eslint-disable-next-line */ }, [school?.id]);
  useEffect(() => { if (!selected && view === "dashboard" && classes.length >= 0) loadDashboard(); /* eslint-disable-next-line */ }, [view, selected, classes.length, school?.id]);

  const loadClasses = async () => {
    setLoading(true);
    const meta = await cachedQueryMeta(`schooladmin_classes_${school.id}`, () =>
      supabase.from("teachers")
        .select("id, full_name, level, class_label, role")
        .eq("school_id", school.id).order("full_name")
    );
    // Classes = actual teachers. Exclude the technician (admin) and the school's
    // director/referent accounts — they are staff, not a class/timetable.
    setClasses((meta.data || []).filter((t) => t.role !== "admin" && t.role !== "school_admin" && t.role !== "referent"));
    setStaleAt(meta.fresh ? null : meta.cachedAt);
    setLoading(false);
  };

  const mapSlots = (rows) => (rows || []).map((s) => ({
    day_of_week: s.day_of_week, start_time: s.start_time || "", end_time: s.end_time || "",
    subject_id: s.subject_id, component_id: s.component_id,
  }));

  const openClass = async (t) => {
    setSelected(t); setClassLabel(t.class_label || ""); setMsg(null);
    setNewName(""); setNewEmail(""); setNewPhone(""); setStudents([]);
    const { data } = await cachedQueryMeta(`schooladmin_slots_${t.id}`, () =>
      supabase.from("timetable_slots").select("*")
        .eq("owner_teacher_id", t.id).order("day_of_week").order("slot_order")
    );
    setSlots(mapSlots(data));
    loadStudents(t.id);
  };

  const loadStudents = async (teacherId) => {
    // Mis en cache par CLASSE : c'est la liste que le directeur vient relire
    // quand il cherche le code parent d'un élève, coupure ou pas.
    //
    // ⚠️ `parent_phone` et `parent_email` NE SONT PLUS SÉLECTIONNÉS — et ce
    // n'est pas un choix d'affichage. Le droit de lire ces deux colonnes a été
    // retiré au rôle `authenticated` en base : les demander ferait échouer la
    // requête ENTIÈRE (erreur 42501), donc la liste d'élèves serait vide.
    // À la place, `has_parent_contact` : une colonne calculée par Postgres qui
    // dit s'il y a un contact, jamais lequel. Voir
    // `claude/EduCam_Confidentialite_Coordonnees_Parents.md`.
    // ⚠️ Clé en `_v2` : la requête demande maintenant `matricule`. **Une entrée
    // de cache change de NOM quand sa FORME change** — sinon une entrée d'avant
    // serait resservie sans le nouveau champ, et la colonne resterait vide sans
    // la moindre erreur. Règle payée comptant le 2026-09-30.
    const { data } = await cachedQueryMeta(`schooladmin_students_v2_${teacherId}`, () =>
      supabase.from("students")
        .select("id, full_name, matricule, access_code, has_parent_contact, created_at")
        .eq("teacher_id", teacherId).order("full_name")
    );
    setStudents(data || []);
    loadContacts(teacherId);
  };

  // Les VALEURS des coordonnées, pour Maxime seulement, par une fonction qui
  // vérifie le rôle en base (`educam_student_contacts`). Un appelant non
  // administrateur reçoit une liste vide — ce n'est pas l'écran qui décide.
  //
  // ⚠️ DÉLIBÉRÉMENT PAS MIS EN CACHE hors ligne, contrairement au reste de cet
  // écran. Mettre des numéros de parents dans l'IndexedDB d'un portable de
  // classe reviendrait à les ressortir par la porte qu'on vient de fermer.
  // Sans réseau, même Maxime voit le témoin et pas la valeur — c'est voulu.
  const loadContacts = async (teacherId) => {
    if (!asAdmin || !online) { setContacts({}); return; }
    const { data, error } = await supabase.rpc("educam_student_contacts", { p_teacher: teacherId });
    if (error) { setContacts({}); return; }
    const map = {};
    (data || []).forEach((r) => { map[r.student_id] = r; });
    setContacts(map);
  };

  // Insert a student with a unique parent code (retry on the rare code collision).
  const addStudent = async () => {
    if (!selected || !newName.trim()) return;
    if (blockedOffline()) return;
    setStuSaving(true); setMsg(null);
    // DEUX TEMPS, et c'est imposé par la base : le rôle `authenticated` n'a
    // plus le droit d'écrire `parent_phone`/`parent_email` directement. On crée
    // donc l'élève d'abord, puis on pose la coordonnée par la fonction
    // `educam_set_student_contact`, qui vérifie le rôle en base.
    let ok = false;
    let newId = null;
    for (let attempt = 0; attempt < 4 && !ok; attempt++) {
      const { data, error } = await supabase.from("students").insert({
        school_id: school.id, teacher_id: selected.id,
        full_name: newName.trim(), access_code: randomCode(),
      }).select("id").maybeSingle();
      if (!error) { ok = true; newId = data?.id || null; }
      else if (error.code !== "23505") break; // not a uniqueness clash → stop retrying
    }

    // Si la deuxième étape échoue, l'élève EXISTE mais sans coordonnée. On le
    // dit franchement : le témoin affichera « contact manquant », donc la
    // situation est visible et se répare en réenregistrant la coordonnée —
    // bien mieux qu'un élève créé en silence avec un numéro perdu.
    let contactOk = true;
    let contactMsg = null;
    const rawPhone = newPhone.trim();
    // Même règle qu'à la correction : on normalise, et on REFUSE ce qu'on ne
    // sait pas conclure plutôt que d'enregistrer un numéro qui n'arrivera
    // jamais. L'élève est créé quand même — c'est la coordonnée qui manque, et
    // le témoin le dira.
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    if (rawPhone && !phone) { contactOk = false; contactMsg = "Élève créé, mais le numéro n'a pas été reconnu — corrigez-le avec le crayon ✎."; }
    const wantsContact = newEmail.trim() || phone;
    if (ok && newId && contactOk && wantsContact) {
      const { error: cErr } = await supabase.rpc("educam_set_student_contact", {
        p_student: newId, p_phone: phone, p_email: newEmail.trim() || null,
      });
      if (cErr) contactOk = false;
    }

    if (ok) {
      setNewName(""); setNewEmail(""); setNewPhone("");
      await loadStudents(selected.id);
      if (!contactOk) {
        setMsg({ t: contactMsg || "Élève créé, mais la coordonnée du parent n'a pas pu être enregistrée. Corrigez-la avec le crayon ✎ sur sa ligne.", tone: "err" });
      }
    } else setMsg({ t: "Erreur lors de l'ajout de l'élève.", tone: "err" });
    setStuSaving(false);
  };

  // Corriger la coordonnée d'un parent — Maxime seulement, et c'est la BASE qui
  // le vérifie (`educam_set_student_contact` lève `not_admin` sinon).
  //
  // ⚠️ On REFUSE un numéro qu'on ne sait pas normaliser, plutôt que de
  // l'enregistrer tel quel. Un numéro mal formé ne produit aucune erreur
  // visible : Meta refuse l'envoi en silence et le parent ne reçoit jamais
  // rien. Mieux vaut un refus franc ici qu'un parent qu'on croit joignable.
  // Laisser le champ VIDE efface la coordonnée — c'est volontaire et utile.
  const saveContact = async (id) => {
    if (blockedOffline()) return;

    // Les DEUX numéros passent par la même vérification : un numéro mal formé
    // du père est aussi silencieux qu'un numéro mal formé de la mère.
    const check = (raw, quel) => {
      const t = (raw || "").trim();
      if (!t) return { ok: true, value: null };
      const n = normalizePhone(t);
      if (!n) return { ok: false, quel };
      return { ok: true, value: n };
    };
    const c1 = check(editPhone, "premier");
    const c2 = check(editPhone2, "deuxième");
    const bad = !c1.ok ? c1 : (!c2.ok ? c2 : null);
    if (bad) {
      setMsg({ t: `Le ${bad.quel} numéro n'est pas reconnu. Attendu : 690 00 00 00, +237690000000, ou 00237…`, tone: "err" });
      return;
    }

    setStuSaving(true);
    // La BASE tient deux règles qu'on ne refait pas ici : un seul numéro fourni
    // atterrit toujours dans le premier emplacement (sinon le témoin
    // `has_parent_contact` deviendrait faux), et deux numéros identiques sont
    // ramenés à un seul (sinon le parent recevrait deux fois le même message).
    const { error } = await supabase.rpc("educam_set_student_contact", {
      p_student: id, p_phone: c1.value, p_phone2: c2.value, p_email: editEmail.trim() || null,
    });
    if (error) {
      setMsg({ t: "La coordonnée n'a pas pu être enregistrée.", tone: "err" });
    } else {
      setEditId(null);
      const n = [c1.value, c2.value].filter(Boolean).length;
      setMsg({
        t: n === 0 ? "Coordonnées effacées."
          : n === 1 ? `Coordonnée enregistrée : ${formatPhone(c1.value || c2.value)}`
            : "Deux numéros enregistrés — les deux parents recevront les messages.",
        tone: "ok",
      });
      // On recharge la LISTE aussi : `has_parent_contact` est calculé en base,
      // donc le témoin de la direction ne bouge qu'après relecture.
      await loadStudents(selected.id);
    }
    setStuSaving(false);
  };

  const removeStudent = async (id) => {
    if (blockedOffline()) return;
    await supabase.from("students").delete().eq("id", id);
    await loadStudents(selected.id);
  };

  const regenerateCode = async (id) => {
    if (blockedOffline()) return;
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
    // L'e-mail du parent ne sort PLUS de cet export (décision Maxime, 2026-09-29).
    // Il servait à savoir qui contacter ; c'était aussi le moyen le plus simple de
    // faire sortir toutes les coordonnées de la plateforme d'un seul clic, pour
    // n'importe qui ayant accès à cet écran. L'export ne porte plus que ce qu'il
    // doit porter : le nom de l'élève et son code parent.
    // Le matricule est repris ici : c'est par lui que l'école retrouve l'élève
    // sur ses propres listes, donc l'export se rapproche de son registre. Le
    // code parent reste la seule chose secrète de la ligne.
    const lines = students
      .map((s) => `${s.full_name}${s.matricule ? " (" + s.matricule + ")" : ""} — ${s.access_code}`)
      .join("\n");
    copyText(lines);
    setMsg({ t: "Codes copiés", tone: "ok" });
  };

  const adoptStandard = async () => {
    if (!selected) return;
    // Lecture seule : charge le modèle dans l'écran, n'écrit rien. Donc mis en
    // cache comme le reste — c'est « Enregistrer » qui exige le réseau.
    const { data } = await cachedQueryMeta(`schooladmin_standard_${selected.level}`, () =>
      supabase.from("timetable_slots").select("*")
        .eq("level", selected.level).is("owner_teacher_id", null).order("day_of_week").order("slot_order")
    );
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
    // ⚠️ Cet enregistrement SUPPRIME puis réinsère tous les créneaux de la
    // classe. Rejoué après plusieurs jours hors ligne, il effacerait un emploi
    // du temps modifié entre-temps. Il exige donc le réseau, sans exception.
    if (blockedOffline()) return;
    setSaving(true); setMsg(null);
    try {
      await supabase.from("teachers").update({
        class_label: classLabel.trim() || null,
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
    // Quatre lectures, UNE entrée de cache : sans cela la première qui échoue
    // vide tout le panneau, exactement le défaut corrigé sur le tableau de bord
    // de l'école. On garde les LIGNES BRUTES, les agrégats se recalculent ici.
    const meta = await cachedQueryMeta(`schooladmin_dash_${school.id}`, async () => {
      const [{ data: studs }, { data: results }, taughtRes, { data: observations }] = await Promise.all([
        supabase.from("students").select("id, full_name, teacher_id").eq("school_id", school.id),
        supabase.from("daily_results").select("student_id, teacher_id, score, total, difficulty").eq("school_id", school.id),
        teacherIds.length
          ? supabase.from("lessons_taught").select("teacher_id, lesson_id").in("teacher_id", teacherIds)
          : Promise.resolve({ data: [] }),
        supabase.from("school_observations").select("*").eq("school_id", school.id).order("created_at", { ascending: false }),
      ]);
      return { data: {
        studs: studs || [], results: results || [],
        taught: taughtRes?.data || [], observations: observations || [],
      } };
    }, { timeoutMs: 12000 });

    const studs = meta.data?.studs || [];
    const results = meta.data?.results || [];
    const taught = meta.data?.taught || [];
    const observations = meta.data?.observations || [];
    if (meta.data) setStaleAt(meta.fresh ? null : meta.cachedAt);

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
    // Ce compositeur n'est plus branché à l'écran (la messagerie du directeur
    // vit dans « Messages », qui sait déjà mettre en file d'attente). Le garde
    // reste pour qu'un rebranchement futur ne parte pas en silence hors ligne.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setComposeMsg("Envoi impossible hors connexion — utilisez l'écran « Messages ».");
      return;
    }
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
    // Les observations ont été explicitement exclues des écritures hors ligne
    // dès la conception (Maxime, 2026-09-12) : ce sont des appréciations, pas
    // des relevés, et rien ne permet de les dédoublonner à la reconnexion.
    if (blockedOffline()) return;
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
    // Un créneau retiré n'existe que dans l'écran tant qu'on n'a pas enregistré :
    // celui-là reste permis hors ligne, c'est « Enregistrer » qui bloquera.
    // Les deux autres suppriment en base — refusées sans réseau.
    if (confirm.kind !== "slot" && blockedOffline()) { setConfirm(null); return; }
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
    if (blockedOffline()) return;
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

        {/* Hors ligne : on annonce les DEUX choses en une fois — ce qu'on peut
            encore consulter, et ce qui attendra le réseau. Un écran qui se
            contente de désactiver des boutons laisse chercher pourquoi. */}
        {!online && (
          <div role="status" style={{
            background: COLORS.warnBg, color: COLORS.warn, borderRadius: 10,
            padding: "10px 12px", fontSize: FONT.sm, marginTop: 14, fontWeight: 600, lineHeight: 1.5,
          }}>
            Hors connexion — consultation seule.
            {staleAt ? ` Données au ${freshnessLabel(staleAt)}.` : ""}
            {" "}Ajouts, suppressions, codes et emplois du temps reprendront dès le retour du réseau.
          </div>
        )}

        {online && staleAt && (
          <div role="status" style={{
            background: COLORS.warnBg, color: COLORS.warn, borderRadius: 10,
            padding: "9px 12px", fontSize: FONT.sm, marginTop: 14, fontWeight: 600,
          }}>
            Données au {freshnessLabel(staleAt)} — dernière lecture réussie.
          </div>
        )}

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
                // Une liste vide ne veut pas dire la même chose selon qu'on ait
                // pu la lire ou non : hors ligne et sans cache, « aucun
                // enseignant » serait un mensonge.
                !online ? (
                  <EmptyState icon="📶" title="Liste jamais consultée hors connexion">
                    Ouvrez cet écran une fois connecté : il restera ensuite lisible sans réseau.
                  </EmptyState>
                ) : (
                  <EmptyState icon="🧑‍🏫" title="Aucun enseignant n'a rejoint l'école">
                    Partagez le code <strong>{school?.staff_code}</strong> pour qu'ils s'inscrivent.
                  </EmptyState>
                )
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {classes.map((t) => (
                    <ListRow
                      key={t.id}
                      icon={(t.class_label || t.level || "?").slice(0, 3).toUpperCase()}
                      title={t.full_name || "Enseignant"}
                      meta={t.class_label || t.level?.toUpperCase() || "Classe"}
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

            {/* Réglages de la classe — Maxime seulement (voir `asAdmin` en tête).
                La carte entière disparaît côté direction : elle ne contenait plus
                que le nom de la classe.
                ⚠️ `classLabel` reste chargé par `openClass`, donc « Enregistrer »
                réécrit la même valeur — l'emploi du temps s'enregistre normalement. */}
            {asAdmin && (
              <Card className="ec-c4">
                <div className="ec-cardhd"><h2 className="ec-cardtitle">Réglages</h2></div>
                <Field
                  label="Nom de la classe"
                  value={classLabel}
                  onChange={(e) => setClassLabel(e.target.value)}
                  placeholder="Ex : CM1 A"
                />
                {/* Le « Code parents » de classe vivait ici. Retiré le 2026-09-29 :
                    chaque élève a son propre code, généré plus bas dans
                    « Élèves & codes parents ». Voir la note en tête du fichier. */}
              </Card>
            )}

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

                {/* Ajout d'un élève — Maxime seulement (voir `asAdmin` en tête). */}
                {asAdmin && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <input className="ec-input" value={newName} onChange={(e) => setNewName(e.target.value)}
                      aria-label="Nom de l'élève" placeholder="Nom de l'élève" style={{ flex: "2 1 150px" }} />
                    <input className="ec-input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      aria-label="E-mail du parent (optionnel)" placeholder="E-mail du parent (optionnel)" style={{ flex: "2 1 150px" }} />
                    <input className="ec-input" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                      aria-label="Téléphone WhatsApp du parent (optionnel)" placeholder="Tél. WhatsApp (+237…)" style={{ flex: "2 1 150px" }} />
                    <Button onClick={addStudent} disabled={stuSaving || !newName.trim() || !online}>+ Ajouter</Button>
                  </div>
                )}

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
                  {!online ? (
                    <EmptyState icon="📶" title="Élèves jamais consultés hors connexion">
                      Ouvrez cette classe une fois connecté : la liste et les codes parents resteront ensuite lisibles sans réseau.
                    </EmptyState>
                  ) : (
                    <EmptyState icon="👥" title="Aucun élève enregistré">
                      {asAdmin
                        ? "Ajoutez vos élèves ci-dessus ; leur code parent sera généré automatiquement."
                        : "Les élèves de cette classe sont enregistrés par l'administrateur EduCam. Leur code parent apparaîtra ici dès qu'ils seront inscrits."}
                    </EmptyState>
                  )}
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
                          // Chercher par coordonnée est réservé à Maxime : sinon taper
                          // un numéro et voir quel élève ressort rendrait le contact
                          // lisible alors qu'il est masqué dans la colonne. Et la
                          // direction n'a de toute façon plus les valeurs : `contacts`
                          // est vide pour elle.
                          // Le matricule est cherchable par tout le monde : c'est
                          // l'identifiant que l'école a déjà sur ses listes papier,
                          // donc c'est souvent par lui qu'on arrive. Séparateurs
                          // ignorés — l'école mêle tirets et tirets bas.
                          const flat = (x) => (x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                          const qFlat = flat(q);
                          const byName = (s.full_name || "").toLowerCase().includes(q)
                            || (s.access_code || "").toLowerCase().includes(q)
                            || (qFlat !== "" && flat(s.matricule).includes(qFlat));
                          if (!asAdmin) return byName;
                          const c = contacts[s.id] || {};
                          // Les DEUX numéros sont cherchables : retrouver un élève
                          // à partir du numéro de sa mère doit marcher aussi bien
                          // qu'à partir de celui de son père.
                          return byName
                            || (c.parent_email || "").toLowerCase().includes(q)
                            || (c.parent_phone || "").toLowerCase().includes(q)
                            || (c.parent_phone_2 || "").toLowerCase().includes(q);
                        })
                        .map((s) => (
                          <tr key={s.id}>
                            {/* Le matricule de l'école sous le nom. Il ne sert PAS
                                de code d'accès (décision de Maxime, 2026-09-30 :
                                les matricules se suivent, le code parent doit rester
                                indevinable) — mais c'est l'identifiant que l'école
                                emploie dans ses registres, et il tranche entre deux
                                homonymes mieux que n'importe quoi. */}
                            <td style={{ fontWeight: 650 }}>
                              {s.full_name}
                              {s.matricule && (
                                <span style={{
                                  display: "block", fontSize: FONT.sm, fontWeight: 400,
                                  color: COLORS.ink3, fontFamily: "ui-monospace, monospace", marginTop: 2,
                                }}>
                                  {s.matricule}
                                </span>
                              )}
                            </td>
                            {/* Coordonnées du parent : valeurs pour Maxime, simple
                                témoin pour la direction (décision Maxime, 2026-09-29 :
                                l'école sait SI le contact existe, jamais lequel).
                                Les valeurs viennent de `contacts`, rempli par une
                                fonction qui vérifie le rôle EN BASE — plus de la ligne
                                élève, qui ne les porte plus. `has_parent_contact` est
                                calculé par Postgres et ne révèle rien. */}
                            <td style={{ color: COLORS.ink3 }}>
                              {(() => {
                                const c = contacts[s.id];

                                // ─── CORRECTION D'UN CONTACT (Maxime seulement) ───────
                                // Trou comblé le 2026-09-30 : jusque-là, le numéro d'un
                                // parent ne pouvait s'écrire QU'À LA CRÉATION de l'élève.
                                // Aucun écran ne savait le corriger — or c'est le numéro
                                // que lisent LES TROIS fonctions WhatsApp. Un chiffre mal
                                // saisi était donc définitif, et le parent ne recevait
                                // jamais rien, sans qu'aucune erreur n'apparaisse.
                                if (asAdmin && editId === s.id) {
                                  return (
                                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                      {/* DEUX numéros : le père et la mère. Les deux
                                          recevront les messages concernant l'enfant. */}
                                      <input className="ec-input" type="tel" value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        aria-label={`Premier téléphone du parent de ${s.full_name}`}
                                        placeholder="1er tél. WhatsApp (+237…)" style={{ flex: "1 1 130px", minWidth: 120 }} />
                                      <input className="ec-input" type="tel" value={editPhone2}
                                        onChange={(e) => setEditPhone2(e.target.value)}
                                        aria-label={`Deuxième téléphone du parent de ${s.full_name}`}
                                        placeholder="2e tél. (second parent)" style={{ flex: "1 1 130px", minWidth: 120 }} />
                                      <input className="ec-input" value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        aria-label={`E-mail du parent de ${s.full_name}`}
                                        placeholder="E-mail (optionnel)" style={{ flex: "1 1 130px", minWidth: 120 }} />
                                      <Button size="sm" onClick={() => saveContact(s.id)}
                                        disabled={stuSaving || !online}>Enregistrer</Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Annuler</Button>
                                    </span>
                                  );
                                }

                                if (asAdmin) {
                                  const phones = c ? [c.parent_phone, c.parent_phone_2].filter(Boolean) : [];
                                  const has = c && (c.parent_email || phones.length > 0);
                                  // Un numéro non envoyable ne produit AUCUNE erreur : Meta
                                  // le refuse en silence. On signale dès que l'UN des deux
                                  // est douteux — sinon le parent concerné ne recevrait
                                  // jamais rien et personne ne saurait pourquoi.
                                  const douteux = phones.some((p) => !isSendablePhone(p));
                                  return (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                      <span>
                                        {has
                                          ? [c.parent_email, ...phones.map((p) => formatPhone(p) || p)].filter(Boolean).join(" · ")
                                          : (s.has_parent_contact ? "✓ contact enregistré" : "contact manquant")}
                                      </span>
                                      {/* Deux numéros = les deux parents seront prévenus.
                                          Dit explicitement, pour que l'absence du second se
                                          remarque autant que sa présence. */}
                                      {phones.length === 2 && (
                                        <span style={{ color: COLORS.g700, fontWeight: 650, fontSize: FONT.sm }}>
                                          2 parents
                                        </span>
                                      )}
                                      {douteux && (
                                        <span style={{ color: COLORS.crit, fontWeight: 700, fontSize: FONT.sm }}>
                                          téléphone à vérifier
                                        </span>
                                      )}
                                      <IconButton label={`Corriger la coordonnée du parent de ${s.full_name}`}
                                        onClick={() => {
                                          setEditId(s.id);
                                          setEditPhone((c && c.parent_phone) || "");
                                          setEditPhone2((c && c.parent_phone_2) || "");
                                          setEditEmail((c && c.parent_email) || "");
                                          setMsg(null);
                                        }}>✎</IconButton>
                                    </span>
                                  );
                                }

                                if (!s.has_parent_contact) return <span>contact manquant</span>;
                                return <span style={{ color: COLORS.g700, fontWeight: 650 }}>✓ contact enregistré</span>;
                              })()}
                            </td>
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
                                  onClick={() => regenerateCode(s.id)} disabled={stuSaving || !online}>↻</IconButton>
                                {/* Retirer un élève — Maxime seulement. Non demandé
                                    explicitement, mais fermé par cohérence : une
                                    direction qui ne peut pas inscrire un élève ne doit
                                    pas pouvoir le désinscrire, l'effet étant plus grave.
                                    À rouvrir d'un mot si Maxime le souhaite. */}
                                {asAdmin && (
                                  <IconButton label={`Retirer ${s.full_name} de la classe`}
                                    onClick={() => setConfirm({ kind: "student", id: s.id, label: s.full_name })}>
                                    <span style={{ color: COLORS.crit, fontWeight: 700 }}>✕</span>
                                  </IconButton>
                                )}
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
                <Button onClick={save} disabled={saving || !online}>
                  {saving ? "Enregistrement…" : !online ? "Enregistrer — hors connexion" : "Enregistrer"}
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
