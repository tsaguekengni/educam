// Captures anglaises pour la plaquette EN. Source : preview-en.html
// (produit par `node traduire-preview.mjs`). Sortie : plaquette/shots-en/
import { chromium } from 'playwright';
import fs from 'fs';

fs.mkdirSync('plaquette/shots-en', { recursive: true });
const url = 'file://' + process.cwd() + '/preview-en.html';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 2 });
await p.goto(url);
await p.waitForTimeout(800);
const ids = ['cockpit', 'projecteur', 'lecon', 'horsligne', 'saisie', 'classe', 'direction', 'parent', 'messagerie'];
for (const id of ids) {
  const el = await p.$('#s-' + id);
  if (!el) { console.log('MANQUANT', id); continue; }
  await el.screenshot({ path: `plaquette/shots-en/${id}.png` });
  const box = await el.boundingBox();
  console.log(`${id.padEnd(12)} ${Math.round(box.width)}x${Math.round(box.height)}`);
}
await b.close();

// La capture TÉLÉPHONE doit être prise dans une fenêtre réellement étroite :
// à 1500 px, la requête média `min-width:900px` s'applique et le rail de bureau
// vient s'écraser dans le cadre de 390 px.
const b2 = await chromium.launch();
const m = await b2.newPage({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 3 });
await m.goto(url);
await m.waitForTimeout(600);
console.log('fenêtre téléphone :', ...(await m.evaluate(() => [innerWidth, matchMedia('(min-width:900px)').matches])));
const el = await m.$('#s-mobile');
await el.screenshot({ path: 'plaquette/shots-en/mobile.png' });
const box = await el.boundingBox();
console.log('mobile      ', Math.round(box.width) + 'x' + Math.round(box.height));
await b2.close();
