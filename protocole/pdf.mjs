// Rend le protocole en PDF, avec pied de page numéroté et ligne de paraphes —
// ce qu'un document destiné à la signature exige.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/protocole.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.emulateMedia({ media: 'print' });
await p.pdf({
  path: 'EduCam_Protocole_Pilote.pdf', format: 'A4', printBackground: true,
  margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%;font-family:Arial,sans-serif;font-size:7pt;color:#5A6470;
                padding:0 18mm;display:flex;justify-content:space-between;align-items:center;
                border-top:.5pt solid #E3E8ED;padding-top:3mm">
      <span><b style="color:#0F4C35">EduCam</b> · Protocole d'accord pilote —
        Mansa Musa Academy</span>
      <span>Paraphes : ______ / ______ &nbsp;&nbsp;·&nbsp;&nbsp;
        Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
});
const n = await p.evaluate(() => document.querySelectorAll('.art-hd').length);
await b.close();
console.log(`✓ EduCam_Protocole_Pilote.pdf — ${n} sections`);
