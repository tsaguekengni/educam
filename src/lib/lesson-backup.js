// EduCam — filet de sécurité de l'édition de leçon.
//
// POURQUOI CE FICHIER EXISTE
// Les deux éditeurs de la plateforme enregistrent une leçon de la même façon :
// ils SUPPRIMENT sections, blocs, exercices et questions de quiz, puis les
// réinsèrent. Une coupure réseau au milieu — le cas nominal sur le terrain —
// laisse la leçon amputée, sans le moindre avertissement.
//
// Le filet (instantané avant suppression + restauration automatique) existait
// depuis le 2026-08-11, mais UNIQUEMENT dans le lecteur de leçon
// (`dashboard.js`). La console de contenu (`admin.js`), qui est justement
// l'écran où l'on édite le plus, n'en avait pas. Constaté le 2026-08-13.
//
// Il vit donc ici, écrit une seule fois, utilisé par les deux.

import { supabase } from "./supabase";

const backupKey = (lessonId) => `educam_lesson_backup_${lessonId}`;

/** Copie fidèle du contenu actuel de la leçon, tel qu'il est en base. */
export async function snapshotLesson(lessonId) {
  const [{ data: sections }, { data: exercises }, { data: quiz }] = await Promise.all([
    supabase.from("lesson_sections").select("*").eq("lesson_id", lessonId).order("section_order"),
    supabase.from("exercises").select("*").eq("lesson_id", lessonId).order("exercise_order"),
    supabase.from("readiness_questions").select("*").eq("lesson_id", lessonId).order("question_order"),
  ]);
  const ids = (sections || []).map((x) => x.id);
  let blocks = [];
  if (ids.length) {
    const { data } = await supabase.from("section_blocks").select("*").in("section_id", ids).order("block_order");
    blocks = data || [];
  }
  return {
    lessonId,
    at: Date.now(),
    sections: sections || [],
    blocks,
    exercises: exercises || [],
    quiz: quiz || [],
  };
}

/**
 * Réinjecte un instantané. Les identifiants de section changent à la
 * réinsertion : chaque bloc est donc remappé vers sa nouvelle section.
 */
export async function restoreLesson(snap) {
  const lessonId = snap.lessonId;
  await supabase.from("lesson_sections").delete().eq("lesson_id", lessonId);
  await supabase.from("exercises").delete().eq("lesson_id", lessonId);
  await supabase.from("readiness_questions").delete().eq("lesson_id", lessonId);

  const idMap = {};
  if (snap.sections.length) {
    const rows = snap.sections.map(({ id, created_at, ...rest }) => rest);
    const { data: newSections, error } = await supabase.from("lesson_sections").insert(rows).select();
    if (error) throw error;
    snap.sections.forEach((old, i) => { idMap[old.id] = newSections[i]?.id; });
  }
  if (snap.blocks.length) {
    const rows = snap.blocks
      .map(({ id, created_at, section_id, ...rest }) => ({ ...rest, section_id: idMap[section_id] }))
      .filter((b) => b.section_id);
    if (rows.length) {
      const { error } = await supabase.from("section_blocks").insert(rows);
      if (error) throw error;
    }
  }
  if (snap.exercises.length) {
    const rows = snap.exercises.map(({ id, created_at, ...rest }) => rest);
    const { error } = await supabase.from("exercises").insert(rows);
    if (error) throw error;
  }
  if (snap.quiz.length) {
    const rows = snap.quiz.map(({ id, created_at, ...rest }) => rest);
    const { error } = await supabase.from("readiness_questions").insert(rows);
    if (error) throw error;
  }
}

/**
 * Prend l'instantané ET le dépose hors mémoire — le navigateur peut être fermé
 * entre la suppression et la réinsertion. Renvoie `null` si l'instantané n'a pas
 * pu être pris : dans ce cas l'appelant DOIT renoncer à enregistrer, parce qu'il
 * n'aurait plus rien pour réparer.
 */
export async function takeBackup(lessonId) {
  const snap = await snapshotLesson(lessonId);
  try { localStorage.setItem(backupKey(lessonId), JSON.stringify(snap)); } catch (_) {}
  return snap;
}

/** L'enregistrement est passé : l'instantané n'a plus lieu d'être. */
export function clearBackup(lessonId) {
  try { localStorage.removeItem(backupKey(lessonId)); } catch (_) {}
}

/**
 * Tente la restauration. Renvoie `true` si la leçon est revenue à son état
 * d'origine, `false` si la restauration a échoué elle aussi — auquel cas la
 * copie de sécurité est CONSERVÉE et l'utilisateur doit être averti de ne pas
 * fermer la page.
 */
export async function rollback(snap) {
  if (!snap) return false;
  try {
    await restoreLesson(snap);
    clearBackup(snap.lessonId);
    return true;
  } catch (_) {
    return false;
  }
}

/** Une copie de sécurité oubliée signale un enregistrement interrompu. */
export function pendingBackup(lessonId) {
  try {
    const raw = localStorage.getItem(backupKey(lessonId));
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}
