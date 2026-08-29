// Assemble protocole.html = entête de la plaquette (police Inter incluse)
//                          + feuille de style du document long
//                          + corps du texte.
// C'est la PREMIÈRE commande de la chaîne : protocole.html est un fichier
// engendré, jamais modifié à la main. Le seul fichier à éditer est _corps.html.
import { readFileSync, writeFileSync } from 'node:fs';

const entete = readFileSync('_entete-plaquette.txt', 'utf8');
const style  = readFileSync('_style-protocole.css', 'utf8');
const corps  = readFileSync('_corps.html', 'utf8');

// L'entête est un document complet : il referme lui-même <style>, <head> et
// ouvre <body>. La feuille du protocole doit donc être GREFFÉE À L'INTÉRIEUR
// du <style> existant, en dernier — c'est ce qui lui donne le dernier mot dans
// la cascade, notamment sur la règle @page de la plaquette (margin:0).
// Concaténer après l'entête la placerait dans le corps, en texte : les styles
// du protocole seraient perdus, et le document rendu ferait 14 pages au lieu
// de 17 sans qu'aucune commande n'échoue. Erreur commise, contrôle ajouté.
const i = entete.lastIndexOf('</style>');
if (i === -1) throw new Error('_entete-plaquette.txt : balise </style> introuvable');

const html = entete.slice(0, i) + '\n\n' + style + '\n' + entete.slice(i)
           + '\n' + corps + '\n</body>\n</html>\n';

writeFileSync('protocole.html', html);

// Garde-fou : une seule feuille de style, et le corps doit être stylé.
const n = (html.match(/<\/style>/g) || []).length;
if (n !== 1) throw new Error(`protocole.html : ${n} balises </style>, attendu 1`);
console.log(`✓ protocole.html — ${(html.length / 1024).toFixed(0)} Ko`);
