/* ══════════════════════════════════════════════════════════════════════════
 * LE SEUIL D'ALERTE — un seul endroit. 2026-10-14.
 *
 * Décision de Maxime : **60 % et en dessous** déclenche l'alerte au parent,
 * et **3/5 est compris dedans**. Avant, la règle était « strictement sous
 * 50 % », écrite `score / total < 0.5` — et RECOPIÉE à cinq endroits dans
 * l'application. Un seuil recopié est un seuil qui finit par diverger : deux
 * écrans qui ne disent pas la même chose du même enfant. C'est ce fichier qui
 * porte la règle, et rien d'autre.
 *
 * 🔴 La comparaison se fait en NOMBRES ENTIERS, jamais en décimales :
 *
 *       score / total ≤ 60 %     ⟺     score × 100 ≤ total × 60
 *
 * Écrite `score / total <= 0.6`, elle tient pour un total de 5 ou de 10, mais
 * d'autres totaux tombent sur un arrondi binaire et le seuil se déplace d'un
 * cheveu — invisible en relecture, faux en classe. Avec des entiers, il n'y a
 * rien à arrondir.
 *
 * À vérifier de tête : 3/5 → 300 ≤ 300 OUI · 4/5 → 400 ≤ 300 NON ·
 *                      6/10 → 600 ≤ 600 OUI · 7/10 → 700 ≤ 600 NON.
 *
 * ⚠️ UN SEUL autre endroit porte la même règle, et il est en base : la vue
 * `educam_hard_lessons` (SQL). La fonction d'alerte du soir, elle, ne calcule
 * rien du tout — elle lit la colonne `daily_results.difficulty`, écrite à la
 * saisie par `aSignaler` ci-dessous. Changer le seuil, c'est donc : cette
 * constante, la vue, et le document des familles. Rien de plus.
 *
 * ⚠️ `difficulty` est figée AU MOMENT DE LA SAISIE. Les notes déjà en base
 * gardent la valeur calculée avec l'ancien seuil : la nouvelle règle vaut pour
 * ce qui est saisi à partir de maintenant.
 * ════════════════════════════════════════════════════════════════════════ */

/** Le seuil, en pourcentage. « Et en dessous » : 60 déclenche. */
export const SEUIL_ALERTE_POURCENT = 60;

/**
 * La leçon est-elle à signaler au parent, pour cette note ?
 * Renvoie `false` quand la note est absente ou le total nul — un élève absent
 * n'est PAS un élève en difficulté, et n'a jamais de zéro.
 */
export function aSignaler(score, total) {
  /* 🔴 `Number(null)` et `Number("")` valent ZÉRO, et zéro est un nombre fini.
     Sans ces deux lignes, un élève ABSENT — note vide — serait signalé à son
     parent comme un élève à 0/5. C'est la règle la plus ancienne du projet :
     absent n'est pas zéro. Attrapé par le contrôle `seuil.mjs`, pas à l'œil. */
  if (score === null || score === undefined || score === "") return false;
  if (total === null || total === undefined || total === "") return false;
  const s = Number(score);
  const t = Number(total);
  if (!Number.isFinite(s) || !Number.isFinite(t) || t <= 0) return false;
  return s * 100 <= t * SEUIL_ALERTE_POURCENT;
}

/**
 * La même règle quand on n'a plus que le pourcentage sous la main (les écrans
 * de lecture du parent le calculent une fois pour toutes).
 */
export function aSignalerPourcent(p) {
  /* Même piège que ci-dessus : un pourcentage ABSENT n'est pas un zéro. */
  if (p === null || p === undefined || p === "") return false;
  const v = Number(p);
  return Number.isFinite(v) && v <= SEUIL_ALERTE_POURCENT;
}
