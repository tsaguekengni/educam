// ============================================================================
// EduCam — extrait la structure du protocole depuis `protocole.html`
// et l'écrit en JSON, pour que la version Word soit engendrée à partir de la
// MÊME source que le PDF.
//
// POURQUOI PASSER PAR LE NAVIGATEUR
// Analyser du HTML à coups d'expressions régulières marche jusqu'au jour où
// une balise imbriquée fait tout dérailler. Chromium est déjà installé pour le
// rendu du PDF : autant lui demander le DOM, il ne se trompe jamais.
//
// CONSÉQUENCE UTILE : les deux documents ne peuvent plus diverger. Une phrase
// corrigée dans `_corps.html` se retrouve dans le PDF ET dans le .docx.
// ============================================================================

import { chromium } from 'playwright';
import fs from 'fs';

const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/protocole.html', { waitUntil: 'domcontentloaded' });

const blocs = await p.evaluate(() => {
  // <b>/<strong> → **gras** · .champ → {{à compléter}}
  const txt = (el) => {
    let out = '';
    for (const n of el.childNodes) {
      if (n.nodeType === 3) out += n.textContent;
      else if (n.nodeType === 1) {
        const t = n.tagName.toLowerCase();
        if (n.classList.contains('champ')) out += '{{' + n.textContent.trim() + '}}';
        else if (t === 'b' || t === 'strong') out += '**' + txt(n).trim() + '**';
        else if (t === 'br') out += ' ';
        else out += txt(n);
      }
    }
    return out.replace(/\s+/g, ' ').trim();
  };

  const res = [];
  const doc = document.querySelector('.doc');

  for (const el of doc.children) {
    const c = el.classList;

    if (c.contains('couv-p')) continue;                       // traité à part dans docx.mjs
    // On garde la POSITION du bloc de signatures : il appartient à l'article 20,
    // pas à la fin du document. Rendu en fin de fichier, il se retrouvait après
    // les annexes, séparé de la phrase « Fait à … » qu'il conclut.
    if (c.contains('sign')) { res.push({ t: 'signatures' }); continue; }

    if (c.contains('art-hd')) {
      res.push({ t: 'art', n: el.querySelector('.n').textContent.trim(),
                 x: txt(el.querySelector('h2')) });
    } else if (el.tagName === 'H3' && c.contains('cl')) {
      res.push({ t: 'cl', x: txt(el) });
    } else if (el.tagName === 'P') {
      res.push({ t: 'p', x: txt(el) });
    } else if (el.tagName === 'UL' && c.contains('puces')) {
      for (const li of el.children) res.push({ t: 'puce', x: txt(li) });
    } else if (el.tagName === 'OL') {
      let i = 0;
      for (const li of el.children) { i++; res.push({ t: 'puce', x: `**${i}.** ` + txt(li) }); }
    } else if (c.contains('def')) {
      res.push({ t: 'puce', x: txt(el) });
    } else if (c.contains('intention')) {
      res.push({ t: 'int', l: el.querySelector('.lbl').textContent.trim(),
                 x: txt(el.querySelector('p')) });
    } else if (c.contains('avert')) {
      res.push({ t: 'avert', x: txt(el.querySelector('p')) });
    } else if (el.tagName === 'TABLE') {
      const lignes = [...el.querySelectorAll('tr')].map((tr) =>
        [...tr.children].map((td) => txt(td)));
      const cols = (el.dataset.c || '').split(',').filter(Boolean).map(Number);
      res.push({ t: 'table', h: lignes[0], r: lignes.slice(1),
                 c: cols.length ? cols : lignes[0].map(() => 1) });
    } else if (c.contains('saut')) {
      res.push({ t: 'saut' });
    } else if (c.contains('faits')) {
      res.push({ t: 'faits', r: [...el.children].map((d) => ({
        b: d.querySelector('b').textContent.trim(),
        s: d.querySelector('span').textContent.trim() })) });
    } else if (c.contains('essentiel')) {
      const col = [...el.children];
      res.push({ t: 'table',
        h: col.map((x) => x.querySelector('.hd').textContent.trim()),
        r: [col.map((x) => [...x.querySelectorAll('li')].map((li) => txt(li)).join('\n'))],
        c: col.map(() => 1) });
    } else if (c.contains('somm')) {
      const it = [...el.children].map((d) => txt(d));
      const moitie = Math.ceil(it.length / 2);
      res.push({ t: 'table', h: ['', ''],
        r: [[it.slice(0, moitie).join('\n'), it.slice(moitie).join('\n')]], c: [50, 50] });
    }
  }
  return res;
});

await b.close();
fs.writeFileSync('_texte-protocole.json', JSON.stringify(blocs, null, 1));
const n = (t) => blocs.filter((b) => b.t === t).length;
console.log(`✓ _texte-protocole.json — ${blocs.length} blocs ` +
  `(${n('art')} articles, ${n('cl')} clauses, ${n('p')} paragraphes, ` +
  `${n('puce')} puces, ${n('int')} intentions, ${n('table')} tableaux)`);
