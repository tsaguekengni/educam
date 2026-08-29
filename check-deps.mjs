// ============================================================================
// EduCam — filet « zone morte temporelle dans un tableau de dépendances ».
//
// POURQUOI CE FICHIER EXISTE
// Le 2026-08-15, l'écran de SAISIE DES RÉSULTATS était totalement inouvrable :
//
//     Cannot access 'hasLesson' before initialization
//
// `hasLesson` était déclaré avec `const`, quatre-vingts lignes SOUS le
// `useEffect` dont le tableau de dépendances le cite. Or ce tableau est un
// argument : il est évalué PENDANT le rendu, avant que la ligne `const` ne soit
// atteinte. La variable est alors dans la zone morte temporelle et toute
// lecture lève une ReferenceError. Le composant ne rendait jamais.
//
// `npx next build` ne le voit pas — il compile, il n'exécute pas le rendu.
// `no-undef` ne le voit pas non plus — l'identifiant EST défini, plus bas.
// `no-use-before-define` d'ESLint le voit, mais signale en même temps toutes
// les fonctions fléchées citées à l'intérieur d'un effet — 19 fausses alertes
// pour une vraie, sur ce dépôt. Un filet qui crie tout le temps ne sert à rien.
//
// Ce script ne regarde donc QUE les tableaux de dépendances : le seul endroit
// où une déclaration trop tardive fait vraiment planter l'écran.
//
// À LANCER AVANT CHAQUE LIVRAISON, depuis la racine :
//     node check-deps.mjs
// Attendu : « Aucune dépendance déclarée trop tard. »
//
// LIMITE ASSUMÉE : l'analyse est textuelle, pas syntaxique. Elle compare des
// positions dans le fichier, sans construire les portées. Deux composants d'un
// même fichier qui utilisent le même nom de variable peuvent donc produire une
// fausse alerte. C'est le bon sens du compromis : une fausse alerte se lit en
// dix secondes, un écran mort en pleine présentation coûte beaucoup plus.
// ============================================================================

import fs from 'fs';
import path from 'path';

const RACINE = 'src';
const MOTS = new Set([
  'true', 'false', 'null', 'undefined', 'window', 'document', 'console',
  'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date',
]);

/** Tous les .js sous `src`, en ignorant les dossiers de build. */
function fichiers(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) fichiers(p, acc);
    else if (e.name.endsWith('.js') || e.name.endsWith('.jsx')) acc.push(p);
  }
  return acc;
}

const ligneDe = (src, i) => src.slice(0, i).split('\n').length;

let problemes = 0;

for (const f of fichiers(RACINE)) {
  const src = fs.readFileSync(f, 'utf8');

  // Où chaque nom est-il déclaré par `const` / `let` / `var` ? On garde la
  // PREMIÈRE déclaration : c'est elle qui borne la zone morte.
  const declaration = new Map();
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    if (!declaration.has(m[1])) declaration.set(m[1], m.index);
  }

  // Les tableaux de dépendances : `}, [a, b, c]);` en fin de hook.
  for (const m of src.matchAll(/\}\s*,\s*\[([^\]]*)\]\s*\)/g)) {
    const positionTableau = m.index;
    for (const brut of m[1].split(',')) {
      // On ne garde que l'identifiant de tête : `props.a?.b` dépend de `props`.
      const nom = brut.trim().split(/[.?[\s]/)[0];
      if (!nom || MOTS.has(nom) || !/^[A-Za-z_$][\w$]*$/.test(nom)) continue;

      const posDecl = declaration.get(nom);
      if (posDecl !== undefined && posDecl > positionTableau) {
        problemes++;
        console.log(
          `${f}:${ligneDe(src, positionTableau)}  « ${nom} » est cité dans un ` +
          `tableau de dépendances mais déclaré ligne ${ligneDe(src, posDecl)}.`
        );
        console.log(
          '    → Le tableau est évalué pendant le rendu : ReferenceError. ' +
          'Remontez la déclaration au-dessus du hook.'
        );
      }
    }
  }
}

if (problemes) {
  console.log(`\n✖ ${problemes} dépendance(s) déclarée(s) trop tard.`);
  process.exit(1);
}
console.log('✓ Aucune dépendance déclarée trop tard.');
