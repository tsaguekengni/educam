// EduCam — filet « identifiant non défini » ET « utilisé avant sa déclaration ».
//
// POURQUOI CE FICHIER EXISTE
// Le 2026-08-13, `fmtDate is not defined` a planté la console superadmin EN
// PRODUCTION. Ni `npx next build` ni `npx eslint src` ne l'avaient vu :
//   · le build COMPILE, il n'exécute pas le rendu ;
//   · la configuration eslint du projet n'active PAS la règle `no-undef`.
// Le même balayage a immédiatement révélé quatre autres appels orphelins
// (`backupKey`, `restoreLesson`) laissés par un refactor.
//
// 2026-08-15 — un SECOND filet a été ajouté à côté : `check-deps.mjs`.
// `Cannot access 'hasLesson' before initialization` a rendu l'écran de SAISIE
// DES RÉSULTATS totalement inouvrable : la variable était déclarée 80 lignes
// SOUS le tableau de dépendances d'un `useEffect` qui la cite, or ce tableau
// est évalué PENDANT le rendu. Zone morte temporelle du `const`.
//
// `no-use-before-define` d'ESLint ne convient PAS ici : il signale aussi les
// fonctions fléchées citées à l'INTÉRIEUR d'un effet, qui s'exécutent après le
// rendu et ne posent aucun problème. Il remontait 20 erreurs dont 19 fausses,
// ce qui aurait détruit la valeur du « 0 erreur » de ce fichier.
// `check-deps.mjs` ne regarde que les TABLEAUX DE DÉPENDANCES — le seul endroit
// où la zone morte fait vraiment planter.
//
// À LANCER AVANT CHAQUE LIVRAISON, depuis la racine du dépôt :
//   npx eslint src --config eslint.undef.mjs
// Attendu : « 0 errors ». Les avertissements « Unused eslint-disable » sont sans
// conséquence.
//
// Note : supprimer `src/.next` avant de lancer, sinon les fichiers compilés
// polluent le rapport (ils apparaissent si un build a été lancé depuis `src/`).

const BROWSER = ["window","document","navigator","localStorage","sessionStorage","fetch","console",
  "setTimeout","clearTimeout","setInterval","clearInterval","URL","Blob","FormData","alert","confirm",
  "caches","indexedDB","Image","File","FileReader","matchMedia","location","history","requestAnimationFrame",
  "performance","crypto","AbortController","Event","CustomEvent","Notification","screen","btoa","atob",
  "TextEncoder","TextDecoder","structuredClone","process","React","globalThis","module","require","__dirname"];
const g = Object.fromEntries(BROWSER.map((k) => [k, "readonly"]));
export default [
  { files: ["**/*.js", "**/*.mjs"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } }, globals: g },
    rules: { "no-undef": "error" } },
];
