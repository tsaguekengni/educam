"use client";
// EduCam — tableau de bord du directeur.
//
// L'écran répond à une question qu'aucun directeur camerounais ne peut se poser
// aujourd'hui : « mes classes suivent-elles la répartition officielle ? ».
// Depuis le 2026-08-12 il est aussi l'ÉCRAN D'ACCUEIL de la direction : monté
// sans bouton Retour quand `onBack` n'est pas fourni.
//
// ---------------------------------------------------------------------------
// DONNÉES — lot C (2026-08-12) : agrégation CÔTÉ BASE.
// ---------------------------------------------------------------------------
// Cet écran calculait auparavant ses indicateurs dans le navigateur, à partir
// d'un tirage plafonné à 4 000 résultats. Il lit désormais les cinq vues de
// `claude/schooldashboard-aggregates.sql`, qui sont appliquées :
//
//   educam_student_averages · educam_class_averages · educam_school_trend
//   educam_score_bands      · educam_coverage
//
// On passe de plusieurs milliers de lignes à quelques dizaines. Les vues
// héritent des politiques RLS des tables sous-jacentes (elles ne sont pas
// SECURITY DEFINER) : un directeur ne voit donc que son école.
//
// Note d'état, vérifiée le 2026-08-12 : `daily_results` est vide. Tant qu'aucune
// note n'est saisie, les vues ne renvoient rien et l'écran affiche ses états
// vides — c'est le comportement attendu, pas une panne.

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { COLORS, FONT } from "../lib/theme";
import { Card, Badge, Button, EmptyState, SkeletonRows, ListRow, Meter, StatTile } from "../components/ui";
import { LineChart, BarList, Histogram, Heatmap, Sparkline, fr } from "../components/charts";

const UNITS = [1, 2, 3, 4, 5, 6, 7, 8];
// Ordre d'affichage des tranches, tel que les produit `educam_score_bands`.
const BANDS = ["< 8", "8-10", "10-12", "12-14", "14-16", "16+"];

/** Écart au calendrier, en semaines, à partir du taux de couverture d'une unité.
 *  Une semaine ≈ un tiers de l'unité (3 semaines enseignées + 1 d'intégration). */
const weeksFromRatio = (taught, expected) => {
  if (!expected) return null;
  return Math.max(-3, Math.min(2, Math.round((taught / expected - 1) * 3)));
};

export default function SchoolDashboard({ school, onBack, onOpenTab }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [classes, setClasses] = useState([]);   // educam_class_averages
  const [bands, setBands] = useState([]);       // educam_score_bands
  const [trendRows, setTrendRows] = useState([]); // educam_school_trend
  const [coverage, setCoverage] = useState([]); // educam_coverage
  const [atRisk, setAtRisk] = useState([]);     // educam_student_averages < 10
  const [studentCount, setStudentCount] = useState(0);
  const [rowsRead, setRowsRead] = useState(0);
  // Étiquettes de classe (CM1-A, CM1-B…). Les vues d'agrégation ne portent que
  // le NIVEAU : deux classes de CM1 dans la même école s'appelaient toutes deux
  // « CM1 ». Illisible pour le directeur — et clé React dupliquée dans la carte
  // de chaleur, donc lignes potentiellement fusionnées ou omises.
  const [classLabels, setClassLabels] = useState(new Map());
  // Leçon la plus manquée — vue `educam_hard_lessons` (claude-hard-lessons.sql).
  // null = en cours · false = vue absente · objet = résultat · undefined = aucune.
  const [hardest, setHardest] = useState(null);

  useEffect(() => {
    if (!school?.id) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("educam_hard_lessons")
        .select("lesson_id, title, attempts, fail_rate")
        .eq("school_id", school.id)
        .gte("fail_rate", 0.4)
        .order("fail_rate", { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error) { setHardest(false); return; }
      const r = (data || [])[0];
      setHardest(r ? { title: r.title, attempts: r.attempts, failRate: Number(r.fail_rate) } : undefined);
    })();
    return () => { cancelled = true; };
  }, [school?.id]);

  useEffect(() => {
    if (!school?.id) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const scoped = (view, cols) =>
          supabase.from(view).select(cols).eq("school_id", school.id);

        const [cls, bnd, trd, cov, risk, stu, tch] = await Promise.all([
          scoped("educam_class_averages", "teacher_id, teacher_name, level, students_evaluated, average_20, below_pass"),
          scoped("educam_score_bands", "band, students"),
          scoped("educam_school_trend", "month, evaluations, average_20"),
          scoped("educam_coverage", "teacher_id, level, unit_number, lessons_taught, lessons_expected"),
          supabase.from("educam_student_averages")
            .select("student_id, full_name, average_20, evaluations, difficulty_count")
            .eq("school_id", school.id).lt("average_20", 10)
            .order("average_20", { ascending: true }).limit(6),
          supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", school.id),
          // Facultatif : si la lecture est refusée (RLS), on retombe sur le niveau.
          // Pas de filtre sur `role` : la valeur par défaut en base est
          // « reviewer », pas « teacher » — filtrer dessus ne remonterait rien
          // pour les comptes créés par inscription normale.
          supabase.from("teachers").select("id, class_label, full_name")
            .eq("school_id", school.id),
        ]);

        const firstError = [cls, bnd, trd, cov, risk].find((r) => r.error);
        if (firstError) throw firstError.error;
        if (cancelled) return;

        setClasses(cls.data || []);
        setBands(bnd.data || []);
        setTrendRows(trd.data || []);
        setCoverage(cov.data || []);
        setAtRisk(risk.data || []);
        setStudentCount(stu.count || 0);
        setClassLabels(new Map((tch?.data || []).map((t) => [t.id, t])));
        setRowsRead(
          (cls.data?.length || 0) + (bnd.data?.length || 0) + (trd.data?.length || 0) +
          (cov.data?.length || 0) + (risk.data?.length || 0)
        );
      } catch (e) {
        if (!cancelled) {
          setErr("Impossible de charger les données de l'école. Vérifiez votre connexion.");
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [school?.id]);

  /* ---------------- Agrégats — désormais de simples sommes ---------------- */

  const evaluated = classes.reduce((a, c) => a + (c.students_evaluated || 0), 0);
  const belowPass = classes.reduce((a, c) => a + (c.below_pass || 0), 0);
  // Moyenne de l'école = moyenne des moyennes d'élèves, donc pondérée par
  // l'effectif évalué de chaque classe.
  const schoolAvg = evaluated
    ? classes.reduce((a, c) => a + (c.average_20 || 0) * (c.students_evaluated || 0), 0) / evaluated
    : null;

  /** Nom lisible d'une classe.
   *
   *  Les vues d'agrégation ne portent que le NIVEAU. Une école qui a deux
   *  classes de CM1 — le cas ordinaire — affichait donc deux lignes « CM1 » :
   *  le directeur ne pouvait pas dire laquelle était en retard, et React
   *  recevait deux fois la même clé.
   *
   *  On prend donc `teachers.class_label` (« CM1-A »). Si la lecture de
   *  `teachers` a échoué — RLS, réseau — on retombe sur le niveau, et on
   *  désambiguïse avec le nom de l'enseignant plutôt que d'afficher deux
   *  lignes identiques.
   */
  const labelFor = (tid, level) => {
    const t = classLabels.get(tid);
    if (t?.class_label) return t.class_label;
    const base = (level || "").toUpperCase();
    const nom = (t?.full_name
      || classes.find((c) => c.teacher_id === tid)?.teacher_name
      || "").split(" ").slice(-1)[0];
    const homonymes = classes.filter((c) => (c.level || "").toUpperCase() === base).length;
    if (!base) return nom || "Classe";
    return homonymes > 1 && nom ? `${base} · ${nom}` : base;
  };

  const classAverages = classes
    .map((c) => ({
      label: labelFor(c.teacher_id, c.level),
      value: Number(c.average_20) || 0,
      id: c.teacher_id,
    }))
    .sort((a, b) => b.value - a.value);

  const bins = BANDS.map((b) => ({
    label: b,
    count: bands.find((x) => x.band === b)?.students || 0,
  }));

  const trend = [...trendRows]
    .sort((a, b) => String(a.month).localeCompare(String(b.month)))
    .slice(-8)
    .map((t) => ({
      label: String(t.month).slice(5) + "/" + String(t.month).slice(2, 4),
      value: Number(t.average_20) || 0,
    }));

  // Carte de chaleur : une ligne par classe, une colonne par unité.
  const byTeacher = new Map();
  coverage.forEach((r) => {
    if (!byTeacher.has(r.teacher_id)) byTeacher.set(r.teacher_id, { level: r.level, units: new Map() });
    byTeacher.get(r.teacher_id).units.set(r.unit_number, r);
  });
  const heatRows = [...byTeacher.entries()].map(([tid, v]) => ({
    // `key` et non `label` : deux classes peuvent légitimement porter la même
    // étiquette, l'identifiant de l'enseignant est le seul unique.
    key: tid,
    teacherId: tid,
    label: labelFor(tid, v.level),
    values: UNITS.map((u) => {
      const r = v.units.get(u);
      return r ? weeksFromRatio(r.lessons_taught, r.lessons_expected) : null;
    }),
  })).filter((r) => r.values.some((x) => x != null))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), "fr"));

  // Synthèse en toutes lettres sous la carte de chaleur.
  const late = heatRows.filter((r) => r.values.some((v) => v != null && v <= -2));
  const lateIds = new Set(late.map((r) => r.teacherId));
  const onTrack = heatRows.length - late.length;

  // L'EXCEPTION : le pire écart de l'école, avec l'unité concernée. Un tableau
  // de bord doit dire quoi faire avant de montrer des chiffres. On ne l'affiche
  // que s'il y a réellement quelque chose à traiter — une bannière permanente
  // ne se lit plus au bout d'une semaine.
  const worst = (() => {
    let best = null;
    heatRows.forEach((r) => {
      r.values.forEach((v, i) => {
        if (v == null || v > -2) return;
        if (!best || v < best.weeks) best = { label: r.label, weeks: v, unit: i + 1 };
      });
    });
    return best;
  })();

  // Tableau des classes : couverture globale par classe.
  const classTable = classes.map((c) => {
    const cov = coverage.filter((x) => x.teacher_id === c.teacher_id);
    const taught = cov.reduce((a, x) => a + (x.lessons_taught || 0), 0);
    const expected = cov.reduce((a, x) => a + (x.lessons_expected || 0), 0);
    const w = weeksFromRatio(taught, expected);
    return { ...c, taught, expected, weeks: w, label: labelFor(c.teacher_id, c.level) };
  }).sort((a, b) => (b.average_20 || 0) - (a.average_20 || 0));

  const weekTag = (w) => {
    if (w == null) return <Badge tone="neutral">—</Badge>;
    if (w >= 1) return <Badge tone="brand">+{w} sem.</Badge>;
    if (w === 0) return <Badge tone="brand">à jour</Badge>;
    if (w === -1) return <Badge tone="warn">−1 sem.</Badge>;
    return <Badge tone="crit">{w} sem.</Badge>;
  };

  /* ---------------- Rendu ---------------- */
  const backLink = onBack && (
    <button onClick={onBack} className="ec-link"
      style={{ minHeight: 40, marginBottom: 14, textDecoration: "none", color: COLORS.ink2 }}>
      ‹ Retour
    </button>
  );

  if (!school?.id) {
    return (
      <div>
        {backLink}
        <Card>
          <EmptyState icon="🏫" title="Aucune école rattachée">
            Ce compte n'est relié à aucun établissement. Le tableau de bord s'affichera
            dès que votre école sera configurée.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const noData = !classes.length && !heatRows.length;
  // Nombre de classes = enseignants ayant au moins une leçon marquée enseignée,
  // ou à défaut les classes évaluées. Sans résultat ni couverture, c'est 0.
  const classCount = new Set([...coverage.map((c) => c.teacher_id), ...classes.map((c) => c.teacher_id)]).size;

  return (
    <div>
      {backLink}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 className="ec-h1">Tableau de bord</h1>
          <p className="ec-sub">
            {school.name} · {studentCount} élève{studentCount > 1 ? "s" : ""} · {classes.length} classe{classes.length > 1 ? "s" : ""} évaluée{classes.length > 1 ? "s" : ""}
          </p>
        </div>
        {onOpenTab && (
          <Button variant="ghost" size="sm" onClick={() => onOpenTab("students")}>
            Gérer l'école
          </Button>
        )}
      </div>

      {err && (
        <div role="alert" style={{
          background: COLORS.critBg, color: COLORS.crit, borderRadius: 10,
          padding: "11px 12px", fontSize: FONT.sm, marginTop: 16,
        }}>{err}</div>
      )}

      {loading ? (
        <div style={{ marginTop: 20 }}><SkeletonRows rows={5} /></div>
      ) : noData ? (
        <div className="ec-grid" style={{ marginTop: 18 }}>
          <div className="ec-c12">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 18 }}>
              <StatTile label="Élèves enregistrés" tint="green" value={studentCount}
                foot={studentCount ? "prêts à être suivis" : "aucun élève enregistré"} />
              <StatTile label="Classes" tint="blue" value={classCount}
                foot={classCount ? "enseignants rattachés" : "aucun enseignant n'a rejoint"} />
              <StatTile label="Semaines au calendrier" tint="amber" value={32}
                foot="8 unités de 4 semaines" />
              <StatTile label="Résultats saisis" tint="violet" value={0}
                foot="aucun contrôle enregistré" />
            </div>
          </div>
          <Card className="ec-c12">
            <div className="ec-cardhd"><h2 className="ec-cardtitle">Mettre l'école en route</h2></div>
            <p style={{ fontSize: FONT.sm, color: COLORS.ink3, margin: "0 0 14px", lineHeight: 1.5 }}>
              Les indicateurs de suivi — avance sur la répartition, moyennes, élèves à suivre —
              apparaîtront ici dès les premiers contrôles saisis. En attendant, voici ce qu'il
              reste à faire.
            </p>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
              {[
                { done: classCount > 0, title: "Inviter les enseignants",
                  meta: "Partagez le code de l'école pour qu'ils rattachent leur compte" },
                { done: studentCount > 0, title: "Enregistrer les élèves",
                  meta: "Chaque élève reçoit un code parent unique" },
                { done: false, title: "Distribuer les codes parents",
                  meta: "Un parent ne voit que son enfant" },
                { done: false, title: "Attendre les premiers contrôles",
                  meta: "Le suivi démarre à la première note saisie" },
              ].map((step, i) => (
                <ListRow
                  key={i}
                  icon={step.done ? "✓" : String(i + 1)}
                  iconColor={step.done ? COLORS.good : undefined}
                  title={step.title}
                  meta={step.meta}
                  onClick={onOpenTab ? () => onOpenTab("students") : undefined}
                  right={step.done ? <Badge tone="brand">Fait</Badge> : undefined}
                />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="ec-grid" style={{ marginTop: 18 }}>

          {/* ---- L'EXCEPTION D'ABORD ---- */}
          {worst && (
            <div className="ec-c12">
              <div className="ec-exc" role="status">
                <div className="ec-exc__in">
                  <span aria-hidden="true" className="ec-exc__ico">!</span>
                  <span style={{ minWidth: 0 }}>
                    <b className="ec-exc__t">
                      {late.length > 1
                        ? `${late.length} classes demandent votre attention`
                        : "Une classe demande votre attention"}
                    </b>
                    <span className="ec-exc__d">
                      <b>{worst.label}</b> accuse <b>{Math.abs(worst.weeks)} semaines de retard</b>
                      {" "}sur l'unité {worst.unit}
                      {late.length > 1 ? ` — et ${late.length - 1} autre${late.length > 2 ? "s" : ""} classe${late.length > 2 ? "s" : ""} sont en retard.` : "."}
                    </span>
                  </span>
                </div>
                {onOpenTab && (
                  <Button variant="ghost" size="sm" onClick={() => onOpenTab("students")}>
                    Ouvrir la console de l'école
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ---- Indicateurs ---- */}
          <div className="ec-c12">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 18 }}>
              <StatTile label="Élèves suivis" tint="green" value={studentCount}
                foot={`${evaluated} avec au moins un résultat`} />
              <StatTile label="Moyenne de l'école" tint="blue"
                value={schoolAvg == null ? "—" : fr(schoolAvg)}
                unit={schoolAvg == null ? "" : "/20"}>
                {trend.length > 1 && <Sparkline values={trend.map((t) => t.value)} />}
              </StatTile>
              <StatTile label="Élèves sous la moyenne" tint="amber" value={belowPass}
                foot={evaluated ? `${Math.round((belowPass / evaluated) * 100)} % des élèves évalués` : "aucun élève évalué"} />
              <StatTile label="Classes à rattraper" tint={late.length ? "crit" : "violet"} value={late.length}
                foot={heatRows.length ? `sur ${heatRows.length} classes suivies` : "couverture non renseignée"} />
            </div>
          </div>

          {/* ---- Carte de chaleur : le graphique signature ---- */}
          <Card className="ec-c8">
            <div className="ec-cardhd">
              <h2 className="ec-cardtitle">Avance et retard sur la répartition</h2>
            </div>
            <p style={{ fontSize: FONT.sm, color: COLORS.ink3, margin: "0 0 15px", lineHeight: 1.5 }}>
              Écart estimé en semaines entre les leçons réellement enseignées et le calendrier
              officiel, par classe et par unité.
            </p>
            {heatRows.length ? (
              <>
                <Heatmap rows={heatRows} columns={UNITS.map((u) => "U" + u)} />
                <div style={{
                  marginTop: 14, paddingTop: 13, borderTop: `1px solid ${COLORS.divider}`,
                  display: "flex", gap: 28, flexWrap: "wrap", fontSize: FONT.sm, color: COLORS.ink3,
                }}>
                  <span><b style={{ color: COLORS.good }}>{onTrack} classe{onTrack > 1 ? "s" : ""}</b> à jour ou en avance</span>
                  {late.length > 0 && (
                    <span>
                      <b style={{ color: COLORS.crit }}>{late.length} classe{late.length > 1 ? "s" : ""}</b> à rattraper
                      {" — "}{late.map((r) => r.label).join(", ")}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <EmptyState icon="🗓" title="Pas encore de leçons enseignées">
                Dès que les enseignants marqueront leurs leçons comme enseignées,
                l'écart au calendrier apparaîtra ici.
              </EmptyState>
            )}
          </Card>

          {/* ---- Aperçu des classes : collé à la carte de chaleur ----
               Le directeur lit l'écart au calendrier À GAUCHE et le niveau de
               maîtrise À DROITE, sur la même ligne. Séparés, les deux ne se
               répondaient pas : une classe en retard ET faible ne sautait pas
               aux yeux. La liste détaillée reste plus bas. */}
          <Card className="ec-c4">
            <div className="ec-cardhd">
              <h2 className="ec-cardtitle">Aperçu des classes</h2>
              {onOpenTab && <button className="ec-more ec-link" style={{ textDecoration: "none" }}
                onClick={() => onOpenTab("students")}>Résultats</button>}
            </div>

            {classTable.length ? (
              <div style={{ display: "grid", gap: 9 }}>
                {classTable.slice(0, 4).map((c) => {
                  const weak = (c.average_20 || 0) < 12;
                  // Comparaison par identifiant : l'ancienne version comparait
                  // l'étiquette d'une ligne au NOM de l'enseignant, donc jamais
                  // vraie — « en retard » ne s'affichait pour personne.
                  const behind = lateIds.has(c.teacher_id);
                  return (
                    <ListRow
                      key={c.teacher_id}
                      icon={weak ? "▼" : "▲"}
                      iconColor={weak ? COLORS.warn : undefined}
                      title={c.label || c.teacher_name || "Classe"}
                      meta={`${c.teacher_name || "—"} · ${c.students_evaluated || 0} élève${(c.students_evaluated || 0) > 1 ? "s" : ""}${behind ? " · en retard" : ""}`}
                      style={behind ? { borderColor: COLORS.warnBrd || "#E3CDA0", background: COLORS.warnBg } : undefined}
                      right={
                        <span style={{ textAlign: "right", display: "block", minWidth: 96 }}>
                          <b style={{ fontSize: FONT.md, color: weak ? COLORS.warn : COLORS.ink }}>
                            {c.average_20 == null ? "—" : `${fr(c.average_20)} / 20`}
                          </b>
                          <Meter value={c.average_20 || 0} max={20}
                            color={weak ? COLORS.warn : COLORS.g500} />
                        </span>
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState icon="📉" title="Aucun résultat saisi">
                Le niveau par classe apparaîtra après les premiers contrôles.
              </EmptyState>
            )}

            {/* ---- Leçon la plus manquée ----
                 Un taux d'échec élevé sur une leçon précise n'accuse pas
                 l'enseignant : il désigne une notion à réexpliquer, et parfois
                 une leçon à réécrire. */}
            <div style={{ borderTop: `1px solid ${COLORS.divider}`, paddingTop: 13 }}>
              <div style={{
                fontSize: FONT.xs, fontWeight: 800, letterSpacing: ".08em",
                textTransform: "uppercase", color: COLORS.ink3, marginBottom: 7,
              }}>
                Signalement pédagogique
              </div>
              {hardest === false ? (
                <p style={{ fontSize: FONT.sm, color: COLORS.ink3, lineHeight: 1.5 }}>
                  Signalement non activé : exécutez <strong>claude-hard-lessons.sql</strong> dans
                  Supabase. Sans cette vue, cet écran ne peut pas affirmer qu'aucune leçon ne pose
                  problème — il préfère le dire.
                </p>
              ) : hardest === null ? (
                <p style={{ fontSize: FONT.sm, color: COLORS.ink3 }}>Chargement…</p>
              ) : hardest ? (
                <p style={{ fontSize: FONT.sm, color: COLORS.ink2, lineHeight: 1.5 }}>
                  <b style={{ color: COLORS.ink }}>{hardest.title}</b> —{" "}
                  <b style={{ color: COLORS.crit }}>{Math.round(hardest.failRate * 100)} % d'échec</b>{" "}
                  sur {hardest.attempts} contrôle{hardest.attempts > 1 ? "s" : ""} dans l'école.
                  À reprendre en classe.
                </p>
              ) : (
                <p style={{ fontSize: FONT.sm, color: COLORS.ink3, lineHeight: 1.5 }}>
                  Aucune leçon ne dépasse 40 % d'échec. Ce bloc signalera la notion
                  à réexpliquer dès qu'une leçon décrochera.
                </p>
              )}
            </div>
          </Card>

          {/* ---- Évolution mensuelle ---- */}
          <Card className="ec-c5">
            <div className="ec-cardhd"><h2 className="ec-cardtitle">Évolution de la moyenne</h2></div>
            {trend.length > 1 ? (
              <LineChart
                points={trend.map((t) => t.value)}
                labels={trend.map((t) => t.label)}
                min={Math.max(0, Math.min(...trend.map((t) => t.value)) - 1)}
                max={Math.min(20, Math.max(...trend.map((t) => t.value)) + 1)}
                unit=" / 20"
              />
            ) : (
              <p style={{ fontSize: FONT.sm, color: COLORS.ink3, lineHeight: 1.5 }}>
                La courbe apparaîtra au deuxième mois de résultats. Un graphique à un
                point est moins parlant qu'un chiffre bien présenté.
              </p>
            )}
          </Card>

          {/* ---- Tableau des classes ---- */}
          <Card className="ec-c7" style={{ padding: 0, overflow: "hidden" }}>
            <div className="ec-cardhd" style={{ padding: "18px 18px 0", marginBottom: 12 }}>
              <h2 className="ec-cardtitle">Classes</h2>
              {onOpenTab && <button className="ec-more ec-link" style={{ textDecoration: "none" }}
                onClick={() => onOpenTab("students")}>Gérer</button>}
            </div>
            {classTable.length ? (
              <div style={{ overflowX: "auto" }}>
                <table className="ec-table">
                  <thead>
                    <tr>
                      <th scope="col">Classe</th>
                      <th scope="col">Enseignant</th>
                      <th scope="col" className="num">Évalués</th>
                      <th scope="col" className="num">Moyenne</th>
                      <th scope="col" className="num">Leçons</th>
                      <th scope="col">Avance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classTable.map((c) => (
                      <tr key={c.teacher_id}>
                        <td style={{ fontWeight: 700 }}>{c.label || "—"}</td>
                        <td>{c.teacher_name || "—"}</td>
                        <td className="num">{c.students_evaluated}</td>
                        <td className="num">{c.average_20 == null ? "—" : fr(Number(c.average_20))}</td>
                        <td className="num">{c.expected ? `${c.taught} / ${c.expected}` : "—"}</td>
                        <td>{weekTag(c.weeks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "0 18px 18px" }}>
                <EmptyState icon="🏫" title="Aucune classe évaluée">
                  Le tableau se remplira dès les premiers résultats saisis.
                </EmptyState>
              </div>
            )}
          </Card>

          {/* ---- Élèves à suivre ---- */}
          <Card className="ec-c5">
            <div className="ec-cardhd"><h2 className="ec-cardtitle">Élèves à suivre en priorité</h2></div>
            {atRisk.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {atRisk.map((s) => (
                  <ListRow
                    key={s.student_id}
                    icon={(s.full_name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    title={s.full_name}
                    meta={`Moyenne ${fr(Number(s.average_20))}/20 · ${s.evaluations} évaluation${s.evaluations > 1 ? "s" : ""}`}
                    right={<Badge tone={Number(s.average_20) < 8 ? "crit" : "warn"}>
                      {Number(s.average_20) < 8 ? "Critique" : "À surveiller"}
                    </Badge>}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon="🎉" title="Aucun élève sous 10 / 20">
                Rien à signaler pour l'instant.
              </EmptyState>
            )}
          </Card>

          {/* ---- Répartition des élèves ---- */}
          {evaluated > 0 && (
            <Card className="ec-c7">
              <div className="ec-cardhd"><h2 className="ec-cardtitle">Répartition des élèves</h2></div>
              <p style={{ fontSize: FONT.sm, color: COLORS.ink3, margin: "0 0 15px" }}>
                Nombre d'élèves par tranche de moyenne.
              </p>
              <Histogram bins={bins} emphasizeBelow={2} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: FONT.sm, color: COLORS.ink2 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: COLORS.neg, flex: "none" }} />
                <span><strong>{belowPass} élève{belowPass > 1 ? "s" : ""} sous la moyenne</strong></span>
              </div>
            </Card>
          )}

          {/* Transparence sur le coût réel de l'écran. */}
          <p className="ec-c12" style={{ fontSize: 11.5, color: COLORS.ink3, lineHeight: 1.6 }}>
            Indicateurs calculés côté base (vues d'agrégation) — {rowsRead.toLocaleString("fr-FR")} ligne
            {rowsRead > 1 ? "s" : ""} lue{rowsRead > 1 ? "s" : ""} au total, contre plusieurs milliers auparavant.
            L'écart au calendrier reste une estimation, dérivée du nombre de leçons marquées
            enseignées par unité : sa fiabilité dépend de la discipline de saisie des enseignants.
          </p>
        </div>
      )}
    </div>
  );
}
