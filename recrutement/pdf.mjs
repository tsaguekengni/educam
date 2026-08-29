// Rend l'offre en PDF, police Inter embarquée, pied de page discret.
import { chromium } from 'playwright';
// Sur un poste ordinaire, chromium.launch() suffit (Playwright trouve son navigateur).
// La variable PW_CHROMIUM ne sert qu'aux environnements où l'exécutable est ailleurs.
const exe = process.env.PW_CHROMIUM;
const b = await chromium.launch(exe ? { executablePath: exe } : {});
const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/offre.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.emulateMedia({ media: 'print' });
await p.pdf({
  path: 'EduCam_Offre_Referent_Pedagogique.pdf', format: 'A4', printBackground: true,
  margin: { top: '15mm', right: '16mm', bottom: '16mm', left: '16mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%;font-family:Arial,sans-serif;font-size:7pt;color:#5A6470;
                padding:0 18mm;display:flex;justify-content:space-between;align-items:center;
                border-top:.5pt solid #E3E8ED;padding-top:3mm">
      <span><b style="color:#0F4C35">EduCam</b> · Offre d'emploi — Mansa Musa Academy · Août 2026</span>
      <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
});
const n = await p.evaluate(() => document.querySelectorAll('.art-hd').length);
await b.close();
console.log(`✓ EduCam_Offre_Referent_Pedagogique.pdf — ${n} sections`);
