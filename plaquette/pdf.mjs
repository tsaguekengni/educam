import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/plaquette.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.emulateMedia({ media: 'print' });
await p.pdf({ path: 'EduCam_Presentation_Ecoles.pdf', format: 'A4',
  printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
// contrôle : hauteur réelle de chaque page
const info = await p.evaluate(() => {
  const pages = [...document.querySelectorAll('.page')];
  // On mesure le CONTENU (.pad / .couv > div / .final > div), pas la page :
  // les cercles décoratifs de la couverture sont hors-cadre par construction.
  return pages.map((el, i) => {
    const inner = el.querySelector('.pad') || el;
    const kids = [...inner.children];
    const bas = kids.length ? Math.max(...kids.map(k => k.getBoundingClientRect().bottom)) : 0;
    // La limite, c'est le HAUT DU PIED DE PAGE, pas le bas de la feuille :
    // sinon le dernier paragraphe passe sous le filet et devient illisible.
    const pied = el.querySelector('.pied');
    const limite = pied ? pied.getBoundingClientRect().top - 6
                        : el.getBoundingClientRect().bottom - 20;
    return { n: i + 1, debord: bas > limite ? Math.round(bas - limite) : 0 };
  });
});
console.log('pages :', info.length);
info.filter(x => x.debord).forEach(x => console.log(`  page ${x.n} DÉBORDE de ${x.debord}px`));
if (!info.some(x => x.debord)) console.log('  aucun débordement');
await b.close();
