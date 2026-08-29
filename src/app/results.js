"use client";
// EduCam — Résultats quotidiens.
//
// L'écran servait deux besoins opposés avec la même interface (audit §9, §3.3
// de la proposition). Il est désormais séparé par RÔLE :
//
//   · ENSEIGNANT — saisie rapide  : liste d'élèves, champ numérique large,
//     ENREGISTREMENT AUTOMATIQUE PAR LIGNE avec état visible (à enregistrer /
//     enregistrement… / enregistré / réessayer). Optimisé pour le pouce et la
//     saisie répétitive. Un onglet « Vue classe » pour lire et suivre.
//   · PARENT — lecture : la trajectoire de l'enfant dans le temps et par
//     matière, avec les graphiques SVG maison de `charts.js`. Aucun rang chiffré ;
//     une position en TRANCHE, adoucie, derrière le flag RANK_TRANCHE_ENABLED.
//
// Règles tenues (cf. theme.js / audit) : le TEXTE porte l'information, la couleur
// ne fait que renforcer ; une seule teinte pour les barres ; cibles ≥ 44 px ;
// libellés liés (forms.js) ; erreurs remontées (plus de `catch (_) {}`).

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { logActivity } from "../lib/activity";
import { RANK_TRANCHE_ENABLED } from "../lib/flags";
import { COLORS, FONT } from "../lib/theme";
import {
  Card, CardLabel, Badge, Button, EmptyState, SkeletonRows, ListRow,
  Tabs, StatTile, SubjectChip, Callout, Meter,
} from "../components/ui";
import { Field, SelectField } from "../components/forms";
import { LineChart, BarList, Sparkline, fr } from "../components/charts";
import { useToasts } from "../components/overlays";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const todayISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Pourcentage 0–100 d'un score, ou null. */
const pct100 = (score, total) =>
  total > 0 && score != null ? (score / total) * 100 : null;

/** « 2026-10-14 » → « 14/10 ». */
const dm = (iso) => {
  const [, m, d] = String(iso || "").split("-");
  return d && m ? `${d}/${m}` : iso || "";
};

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

const initials = (name) =>
  (name || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** subject_id → libellé court, pour les barres et pastilles. */
const SUBJECT_META = {
  francais: { name: "Français et Littérature", short: "Français" },
  maths:    { name: "Mathématiques",           short: "Maths" },
  sciences: { name: "Sciences et Technologies", short: "Sciences" },
  english:  { name: "English Language",         short: "Anglais" },
  shs:      { name: "Sciences humaines et sociales", short: "SHS" },
  tic:      { name: "TIC",                       short: "TIC" },
  langues:  { name: "Langues et cultures nat.",  short: "Langues" },
  arts:     { name: "Éducation artistique",      short: "Arts" },
  eps:      { name: "Éducation physique et sportive", short: "EPS" },
  devperso: { name: "Développement personnel",   short: "Dév. perso" },
};
const subjectName = (id) => SUBJECT_META[id]?.name || "Autre";
const subjectShort = (id) => SUBJECT_META[id]?.short || "Autre";

/**
 * Bande de compréhension d'un score, en %. Le TEXTE porte l'information ; la
 * couleur ne fait que la renforcer (jamais seule) — audit §3.
 */
/**
 * Notes des trois boutons de saisie rapide, exprimées dans le TOTAL RÉEL du
 * contrôle — jamais dans une échelle inventée : afficher « 10/10 » à un parent
 * pour un contrôle sur 5 serait faux.
 *
 * « À renforcer » doit rester STRICTEMENT sous la moitié : le signalement
 * `difficulty` vaut `score / total < 0.5`. Un simple `total / 2` donnerait
 * 5/10 = 0,5, qui ne déclenche PAS le signalement — un élève marqué « à
 * renforcer » à chaque leçon n'apparaîtrait alors jamais dans les « leçons à
 * revoir » de son parent. `ceil(t / 2) - 1` le garantit pour tout total
 * (5 → 2 = 40 %, 10 → 4 = 40 %).
 */
const quickScores = (total) => {
  const t = Number(total) || 0;
  return { acquis: t, renforcer: Math.max(0, Math.ceil(t / 2) - 1), non: 0 };
};

const scoreBand = (p) => {
  if (p == null) return null;
  if (p < 50) return { label: "À revoir", tone: "crit" };
  if (p < 70) return { label: "Fragile", tone: "warn" };
  return null; // ≥ 70 % : pas de bruit, le pourcentage suffit
};

/** Bande d'une moyenne sur 20 (contexte camerounais : notes sur 20). */
const avgBand = (v20) => {
  if (v20 == null) return null;
  if (v20 < 10) return { label: "En difficulté", tone: "crit" };
  if (v20 < 14) return { label: "À surveiller", tone: "warn" };
  return null;
};

/**
 * Position en TRANCHE d'une moyenne dans une classe — jamais un rang chiffré.
 * Renvoie null si la classe est trop petite pour qu'une tranche ait du sens
 * (à trois élèves, une tranche EST un rang).
 */
const positionTranche = (avg20, classAverages20) => {
  const vals = (classAverages20 || []).filter((v) => v != null && !Number.isNaN(v));
  if (avg20 == null || vals.length < 4) return null;
  const above = vals.filter((v) => v > avg20).length;
  const frac = above / vals.length; // 0 = en tête
  if (frac <= 1 / 3) return { seg: 2, label: "Dans le premier tiers de la classe" };
  if (frac <= 2 / 3) return { seg: 1, label: "Dans la moyenne de la classe" };
  return { seg: 0, label: "A besoin de soutien pour suivre la classe" };
};

const norm = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* -------------------------------------------------------------------------- */
/* Tranche — indicateur à trois segments, sans chiffre                          */
/* -------------------------------------------------------------------------- */
function TrancheBand({ avg20, classAverages20 }) {
  const t = positionTranche(avg20, classAverages20);
  if (!t) return null;
  const segs = ["Soutien", "Milieu", "Tête de classe"];
  return (
    <Card style={{ marginTop: 14 }}>
      <CardLabel>Position dans la classe</CardLabel>
      <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink, marginBottom: 12 }}>
        {t.label}
      </div>
      <div role="group" aria-label={`Position : ${t.label}`} style={{ display: "flex", gap: 6 }}>
        {segs.map((s, i) => {
          const active = i === t.seg;
          return (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                height: 8, borderRadius: 999,
                background: active ? COLORS.g500 : COLORS.track,
              }} />
              <div style={{
                fontSize: "var(--ec-fs-1)", marginTop: 6, fontWeight: active ? 700 : 600,
                color: active ? COLORS.g700 : COLORS.ink3,
              }}>
                {s}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, margin: "12px 0 0", lineHeight: 1.5 }}>
        Une position d'ensemble, sans classement nominatif — pour situer sans décourager.
      </p>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Trajectoire d'un élève — lecture (parent + détail enseignant)                */
/* -------------------------------------------------------------------------- */
/**
 * `results` : [{ score, total, difficulty, result_date, lesson_id, lessons:{title, subject_id} }]
 * `classAverages20` : moyennes /20 des élèves de la classe (pour la tranche).
 * `showTranche` : afficher la tranche (toujours vrai côté enseignant ; côté
 *   parent, seulement si RANK_TRANCHE_ENABLED et distribution disponible).
 */
export function StudentTrajectory({ results = [], classAverages20, showTranche, onOpenLesson }) {
  const scored = useMemo(
    () => results
      .map((r) => ({ ...r, p: pct100(r.score, r.total) }))
      .filter((r) => r.p != null),
    [results]
  );

  if (!scored.length) {
    return (
      <Card>
        <EmptyState icon="📊" title="Pas encore de résultats">
          Les notes et la progression apparaîtront ici après les premiers
          contrôles de compréhension en classe.
        </EmptyState>
      </Card>
    );
  }

  // Chronologique (ancien → récent) pour la courbe.
  const chrono = [...scored].sort((a, b) => String(a.result_date).localeCompare(String(b.result_date)));
  const lastPoints = chrono.slice(-10);
  const points = lastPoints.map((r) => r.p * 0.2);
  const labels = lastPoints.map((r) => dm(r.result_date));

  const avg20 = mean(scored.map((r) => r.p)) * 0.2;

  // Tendance : première moitié vs seconde moitié (en points sur 20).
  let delta = null, deltaDir = null;
  if (chrono.length >= 4) {
    const half = Math.floor(chrono.length / 2);
    const early = mean(chrono.slice(0, half).map((r) => r.p)) * 0.2;
    const late = mean(chrono.slice(half).map((r) => r.p)) * 0.2;
    const d = late - early;
    if (d >= 0.3) { delta = `+${fr(d)} pts`; deltaDir = "up"; }
    else if (d <= -0.3) { delta = `−${fr(Math.abs(d))} pts`; deltaDir = "down"; }
  }

  // Par matière (une seule teinte — règle des barres).
  const bySubject = new Map();
  scored.forEach((r) => {
    const sid = r.lessons?.subject_id || "autre";
    if (!bySubject.has(sid)) bySubject.set(sid, []);
    bySubject.get(sid).push(r.p);
  });
  const subjectBars = [...bySubject.entries()]
    .map(([sid, arr]) => ({ label: subjectShort(sid), value: mean(arr) * 0.2, sid }))
    .sort((a, b) => b.value - a.value);

  // Leçons à revoir (dédupliquées, la plus récente d'abord).
  const recentFirst = [...scored].sort((a, b) => String(b.result_date).localeCompare(String(a.result_date)));
  const reviewMap = new Map();
  recentFirst.forEach((r) => {
    const weak = r.difficulty || r.p < 50;
    if (weak && r.lesson_id != null && !reviewMap.has(r.lesson_id)) reviewMap.set(r.lesson_id, r);
  });
  const review = [...reviewMap.values()].slice(0, 6);

  const band = avgBand(avg20);

  return (
    <>
      {/* Vue d'ensemble */}
      <div className="ec-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <StatTile label="Moyenne générale" value={fr(avg20)} unit="/20" delta={delta} deltaDir={deltaDir}>
          {band && <div style={{ marginTop: 9 }}><Badge tone={band.tone}>{band.label}</Badge></div>}
        </StatTile>
        <StatTile label="Contrôles" value={scored.length} />
        <StatTile label="Leçons à revoir" value={review.length} />
      </div>

      {/* Trajectoire dans le temps */}
      {points.length >= 2 && (
        <Card style={{ marginTop: 14 }}>
          <h2 style={{ fontSize: "var(--ec-fs-4)", fontWeight: 800, letterSpacing: "-.02em" }}>Progression</h2>
          <p style={{ fontSize: FONT.sm, color: COLORS.ink3, margin: "4px 0 12px" }}>
            Note de chaque contrôle, sur 20 — du plus ancien au plus récent.
          </p>
          <LineChart
            points={points}
            labels={labels}
            min={Math.max(0, Math.min(...points) - 2)}
            max={Math.min(20, Math.max(...points) + 2)}
            unit=" / 20"
            label={`Progression : de ${fr(points[0])} à ${fr(points.at(-1))} sur 20`}
          />
        </Card>
      )}
      {points.length < 2 && (
        <Card style={{ marginTop: 14 }}>
          <h2 style={{ fontSize: "var(--ec-fs-4)", fontWeight: 800, letterSpacing: "-.02em" }}>Progression</h2>
          <p style={{ fontSize: FONT.sm, color: COLORS.ink3, margin: "4px 0 0", lineHeight: 1.5 }}>
            La courbe de progression s'affichera dès le deuxième contrôle. Pour
            l'instant : <strong>{fr(avg20)}/20</strong> sur un contrôle.
          </p>
        </Card>
      )}

      {/* Par matière */}
      {subjectBars.length > 0 && (
        <Card style={{ marginTop: 14 }}>
          <h2 style={{ fontSize: "var(--ec-fs-4)", fontWeight: 800, letterSpacing: "-.02em" }}>Par matière</h2>
          <p style={{ fontSize: FONT.sm, color: COLORS.ink3, margin: "4px 0 15px" }}>
            Moyenne sur 20, matière par matière.
          </p>
          <BarList items={subjectBars} max={20} unit=" / 20" />
        </Card>
      )}

      {/* Tranche (enseignant toujours ; parent seulement si activé + données) */}
      {showTranche && <TrancheBand avg20={avg20} classAverages20={classAverages20} />}

      {/* Leçons à revoir */}
      {review.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: "var(--ec-fs-4)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 4 }}>
            Leçons à revoir
          </h2>
          <p style={{ fontSize: FONT.sm, color: COLORS.ink3, margin: "0 0 12px", lineHeight: 1.5 }}>
            Les leçons où la compréhension a été fragile — à retravailler en priorité.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {review.map((r) => (
              <ListRow
                key={r.lesson_id}
                icon="↻"
                title={r.lessons?.title || "Leçon"}
                meta={`Dernier contrôle : ${r.score}/${r.total} · ${dm(r.result_date)}`}
                onClick={onOpenLesson ? () => onOpenLesson(r.lesson_id) : undefined}
                right={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Badge tone="crit">À revoir</Badge>
                    {onOpenLesson && <span aria-hidden="true" style={{ color: COLORS.ink3, fontSize: "var(--ec-fs-4)" }}>›</span>}
                  </span>
                }
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Ligne de saisie — présentation pure (état de sauvegarde visible)             */
/* -------------------------------------------------------------------------- */
export function EntryRow({ name, value, status, total, inputRef, onChange, onCommit, onNext, onQuick, active, onFocusRow }) {
  const p = value === "" || value == null ? null : pct100(Number(value), Number(total));
  const band = scoreBand(p);
  return (
    <div
      onClick={onFocusRow}
      style={{
        background: COLORS.card,
        border: `1px solid ${active ? COLORS.g500 : COLORS.border}`,
        boxShadow: active ? `0 0 0 2px ${COLORS.g100}` : undefined,
        borderRadius: 10, padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </div>
          {p != null && (
            <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "var(--ec-fs-2)", fontWeight: 700, color: COLORS.ink2, fontVariantNumeric: "tabular-nums" }}>
                {Math.round(p)} %
              </span>
              {band && <Badge tone={band.tone}>{band.label}</Badge>}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
          <input
            ref={inputRef}
            className="ec-input"
            type="number" inputMode="numeric" min={0} max={Number(total)}
            value={value}
            aria-label={`Note de ${name}, sur ${total}`}
            placeholder="—"
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => onCommit()}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); onNext && onNext(); } }}
            style={{ width: 88, textAlign: "center", fontSize: "var(--ec-fs-5)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
          />
          <span style={{ fontSize: "var(--ec-fs-3)", color: COLORS.ink3, flex: "none" }}>/ {total}</span>
        </div>
      </div>
      {/* Saisie rapide : l'enseignant ne tape au clavier que les exceptions.
          Le champ numérique reste disponible — réduire 4/5 et 5/5 au même
          « Acquis » détruirait la distribution des scores par leçon, qui est
          le signal disant qu'une leçon est à réécrire. */}
      {onQuick && (
        <div className="ec-mast" role="group" aria-label={`Note rapide pour ${name}`}>
          {(() => {
            const q = quickScores(total);
            return [
              { k: "good", label: "Acquis", v: q.acquis },
              { k: "warn", label: "À renforcer", v: q.renforcer },
              { k: "crit", label: "Non acquis", v: q.non },
            ].map((b) => {
              const on = value !== "" && value != null && Number(value) === b.v;
              return (
                <button
                  key={b.k}
                  type="button"
                  className={`is-${b.k}`}
                  aria-pressed={on}
                  onClick={() => onQuick(String(b.v))}
                >
                  {on ? <span aria-hidden="true">✓ </span> : null}{b.label}
                </button>
              );
            });
          })()}
        </div>
      )}

      <div aria-live="polite" style={{ minHeight: 16, marginTop: 6, textAlign: "right", fontSize: "var(--ec-fs-2)", fontWeight: 700 }}>
        {status === "saving" && <span style={{ color: COLORS.ink3 }}>Enregistrement…</span>}
        {status === "saved" && <span style={{ color: COLORS.good }}>✓ Enregistré</span>}
        {status === "dirty" && <span style={{ color: COLORS.ink3 }}>· à enregistrer</span>}
        {status === "error" && (
          <button type="button" onClick={() => onCommit()}
            style={{ background: "none", border: 0, color: COLORS.crit, fontWeight: 700, fontSize: "var(--ec-fs-2)", minHeight: 32, padding: "0 4px" }}>
            ! Réessayer
          </button>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Composant principal — aiguillage par rôle                                   */
/* ========================================================================== */
export default function Results({ teacher, school, parent, student, results: resultsProp, onBack, onOpenLesson }) {
  const isParent = !!parent;

  const backLink = (
    <button onClick={onBack} className="ec-link"
      style={{ minHeight: 40, marginBottom: 14, textDecoration: "none", color: COLORS.ink2 }}>
      ‹ Retour
    </button>
  );

  /* ----------------------------- PARENT ----------------------------------- */
  if (isParent) {
    const childName = student?.full_name || "votre enfant";
    // Côté parent, la tranche exige une distribution de classe que le parent ne
    // peut pas lire sous RLS. On la passe donc vide : la tranche reste masquée
    // tant qu'un agrégat Supabase ne la fournit pas, même flag activé.
    const showTranche = RANK_TRANCHE_ENABLED;
    return (
      <div>
        {backLink}
        <h1 className="ec-h1">Résultats de {childName}</h1>
        <p className="ec-sub">Sa progression, contrôle après contrôle.</p>
        <div style={{ marginTop: 18 }}>
          <StudentTrajectory
            results={resultsProp || []}
            classAverages20={undefined}
            showTranche={showTranche}
            onOpenLesson={onOpenLesson}
          />
        </div>
      </div>
    );
  }

  /* --------------------------- ENSEIGNANT --------------------------------- */
  return <TeacherResults teacher={teacher} school={school} backLink={backLink} />;
}

/* -------------------------------------------------------------------------- */
/* Enseignant — saisie + vue classe + détail élève                             */
/* -------------------------------------------------------------------------- */
function TeacherResults({ teacher, school, backLink }) {
  const { pushToast, ToastViewport } = useToasts();

  const [tab, setTab] = useState("entry"); // "entry" | "class"
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [taughtLessons, setTaughtLessons] = useState([]);

  // Saisie
  const [lessonId, setLessonId] = useState("");
  const [resultDate, setResultDate] = useState(todayISO());
  const [total, setTotal] = useState(5);
  const [rows, setRows] = useState({}); // { [studentId]: { val, status, savedVal } }
  const loggedRef = useRef(new Set());
  const inputRefs = useRef({});

  // Vue classe
  const [summary, setSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [query, setQuery] = useState("");

  // Détail élève
  const [detail, setDetail] = useState(null); // { student, history }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [teacher?.id]);
  useEffect(() => { if (lessonId && resultDate && students.length) loadExisting(); /* eslint-disable-next-line */ }, [lessonId, resultDate, students.length]);
  useEffect(() => { if (tab === "class") loadSummary(); /* eslint-disable-next-line */ }, [tab, students.length]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: st }, { data: lt }] = await Promise.all([
        supabase.from("students").select("id, full_name").eq("teacher_id", teacher.id).order("full_name"),
        supabase.from("lessons_taught")
          .select("lesson_id, taught_at, lessons(id, title, unit_number, theme)")
          .eq("teacher_id", teacher.id).order("taught_at", { ascending: false }),
      ]);
      setStudents(st || []);
      const seen = new Set(); const list = [];
      (lt || []).forEach((r) => { if (r.lessons && !seen.has(r.lessons.id)) { seen.add(r.lessons.id); list.push(r.lessons); } });
      setTaughtLessons(list);
      setLessonId((prev) => prev || (list.length ? String(list[0].id) : ""));
    } catch (_) {
      pushToast("Impossible de charger la classe. Vérifiez votre connexion.", "error");
    }
    setLoading(false);
  };

  const loadExisting = async () => {
    try {
      const { data } = await supabase.from("daily_results")
        .select("student_id, score, total")
        .eq("lesson_id", Number(lessonId)).eq("result_date", resultDate);
      const map = {}; let t = null;
      (data || []).forEach((r) => {
        const v = String(r.score ?? "");
        map[r.student_id] = { val: v, status: "saved", savedVal: v };
        if (r.total) t = r.total;
      });
      setRows(map);
      if (t) setTotal(t);
    } catch (_) { /* lecture non bloquante */ }
  };

  const rowOf = (id) => rows[id] || { val: "", status: "idle", savedVal: "" };

  const onChangeRow = (id, val) => {
    setRows((prev) => {
      const cur = prev[id] || { savedVal: "" };
      const status = val === "" ? "idle" : val === cur.savedVal ? "saved" : "dirty";
      return { ...prev, [id]: { ...cur, val, status } };
    });
  };

  const saveRow = async (id, explicitVal) => {
    const r = explicitVal != null ? { ...rowOf(id), val: explicitVal, status: "dirty" } : rowOf(id);
    if (!lessonId) { pushToast("Choisissez d'abord la leçon du jour.", "error"); return; }
    const tot = Number(total) || 0;
    if (tot <= 0) { pushToast("Indiquez le total de la question (« / sur »).", "error"); return; }
    if (r.val === "" || r.val == null) return;
    const score = Number(r.val);
    if (Number.isNaN(score) || score < 0 || score > tot) {
      pushToast(`Note invalide : attendez un nombre entre 0 et ${tot}.`, "error");
      setRows((prev) => ({ ...prev, [id]: { ...prev[id], status: "error" } }));
      return;
    }
    if (r.status === "saved" && r.val === r.savedVal) return;

    setRows((prev) => ({ ...prev, [id]: { ...prev[id], status: "saving" } }));
    try {
      const { error } = await supabase.from("daily_results").upsert({
        student_id: id, lesson_id: Number(lessonId), school_id: school?.id || null,
        teacher_id: teacher.id, result_date: resultDate,
        score, total: tot, difficulty: tot > 0 ? score / tot < 0.5 : false,
        entered_by: teacher.id,
      }, { onConflict: "student_id,lesson_id,result_date" });
      if (error) throw error;
      setRows((prev) => ({ ...prev, [id]: { val: r.val, savedVal: r.val, status: "saved" } }));
      const key = `${lessonId}·${resultDate}`;
      if (!loggedRef.current.has(key)) {
        loggedRef.current.add(key);
        logActivity({
          actorId: teacher.id, actorRole: teacher?.role || "teacher", schoolId: school?.id,
          eventType: "results_entered", lessonId: Number(lessonId), detail: "saisie des résultats",
        });
      }
    } catch (_) {
      setRows((prev) => ({ ...prev, [id]: { ...prev[id], status: "error" } }));
      pushToast("Note non enregistrée. Elle reste à l'écran — réessayez.", "error");
    }
  };

  /** Bouton de note rapide : pose la valeur et l'enregistre dans la foulée. */
  const quickSet = (id, val) => {
    setRows((prev) => ({ ...prev, [id]: { ...(prev[id] || { savedVal: "" }), val, status: "dirty" } }));
    saveRow(id, val);
  };

  /**
   * « Tout marquer acquis » — le geste qui fait gagner du temps sur 36 élèves :
   * on pose la note maximale partout, puis on ne corrige au clavier que les
   * trois ou quatre élèves qui ont échoué. Ne touche PAS aux notes déjà
   * saisies : on ne réécrit jamais une note que l'enseignant a posée.
   */
  const markAllAcquired = async () => {
    const tot = String(Number(total) || 0);
    const targets = students.filter((s) => rowOf(s.id).val === "");
    for (const s of targets) {
      quickSet(s.id, tot);
      await new Promise((r) => setTimeout(r, 0));
    }
  };

  /* ------------------------------------------------------------------------
     RACCOURCIS CLAVIER 1 / 2 / 3 — le geste le plus répété de la plateforme.
     Un curseur descend tout seul, si bien qu'une classe de 36 se saisit sans
     quitter le clavier. Les touches sont IGNORÉES dès que le focus est dans un
     champ : le champ numérique reste le moyen de poser une note exacte, et
     réduire 4/5 et 5/5 au même « Acquis » détruirait la distribution des
     scores — le signal qui dit qu'une leçon est à réécrire.
     ------------------------------------------------------------------------ */
  /* `hasLesson` DOIT être déclaré avant l'effet clavier ci-dessous : il figure
     dans son tableau de dépendances, qui est évalué PENDANT le rendu. Déclaré
     plus bas, il tombait dans la zone morte temporelle du `const` et le
     composant levait « Cannot access 'hasLesson' before initialization » à
     chaque rendu — l'écran de saisie ne s'ouvrait pas du tout. Un `next build`
     ne voit pas ce défaut : il compile, il ne rend pas. */
  const hasLesson = !!lessonId && taughtLessons.length > 0;

  const [cursor, setCursor] = useState(0);
  const cursorRef = useRef(0);
  cursorRef.current = cursor;
  const quickSetRef = useRef(quickSet);
  quickSetRef.current = quickSet;

  useEffect(() => { setCursor(0); }, [lessonId]);

  useEffect(() => {
    if (tab !== "entry" || !hasLesson || !students.length) return undefined;
    const onKey = (e) => {
      const t = e.target;
      const tag = t && t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const i = Math.min(Math.max(cursorRef.current, 0), students.length - 1);
      const q = quickScores(Number(total) || 0);
      const map = { "1": q.acquis, "2": q.renforcer, "3": q.non };

      if (Object.prototype.hasOwnProperty.call(map, e.key)) {
        e.preventDefault();
        quickSetRef.current(students[i].id, String(map[e.key]));
        setCursor(Math.min(i + 1, students.length - 1));
        return;
      }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(Math.min(i + 1, students.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(Math.max(i - 1, 0)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, hasLesson, students, total]);

  const pending = students.filter((s) => {
    const r = rowOf(s.id);
    return r.val !== "" && r.status !== "saved" && r.status !== "saving";
  });

  const saveAllPending = async () => {
    for (const s of pending) { await saveRow(s.id); } // séquentiel : ordre + charge maîtrisés
  };

  const focusNext = (idx) => {
    const next = inputRefs.current[idx + 1];
    if (next) next.focus();
  };

  const loadSummary = async () => {
    const ids = students.map((s) => s.id);
    if (!ids.length) { setSummary([]); return; }
    setSummaryLoading(true);
    try {
      const { data } = await supabase.from("daily_results")
        .select("student_id, score, total, difficulty, result_date").in("student_id", ids);
      const byStu = {};
      (data || []).forEach((r) => {
        const a = (byStu[r.student_id] = byStu[r.student_id] || { n: 0, sumP: 0, diff: 0, last: null });
        a.n += 1;
        const p = pct100(r.score, r.total); if (p != null) a.sumP += p;
        if (r.difficulty) a.diff += 1;
        if (!a.last || r.result_date > a.last) a.last = r.result_date;
      });
      setSummary(students.map((s) => {
        const a = byStu[s.id] || { n: 0, sumP: 0, diff: 0, last: null };
        const avgP = a.n ? a.sumP / a.n : null;
        return { ...s, checks: a.n, avgP, avg20: avgP == null ? null : avgP * 0.2, diff: a.diff, last: a.last };
      }));
    } catch (_) {
      pushToast("Impossible de charger la vue classe.", "error");
    }
    setSummaryLoading(false);
  };

  const openDetail = async (s) => {
    try {
      const { data } = await supabase.from("daily_results")
        .select("score, total, difficulty, result_date, lesson_id, lessons(title, subject_id)")
        .eq("student_id", s.id).order("result_date", { ascending: false });
      setDetail({ student: s, history: data || [] });
    } catch (_) {
      pushToast("Impossible d'ouvrir la fiche de l'élève.", "error");
    }
  };

  const classAverages20 = useMemo(
    () => summary.map((s) => s.avg20).filter((v) => v != null),
    [summary]
  );

  const lessonLabel = (l) => `U${l.unit_number || "?"} · ${l.title}`;

  /* --------------------------- Rendus ----------------------------------- */

  if (loading) {
    return <div>{backLink}<h1 className="ec-h1">Résultats</h1><div style={{ marginTop: 20 }}><SkeletonRows rows={5} /></div></div>;
  }

  if (!students.length) {
    return (
      <div>
        {backLink}
        <h1 className="ec-h1">Résultats</h1>
        <Card style={{ marginTop: 18 }}>
          <EmptyState icon="👥" title="Aucun élève dans cette classe">
            Enregistrez d'abord vos élèves depuis « Gestion de l'école ». La saisie
            des résultats quotidiens apparaîtra ensuite ici.
          </EmptyState>
        </Card>
        <ToastViewport />
      </div>
    );
  }

  // Détail d'un élève
  if (detail) {
    const own20 = (() => {
      const ps = detail.history.map((r) => pct100(r.score, r.total)).filter((v) => v != null);
      return ps.length ? mean(ps) * 0.2 : null;
    })();
    return (
      <div>
        <button onClick={() => setDetail(null)} className="ec-link"
          style={{ minHeight: 40, marginBottom: 14, textDecoration: "none", color: COLORS.ink2 }}>
          ‹ Retour à la classe
        </button>
        <h1 className="ec-h1">{detail.student.full_name}</h1>
        <p className="ec-sub">Fiche de suivi — {school?.name || "votre classe"}.</p>
        <div style={{ marginTop: 18 }}>
          <StudentTrajectory results={detail.history} classAverages20={classAverages20} showTranche />
        </div>
        <ToastViewport />
      </div>
    );
  }

  return (
    <div>
      {backLink}
      <h1 className="ec-h1">Résultats</h1>
      <p className="ec-sub">{school?.name || "Votre classe"} · {students.length} élève{students.length > 1 ? "s" : ""}</p>

      <div style={{ margin: "18px 0 16px" }}>
        <Tabs
          value={tab}
          onChange={(k) => setTab(k)}
          ariaLabel="Vue des résultats"
          items={[{ key: "entry", label: "Saisie du jour" }, { key: "class", label: "Vue classe" }]}
        />
      </div>

      {tab === "entry" ? (
        <div className="ec-grid">
          <Card className="ec-c4" style={{ alignSelf: "start" }}>
            <div className="ec-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <SelectField
                  label="Leçon du jour"
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                >
                  {taughtLessons.length === 0 && <option value="">Aucune leçon enseignée</option>}
                  {taughtLessons.map((l) => <option key={l.id} value={String(l.id)}>{lessonLabel(l)}</option>)}
                </SelectField>
              </div>
              <Field label="Date" type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} />
              <Field label="Total de la question" type="number" min={1} inputMode="numeric"
                value={total} onChange={(e) => setTotal(e.target.value)}
                hint="Le « sur » du contrôle" />
            </div>
          </Card>

          <div className="ec-c8">
          {!hasLesson ? (
            <Callout tone="warn" icon="🗓">
              Marquez d'abord une leçon comme « enseignée » depuis le lecteur de
              leçon. Vous pourrez ensuite saisir les résultats du contrôle ici.
            </Callout>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <Button variant="ghost" size="sm" onClick={markAllAcquired}
                  disabled={students.every((s) => rowOf(s.id).val !== "")}>
                  Tout marquer acquis
                </Button>
                <span style={{ fontSize: FONT.sm, color: COLORS.ink3 }}>
                  puis corrigez seulement les élèves en difficulté
                </span>
              </div>

              <Callout tone="brand" icon="✏️" style={{ marginBottom: 12 }}>
                Saisissez le nombre de bonnes réponses par élève. <strong>Chaque note
                est enregistrée automatiquement</strong> ; sous 50 %, la leçon est
                signalée « à revoir ».
              </Callout>

              {/* Le tableau de correspondance est énoncé UNE fois ici plutôt que
                  répété sur les 36 × 3 boutons, qui n'ont pas la place. */}
              <div className="ec-kbar ec-deskonly" style={{ marginBottom: 12 }}>
                <span>Raccourcis clavier</span>
                <span><span className="ec-kbd">1</span>Acquis · {quickScores(Number(total) || 0).acquis}/{total}</span>
                <span><span className="ec-kbd">2</span>À renforcer · {quickScores(Number(total) || 0).renforcer}/{total}</span>
                <span><span className="ec-kbd">3</span>Non acquis · 0/{total}</span>
                <span style={{ fontWeight: 600 }}>↑ ↓ pour changer d'élève</span>
              </div>

              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))" }}>
                {students.map((s, idx) => {
                  const r = rowOf(s.id);
                  return (
                    <EntryRow
                      key={s.id}
                      active={idx === cursor}
                      onFocusRow={() => setCursor(idx)}
                      name={s.full_name}
                      value={r.val}
                      status={r.status}
                      total={total}
                      inputRef={(el) => { inputRefs.current[idx] = el; }}
                      onChange={(v) => onChangeRow(s.id, v)}
                      onCommit={() => saveRow(s.id)}
                      onNext={() => focusNext(idx)}
                      onQuick={(v) => quickSet(s.id, v)}
                    />
                  );
                })}
              </div>

              {pending.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Button onClick={saveAllPending} block>
                    Enregistrer les {pending.length} note{pending.length > 1 ? "s" : ""} en attente
                  </Button>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      ) : (
        /* -------------------------- Vue classe ---------------------------- */
        <>
          {summaryLoading ? (
            <SkeletonRows rows={5} />
          ) : summary.every((s) => s.checks === 0) ? (
            <Card>
              <EmptyState icon="📊" title="Aucun résultat enregistré">
                Dès que vous aurez saisi les premiers contrôles, la moyenne de la
                classe et le suivi par élève apparaîtront ici.
              </EmptyState>
            </Card>
          ) : (
            (() => {
              const evaluated = summary.filter((s) => s.checks > 0);
              const classAvg20 = mean(evaluated.map((s) => s.avg20).filter((v) => v != null));
              const watch = evaluated.filter((s) => s.avg20 != null && s.avg20 < 10).length;
              const q = norm(query);
              const shown = q ? evaluated.filter((s) => norm(s.full_name).includes(q)) : evaluated;
              const ordered = [...shown].sort((a, b) => (a.avg20 ?? 99) - (b.avg20 ?? 99));
              return (
                <>
                  <div className="ec-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 14 }}>
                    <StatTile label="Moyenne de la classe" value={classAvg20 == null ? "—" : fr(classAvg20)} unit={classAvg20 == null ? "" : "/20"} />
                    <StatTile label="Élèves évalués" value={evaluated.length} />
                    <StatTile label="En difficulté" value={watch} />
                  </div>

                  {evaluated.length > 8 && (
                    <Field label="Rechercher un élève" type="search" value={query}
                      onChange={(e) => setQuery(e.target.value)} placeholder="Nom de l'élève" />
                  )}

                  <Card style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table className="ec-table">
                        <thead>
                          <tr>
                            <th scope="col">Élève</th>
                            <th scope="col" className="num">Contrôles</th>
                            <th scope="col" className="num">Dernier</th>
                            <th scope="col" className="num">Moyenne</th>
                            <th scope="col">État</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ordered.map((s) => {
                            const band = avgBand(s.avg20);
                            return (
                              <tr key={s.id}>
                                <td>
                                  {/* La ligne entière n'est pas cliquable : c'est le nom
                                      qui l'est, pour rester atteignable au clavier. */}
                                  <button onClick={() => openDetail(s)} className="ec-link"
                                    style={{ textDecoration: "none", color: COLORS.ink, fontWeight: 650, minHeight: 32 }}>
                                    {s.full_name}
                                  </button>
                                </td>
                                <td className="num">{s.checks}</td>
                                <td className="num" style={{ color: COLORS.ink3 }}>{s.last ? dm(s.last) : "—"}</td>
                                <td className="num" style={{ fontWeight: 750 }}>
                                  {s.avg20 == null ? "—" : `${fr(s.avg20)}/20`}
                                </td>
                                <td>{band ? <Badge tone={band.tone}>{band.label}</Badge> : <span style={{ color: COLORS.ink3 }}>—</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {ordered.length === 0 && (
                      <p style={{ fontSize: FONT.sm, color: COLORS.ink3, padding: 16 }}>
                        Aucun élève ne correspond à « {query} ».
                      </p>
                    )}
                  </Card>
                </>
              );
            })()
          )}
        </>
      )}

      <ToastViewport />
    </div>
  );
}
