// Extrait la structure de offre.html en JSON, pour que le Word soit engendré
// depuis la MÊME source que le PDF. On lit le DOM (Chromium), pas le HTML au regex.
import { chromium } from 'playwright';
import fs from 'fs';

const exe = process.env.PW_CHROMIUM;
const b = await chromium.launch(exe ? { executablePath: exe } : {});
const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/offre.html', { waitUntil: 'domcontentloaded' });

const blocs = await p.evaluate(() => {
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

    if (c.contains('entete-offre')) {
      res.push({ t: 'entete',
        eyebrow: el.querySelector('.eyebrow')?.textContent.trim() || '',
        titre:   el.querySelector('h1')?.textContent.trim() || '',
        sous:    el.querySelector('.st')?.textContent.trim() || '',
        chips:   [...el.querySelectorAll('.chip')].map((x) => x.textContent.trim()) });
    } else if (c.contains('cle')) {
      res.push({ t: 'cle', x: txt(el.querySelector('p') || el) });
    } else if (c.contains('faits')) {
      res.push({ t: 'faits', r: [...el.children].map((d) => ({
        b: d.querySelector('b').textContent.trim(),
        s: d.querySelector('span').textContent.trim() })) });
    } else if (c.contains('art-hd')) {
      res.push({ t: 'art', n: el.querySelector('.n').textContent.trim(),
                 x: txt(el.querySelector('h2')) });
    } else if (el.tagName === 'H3' && c.contains('cl')) {
      res.push({ t: 'cl', x: txt(el) });
    } else if (el.tagName === 'P') {
      res.push({ t: 'p', x: txt(el) });
    } else if (el.tagName === 'UL' && c.contains('puces')) {
      for (const li of el.children) res.push({ t: 'puce', x: txt(li) });
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
    }
  }
  return res;
});

await b.close();
fs.writeFileSync('_texte-offre.json', JSON.stringify(blocs, null, 1));
const n = (t) => blocs.filter((b) => b.t === t).length;
console.log(`✓ _texte-offre.json — ${blocs.length} blocs ` +
  `(${n('art')} sections, ${n('p')} paragraphes, ${n('puce')} puces, ` +
  `${n('cl')} sous-titres, ${n('int')} encarts, ${n('faits')} bandeaux de faits)`);
