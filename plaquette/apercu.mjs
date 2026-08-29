// Rend chaque page A4 de la plaquette en PNG, pour relecture visuelle.
// Usage : node apercu.mjs
import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1.4 });
await p.goto('file://' + process.cwd() + '/plaquette.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.emulateMedia({ media: 'print' });

const n = await p.locator('.page').count();
for (let i = 0; i < n; i++) {
  const nom = `apercu-${String(i + 1).padStart(2, '0')}.png`;
  await p.locator('.page').nth(i).screenshot({ path: nom });
  console.log('✓', nom);
}
await b.close();
