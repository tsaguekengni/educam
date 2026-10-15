// EduCam — détection d'une nouvelle version déployée (2026-10-15).
//
// `BUILD_ID` est figé dans le code au moment de la construction (next.config.mjs
// → identifiant du commit sur Vercel). `/api/version` répond celui de la
// version actuellement en ligne. S'ils diffèrent, la page tourne sur un code
// périmé.

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "local";

/**
 * L'identifiant de la version en ligne si elle est PLUS RÉCENTE que le code de
 * cette page, `null` sinon — y compris hors ligne ou en cas d'erreur : dans le
 * doute, on ne recharge JAMAIS.
 */
export async function nouvelleVersionEnLigne() {
  if (BUILD_ID === "local") return null;
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch("/api/version", { cache: "no-store", signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const { v } = await res.json();
    return v && v !== "local" && v !== BUILD_ID ? String(v) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Garde-fou contre une boucle de rechargements : on ne recharge qu'UNE fois
 * par version annoncée et par onglet. Si le rechargement ne suffit pas à
 * obtenir le nouveau code (propagation du déploiement, cache récalcitrant),
 * on ne recommence pas en boucle. La version suivante, elle, aura sa chance.
 */
export function rechargementDejaTente(version) {
  try { return sessionStorage.getItem("educam_maj_tentee") === version; } catch (_) { return true; }
}
export function noterRechargementTente(version) {
  try { sessionStorage.setItem("educam_maj_tentee", version); } catch (_) { /* navigation privée */ }
}
