// Assemble fiche.html = entête de la plaquette (police Inter incluse)
//                      + feuille du protocole + additions de l'offre + corps.
// Première commande de la chaîne. fiche.html est engendré, jamais édité :
// le seul fichier de contenu à modifier est _corps-fiche.html ; la mise en forme
// propre à l'offre vit dans _style-offre-extra.css.
//
// Les ressources partagées (entête Inter, feuille de base) sont RÉUTILISÉES
// depuis ../protocole — on ne les duplique pas, exactement comme le protocole
// prolonge la feuille de la plaquette.
import { readFileSync, writeFileSync } from 'node:fs';

const entete = readFileSync('../protocole/_entete-plaquette.txt', 'utf8');
const base   = readFileSync('../protocole/_style-protocole.css', 'utf8');
const extra  = readFileSync('_style-offre-extra.css', 'utf8');
const corps  = readFileSync('_corps-fiche.html', 'utf8');
const style  = base + '\n' + extra;

// La feuille doit être GREFFÉE À L'INTÉRIEUR du <style> de l'entête, en dernier,
// pour avoir le dernier mot dans la cascade (notamment sur @page{margin:0}).
const i = entete.lastIndexOf('</style>');
if (i === -1) throw new Error('_entete-plaquette.txt : balise </style> introuvable');

const html = entete.slice(0, i) + '\n\n' + style + '\n' + entete.slice(i)
           + '\n' + corps + '\n';

writeFileSync('fiche.html', html);

const n = (html.match(/<\/style>/g) || []).length;
if (n !== 1) throw new Error(`fiche.html : ${n} balises </style>, attendu 1`);
console.log(`✓ fiche.html — ${(html.length / 1024).toFixed(0)} Ko`);
