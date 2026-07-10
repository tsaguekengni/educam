"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function ReadinessQuiz({ lesson, teacherId, onPass, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alreadyPassed, setAlreadyPassed] = useState(false);

  useEffect(() => {
    checkExistingResult();
    fetchQuestions();
  }, [lesson.id]);

  const checkExistingResult = async () => {
    const { data } = await supabase
      .from("teacher_readiness")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("lesson_id", lesson.id)
      .eq("passed", true)
      .single();

    if (data) {
      setAlreadyPassed(true);
    }
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
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) correct++;
    });

    const total = questions.length;
    const didPass = correct / total >= 0.8;

    setScore(correct);
    setPassed(didPass);
    setSubmitted(true);

    // Save result (upsert)
    await supabase.from("teacher_readiness").upsert({
      teacher_id: teacherId,
      lesson_id: lesson.id,
      score: correct,
      total_questions: total,
      passed: didPass,
      completed_at: new Date().toISOString(),
    }, { onConflict: "teacher_id,lesson_id" });
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setPassed(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <p style={{ color: "#6B7280" }}>Chargement du quiz...</p>
      </div>
    );
  }

  // No quiz questions — let them through
  if (questions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          Aucun quiz de préparation
        </h2>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
          Le quiz de préparation n'a pas encore été créé pour cette leçon.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onBack} style={{
            padding: "12px 24px", background: "white", border: "1px solid #D1D5DB",
            borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
          }}>← Retour</button>
          <button onClick={onPass} style={{
            padding: "12px 24px", background: "#0F4C35", color: "white",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}>Accéder à la leçon →</button>
        </div>
      </div>
    );
  }

  // Already passed
  if (alreadyPassed && !submitted) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          Préparation validée
        </h2>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
          Vous avez déjà validé votre préparation pour cette leçon.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onBack} style={{
            padding: "12px 24px", background: "white", border: "1px solid #D1D5DB",
            borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
          }}>← Retour</button>
          <button onClick={onPass} style={{
            padding: "12px 24px", background: "#0F4C35", color: "white",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}>Ouvrir la leçon →</button>
        </div>
      </div>
    );
  }

  // Results screen
  if (submitted) {
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{passed ? "🎉" : "📚"}</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
          {passed ? "Félicitations!" : "Continuez à réviser"}
        </h2>

        <div style={{
          width: 120, height: 120, borderRadius: "50%", margin: "20px auto",
          border: `6px solid ${passed ? "#10B981" : "#EF4444"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column"
        }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: passed ? "#10B981" : "#EF4444" }}>
            {percentage}%
          </div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>{score}/{questions.length}</div>
        </div>

        {passed ? (
          <div>
            <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 24, lineHeight: 1.6 }}>
              Vous avez validé votre préparation pour cette leçon.
              Vous pouvez maintenant la présenter à vos élèves.
            </p>
            <button onClick={onPass} style={{
              padding: "14px 32px", background: "#0F4C35", color: "white",
              border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer"
            }}>Ouvrir la leçon →</button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 8, lineHeight: 1.6 }}>
              Vous avez besoin d'au moins 80% pour valider votre préparation.
            </p>
            <p style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 24 }}>
              Relisez attentivement le contenu de la leçon et réessayez.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={onBack} style={{
                padding: "12px 24px", background: "white", border: "1px solid #D1D5DB",
                borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
              }}>← Revoir la leçon</button>
              <button onClick={handleRetry} style={{
                padding: "12px 24px", background: "#3B82F6", color: "white",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer"
              }}>Réessayer le quiz</button>
            </div>
          </div>
        )}

        {/* Show correct answers */}
        <div style={{ marginTop: 32, textAlign: "left" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
            Correction
          </h3>
          {questions.map((q, i) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correct_answer;
            const options = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };

            return (
              <div key={q.id} style={{
                background: isCorrect ? "#F0FDF4" : "#FEF2F2",
                border: `1px solid ${isCorrect ? "#BBF7D0" : "#FECACA"}`,
                borderRadius: 8, padding: "12px 14px", marginBottom: 8
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                  {i + 1}. {q.question}
                </div>
                <div style={{ fontSize: 13, color: isCorrect ? "#16A34A" : "#DC2626" }}>
                  {isCorrect ? "✓ " : "✗ "}
                  Votre réponse: {options[userAnswer] || "Pas de réponse"}
                  {!isCorrect && (
                    <span style={{ color: "#16A34A" }}> — Bonne réponse: {options[q.correct_answer]}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Quiz screen
  const allAnswered = questions.every(q => answers[q.id]);

  return (
    <div>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #7C3AED15, #7C3AED05)",
        border: "1px solid #7C3AED30", borderRadius: 12, padding: "20px", marginBottom: 24
      }}>
        <div style={{ fontSize: 12, color: "#7C3AED", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Quiz de préparation
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "4px 0 8px" }}>
          {lesson.title}
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.5 }}>
          Répondez à {questions.length} questions sur le contenu de cette leçon.
          Vous devez obtenir au moins 80% pour valider votre préparation.
        </p>
      </div>

      {/* Questions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {questions.map((q, i) => (
          <div key={q.id} style={{
            background: "white", borderRadius: 10, border: "1px solid #E5E7EB", padding: "18px"
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1F2937", marginBottom: 12 }}>
              {i + 1}. {q.question}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["A", "B", "C", "D"].map(letter => {
                const optionText = q[`option_${letter.toLowerCase()}`];
                const isSelected = answers[q.id] === letter;
                return (
                  <div key={letter}
                    onClick={() => handleAnswer(q.id, letter)}
                    style={{
                      padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                      border: `1.5px solid ${isSelected ? "#7C3AED" : "#E5E7EB"}`,
                      background: isSelected ? "#7C3AED08" : "white",
                      display: "flex", alignItems: "center", gap: 10,
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      border: `2px solid ${isSelected ? "#7C3AED" : "#D1D5DB"}`,
                      background: isSelected ? "#7C3AED" : "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: isSelected ? "white" : "#6B7280"
                    }}>{letter}</div>
                    <span style={{ fontSize: 14, color: "#1F2937" }}>{optionText}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Progress + Submit */}
      <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{
          padding: "12px 20px", background: "white", border: "1px solid #D1D5DB",
          borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer"
        }}>← Retour</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, color: "#6B7280" }}>
            {Object.keys(answers).length}/{questions.length} réponses
          </span>
          <button onClick={handleSubmit} disabled={!allAnswered}
            style={{
              padding: "12px 28px",
              background: allAnswered ? "#7C3AED" : "#D1D5DB",
              color: "white", border: "none", borderRadius: 8,
              fontSize: 14, fontWeight: 700,
              cursor: allAnswered ? "pointer" : "default"
            }}>
            Valider mes réponses
          </button>
        </div>
      </div>
    </div>
  );
}