"use client";
// EduCam — Quiz de préparation de l'enseignant.
//
// Refonte du 2026-08-12 (lot E). Trois constats de l'audit sont corrigés ici :
//
//  1. RUPTURE DE MARQUE (§8) — l'écran basculait en violet `#7C3AED` avec une
//     action secondaire en bleu `#3B82F6`, en plein parcours vert. Il donnait
//     l'impression d'appartenir à un autre produit. Tout passe aux jetons.
//  2. OPTIONS DE QCM EN `<div>` (§3) — ni `role="radio"`, ni `aria-checked`, ni
//     activation clavier. Ce sont désormais de vrais `<input type="radio">`
//     dans un `<fieldset>` : la navigation par flèches, la sélection à l'espace
//     et l'annonce « 2 sur 4 » viennent gratuitement du navigateur.
//  3. TOUT SUR UN ÉCRAN (§8) — les questions occupent 8 colonnes, un panneau
//     d'avancement collant occupe les 4 autres : on voit toujours où l'on en
//     est et le bouton de validation sans avoir à redescendre.
//
// Le vert et le rouge de statut gardent leur sens (réussi / à revoir) et sont
// toujours accompagnés d'un mot — jamais de la couleur seule.

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { COLORS, FONT } from "../lib/theme";
import { Card, Button, Badge, EmptyState, SkeletonRows, Meter, Callout } from "../components/ui";

const PASS_RATIO = 0.8;
const LETTERS = ["A", "B", "C", "D"];

export default function ReadinessQuiz({ lesson, teacherId, onPass, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alreadyPassed, setAlreadyPassed] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    checkExistingResult();
    fetchQuestions();
    /* eslint-disable-next-line */
  }, [lesson.id]);

  const checkExistingResult = async () => {
    // `maybeSingle` et non `single` : sans résultat, `single` renvoie une erreur
    // (406) alors que « pas encore passé le quiz » est le cas nominal.
    const { data } = await supabase
      .from("teacher_readiness")
      .select("passed")
      .eq("teacher_id", teacherId)
      .eq("lesson_id", lesson.id)
      .eq("passed", true)
      .maybeSingle();
    if (data) setAlreadyPassed(true);
  };

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("readiness_questions")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("question_order");
    setQuestions(data || []);
    setLoading(false);
  };

  const handleAnswer = (questionId, answer) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    const correct = questions.filter((q) => answers[q.id] === q.correct_answer).length;
    const didPass = correct / questions.length >= PASS_RATIO;
    setScore(correct);
    setPassed(didPass);
    setSubmitted(true);
    setSaveError("");
    try {
      const { error } = await supabase.from("teacher_readiness").upsert({
        teacher_id: teacherId,
        lesson_id: lesson.id,
        score: correct,
        total_questions: questions.length,
        passed: didPass,
        completed_at: new Date().toISOString(),
      }, { onConflict: "teacher_id,lesson_id" });
      if (error) throw error;
    } catch (_) {
      // L'enregistrement échouait en silence : l'enseignant croyait sa
      // préparation validée alors qu'elle n'était pas enregistrée.
      setSaveError("Votre résultat n'a pas pu être enregistré. Il le sera à la prochaine tentative en ligne.");
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setPassed(false);
    setSaveError("");
  };

  const backLink = (
    <button onClick={onBack} className="ec-link"
      style={{ minHeight: 40, marginBottom: 14, textDecoration: "none", color: COLORS.ink2 }}>
      ‹ Retour à la leçon
    </button>
  );

  /* ----------------------------- Chargement ------------------------------ */
  if (loading) {
    return <div>{backLink}<h1 className="ec-h1">Quiz de préparation</h1><div style={{ marginTop: 20 }}><SkeletonRows rows={3} /></div></div>;
  }

  /* --------------------- Aucun quiz : on laisse passer -------------------- */
  if (questions.length === 0) {
    return (
      <div>
        {backLink}
        <h1 className="ec-h1">Quiz de préparation</h1>
        <p className="ec-sub">{lesson.title}</p>
        <Card style={{ marginTop: 18 }}>
          <EmptyState icon="📖" title="Aucun quiz de préparation"
            action={<Button onClick={onPass}>Accéder à la leçon</Button>}>
            Le quiz n'a pas encore été créé pour cette leçon. Vous pouvez l'ouvrir directement.
          </EmptyState>
        </Card>
      </div>
    );
  }

  /* ------------------------- Déjà validé --------------------------------- */
  if (alreadyPassed && !submitted) {
    return (
      <div>
        {backLink}
        <h1 className="ec-h1">Préparation validée</h1>
        <p className="ec-sub">{lesson.title}</p>
        <Card style={{ marginTop: 18 }}>
          <EmptyState icon="✅" title="Vous avez déjà validé cette leçon"
            action={<Button onClick={onPass}>Ouvrir la leçon</Button>}>
            Votre préparation est enregistrée. Vous pouvez refaire le quiz si vous le souhaitez.
          </EmptyState>
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button className="ec-link" onClick={handleRetry} style={{ fontSize: FONT.sm }}>
              Refaire le quiz
            </button>
          </div>
        </Card>
      </div>
    );
  }

  /* ------------------------------ Résultat -------------------------------- */
  if (submitted) {
    const percentage = Math.round((score / questions.length) * 100);
    const tone = passed ? COLORS.good : COLORS.crit;

    return (
      <div>
        {backLink}
        <h1 className="ec-h1">{passed ? "Préparation validée" : "Préparation à revoir"}</h1>
        <p className="ec-sub">{lesson.title}</p>

        <div className="ec-grid" style={{ marginTop: 18 }}>
          <Card className="ec-c4" style={{ alignSelf: "start", textAlign: "center" }}>
            <div aria-hidden="true" style={{
              width: 132, height: 132, borderRadius: "50%", margin: "6px auto 16px",
              border: `6px solid ${tone}`, display: "grid", placeItems: "center",
            }}>
              <div>
                <div style={{ fontSize: FONT.xxl, fontWeight: 800, color: tone, lineHeight: 1 }}>{percentage}%</div>
                <div style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 4 }}>{score}/{questions.length}</div>
              </div>
            </div>
            {/* Le mot porte l'information ; la couleur ne fait que la renforcer. */}
            <Badge tone={passed ? "brand" : "crit"}>
              {passed ? "Réussi" : `Il faut ${Math.round(PASS_RATIO * 100)} %`}
            </Badge>
            <p style={{ fontSize: FONT.sm, color: COLORS.ink3, lineHeight: 1.55, margin: "14px 0 16px" }}>
              {passed
                ? "Vous pouvez présenter cette leçon à vos élèves."
                : "Relisez le contenu de la leçon, puis réessayez."}
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {passed
                ? <Button block onClick={onPass}>Ouvrir la leçon</Button>
                : <Button block onClick={handleRetry}>Réessayer le quiz</Button>}
              <Button variant="ghost" block onClick={onBack}>
                {passed ? "Retour" : "Revoir la leçon"}
              </Button>
            </div>
            {saveError && (
              <Callout tone="warn" icon="⚠" style={{ marginTop: 12, textAlign: "left" }}>{saveError}</Callout>
            )}
          </Card>

          <div className="ec-c8">
            <Card>
              <div className="ec-cardhd"><h2 className="ec-cardtitle">Correction</h2></div>
              <div style={{ display: "grid", gap: 8 }}>
                {questions.map((q, i) => {
                  const userAnswer = answers[q.id];
                  const ok = userAnswer === q.correct_answer;
                  const options = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
                  return (
                    <div key={q.id} style={{
                      background: ok ? COLORS.g50 : COLORS.critBg,
                      border: `1px solid ${ok ? COLORS.g200 : COLORS.critBrd}`,
                      borderLeft: `3px solid ${ok ? COLORS.good : COLORS.crit}`,
                      borderRadius: 9, padding: "12px 14px",
                    }}>
                      <div style={{ fontSize: FONT.md, fontWeight: 700, color: COLORS.ink, marginBottom: 5 }}>
                        {i + 1}. {q.question}
                      </div>
                      <div style={{ fontSize: FONT.md, color: ok ? COLORS.good : COLORS.crit, fontWeight: 650 }}>
                        <span aria-hidden="true">{ok ? "✓ " : "✗ "}</span>
                        {ok ? "Bonne réponse" : "Réponse incorrecte"} :{" "}
                        <span style={{ fontWeight: 500 }}>{options[userAnswer] || "pas de réponse"}</span>
                      </div>
                      {!ok && (
                        <div style={{ fontSize: FONT.md, color: COLORS.ink2, marginTop: 4 }}>
                          Attendu : <strong>{options[q.correct_answer]}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------- Quiz ---------------------------------- */
  const answered = Object.keys(answers).length;
  const allAnswered = answered === questions.length;

  return (
    <div>
      {backLink}
      <h1 className="ec-h1">Quiz de préparation</h1>
      <p className="ec-sub">{lesson.title}</p>

      <div className="ec-grid" style={{ marginTop: 18 }}>
        {/* ---- Questions ---- */}
        <div className="ec-c8" style={{ display: "grid", gap: 12 }}>
          {questions.map((q, i) => (
            <Card key={q.id}>
              {/* Un vrai groupe de boutons radio : le navigateur fournit la
                  navigation aux flèches et annonce « n sur 4 ». */}
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{
                  fontSize: FONT.base, fontWeight: 700, color: COLORS.ink,
                  marginBottom: 12, lineHeight: 1.4,
                }}>
                  {i + 1}. {q.question}
                </legend>
                <div style={{ display: "grid", gap: 8 }}>
                  {LETTERS.map((letter) => {
                    const optionText = q[`option_${letter.toLowerCase()}`];
                    if (!optionText) return null;
                    const selected = answers[q.id] === letter;
                    const id = `q${q.id}-${letter}`;
                    return (
                      <label key={letter} htmlFor={id} className="ec-choice" data-selected={selected}
                        style={{ cursor: "pointer", minHeight: 44 }}>
                        <input
                          type="radio"
                          id={id}
                          name={`q-${q.id}`}
                          className="ec-sr"
                          checked={selected}
                          onChange={() => handleAnswer(q.id, letter)}
                        />
                        <span aria-hidden="true" style={{
                          width: 26, height: 26, borderRadius: "50%", flex: "none",
                          border: `2px solid ${selected ? COLORS.g500 : COLORS.border2}`,
                          background: selected ? COLORS.g500 : COLORS.card,
                          color: selected ? "#fff" : COLORS.ink3,
                          display: "grid", placeItems: "center",
                          fontSize: FONT.sm, fontWeight: 700,
                        }}>
                          {letter}
                        </span>
                        <span style={{ fontSize: FONT.md, color: COLORS.ink }}>{optionText}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </Card>
          ))}
        </div>

        {/* ---- Panneau d'avancement, collant ---- */}
        <div className="ec-c4">
          <Card style={{ position: "sticky", top: 18 }}>
            <div className="ec-cardhd"><h2 className="ec-cardtitle">Votre avancement</h2></div>
            <div style={{ fontSize: FONT.xxl, fontWeight: 800, lineHeight: 1, letterSpacing: "-.03em" }}>
              {answered}
              <span style={{ fontSize: FONT.base, color: COLORS.ink3, fontWeight: 600 }}> / {questions.length}</span>
            </div>
            <div style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 5 }}>
              question{questions.length > 1 ? "s" : ""} répondue{answered > 1 ? "s" : ""}
            </div>
            <Meter value={answered} max={questions.length} label={`${answered} sur ${questions.length}`} />

            <p style={{ fontSize: FONT.sm, color: COLORS.ink3, lineHeight: 1.5, margin: "14px 0 14px" }}>
              Il faut au moins <strong>{Math.round(PASS_RATIO * 100)} %</strong> de bonnes
              réponses pour valider votre préparation. Vous pouvez réessayer autant de fois
              que nécessaire.
            </p>

            <Button block onClick={handleSubmit} disabled={!allAnswered}>
              Valider mes réponses
            </Button>
            {!allAnswered && (
              <p aria-live="polite" style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 9, textAlign: "center" }}>
                Il reste {questions.length - answered} question{questions.length - answered > 1 ? "s" : ""} sans réponse.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
