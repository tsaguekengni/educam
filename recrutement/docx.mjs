// ============================================================================
// EduCam — version Word de l'offre d'emploi.
// Même texte et même identité que le PDF, engendrés depuis offre.html.
// POLICE : Calibri (Inter n'est pas installée sur un poste Windows ordinaire ;
// le PDF, lui, embarque Inter et reste la référence visuelle).
// ============================================================================

import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  Footer, PageNumber, TabStopType, LevelFormat,
} = require('docx');

const V   = '0F4C35';  // vert principal
const V5  = '007A5E';  // vert vif
const V7  = '0A3626';  // vert profond
const V50 = 'EDF6F1';  // vert très clair
const V10 = 'CFE7DC';
const JAUNE = 'FCD116';
const ENCRE = '0D1219', ENCRE2 = '2E3843', ENCRE3 = '5A6470';
const TRAIT = 'C7CFD6', FILET = 'E3E8ED';
const POLICE = 'Calibri';

const MM = (n) => Math.round(n * 56.7);
const LARGEUR = MM(178);

const SANS_BORD = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

/* ---------- texte enrichi ---------- */
const runs = (txt, opts = {}) => {
  const base = { font: POLICE, size: opts.size || 21, color: opts.color || ENCRE2 };
  const out = [];
  for (const part of String(txt).split(/(\*\*[^*]+\*\*|\{\{[^}]+\}\})/g)) {
    if (!part) continue;
    if (part.startsWith('**')) {
      out.push(new TextRun({ ...base, text: part.slice(2, -2), bold: true,
        color: opts.boldColor || ENCRE }));
    } else if (part.startsWith('{{')) {
      out.push(new TextRun({ ...base, text: part.slice(2, -2), bold: true,
        color: '6B4600', highlight: 'yellow' }));
    } else {
      out.push(new TextRun({ ...base, text: part }));
    }
  }
  return out;
};

const P = (txt, opts = {}) => new Paragraph({
  children: runs(txt, opts),
  alignment: opts.align || AlignmentType.JUSTIFIED,
  spacing: { after: opts.after ?? 130, line: opts.line ?? 268 },
});

const ART = (num, titre) => new Paragraph({
  children: [
    new TextRun({ text: /^\d+$/.test(num) ? `${num}. ` : `${num}  `,
      bold: true, size: 28, color: V5, font: POLICE }),
    new TextRun({ text: titre, bold: true, size: 28, color: V7, font: POLICE }),
  ],
  spacing: { before: 340, after: 150 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: V, space: 6 } },
  keepNext: true,
  heading: HeadingLevel.HEADING_1,
});

const CL = (txt) => new Paragraph({
  children: [new TextRun({ text: txt, bold: true, size: 22, color: V, font: POLICE })],
  spacing: { before: 200, after: 80 },
  keepNext: true,
  heading: HeadingLevel.HEADING_2,
});

const PUCE = (txt) => new Paragraph({
  children: runs(txt),
  bullet: { level: 0 },
  spacing: { after: 74, line: 268 },
  alignment: AlignmentType.JUSTIFIED,
});

// Phrase-clé : aplat vert, texte blanc.
const CLE = (txt) => new Table({
  width: { size: LARGEUR, type: WidthType.DXA }, columnWidths: [LARGEUR],
  borders: SANS_BORD,
  rows: [new TableRow({ children: [new TableCell({
    width: { size: LARGEUR, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: V, color: 'auto' },
    margins: { top: MM(3.4), bottom: MM(3.4), left: MM(4.6), right: MM(4.6) },
    children: [new Paragraph({
      children: runs(txt, { color: 'FFFFFF', boldColor: 'FFFFFF', size: 22 }),
      alignment: AlignmentType.LEFT, spacing: { after: 0, line: 268 } })],
  })] })],
});

const INTENTION = (label, txt) => new Table({
  width: { size: LARGEUR, type: WidthType.DXA }, columnWidths: [LARGEUR],
  borders: { ...SANS_BORD,
    left: { style: BorderStyle.SINGLE, size: 18, color: V5 },
    top: { style: BorderStyle.SINGLE, size: 4, color: V10 },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: V10 },
    right: { style: BorderStyle.SINGLE, size: 4, color: V10 } },
  rows: [new TableRow({ children: [new TableCell({
    width: { size: LARGEUR, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: V50, color: 'auto' },
    margins: { top: MM(2.5), bottom: MM(2.5), left: MM(3.5), right: MM(3.5) },
    children: [
      new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), bold: true,
        size: 15, color: V5, font: POLICE, characterSpacing: 30 })], spacing: { after: 60 } }),
      new Paragraph({ children: runs(txt, { color: '0E3325' }),
        alignment: AlignmentType.LEFT, spacing: { after: 0, line: 260 } }),
    ],
  })] })],
});

/* ---------- bandeau d'en-tête ---------- */
const blancSur = (txt, opts = {}) => new Paragraph({
  children: [new TextRun({ text: txt, font: POLICE, color: opts.color || 'FFFFFF',
    size: opts.size || 22, bold: opts.bold, characterSpacing: opts.cs })],
  alignment: opts.align || AlignmentType.LEFT,
  spacing: { after: opts.after ?? 100, line: opts.line ?? 280 },
});

const ENTETE = (e) => new Table({
  width: { size: LARGEUR, type: WidthType.DXA }, columnWidths: [LARGEUR],
  borders: SANS_BORD,
  rows: [new TableRow({ children: [new TableCell({
    width: { size: LARGEUR, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: V7, color: 'auto' },
    margins: { top: MM(11), bottom: MM(11), left: MM(12), right: MM(12) },
    children: [
      new Paragraph({ children: [
        new TextRun({ text: 'EduCam', bold: true, size: 26, color: 'FFFFFF', font: POLICE }),
        new TextRun({ text: '   une solution Mansa Musa Academy', size: 17, color: 'A9CFBD', font: POLICE }),
      ], spacing: { after: 360 } }),
      new Paragraph({ children: [new TextRun({ text: '━━━', color: JAUNE, size: 22, font: POLICE })],
        spacing: { after: 120 } }),
      e.eyebrow ? blancSur(e.eyebrow.toUpperCase(), { color: JAUNE, size: 16, bold: true, cs: 34, after: 90 }) : null,
      blancSur(e.titre, { bold: true, size: 44, after: 90 }),
      blancSur(e.sous, { color: 'DCEDE5', size: 23, after: e.chips?.length ? 220 : 0 }),
      e.chips?.length ? new Paragraph({ children: [new TextRun({
        text: e.chips.join('      ·      '), color: 'FFFFFF', size: 19, bold: true, font: POLICE })],
        spacing: { after: 0 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: '3A6B57', space: 8 } } }) : null,
    ].filter(Boolean),
  })] })],
});

/* ---------- assemblage ---------- */
const BLOCS = JSON.parse(fs.readFileSync('_texte-offre.json', 'utf8'));
const enfants = [];

for (const b of BLOCS) {
  if (b.t === 'entete')     { enfants.push(ENTETE(b));
                              enfants.push(new Paragraph({ spacing: { after: 200 }, children: [] })); }
  else if (b.t === 'cle')   { enfants.push(CLE(b.x));
                              enfants.push(new Paragraph({ spacing: { after: 160 }, children: [] })); }
  else if (b.t === 'art')   enfants.push(ART(b.n, b.x));
  else if (b.t === 'cl')    enfants.push(CL(b.x));
  else if (b.t === 'p')     enfants.push(P(b.x));
  else if (b.t === 'puce')  enfants.push(PUCE(b.x));
  else if (b.t === 'int')   { enfants.push(INTENTION(b.l || 'Intention', b.x));
                              enfants.push(new Paragraph({ spacing: { after: 140 }, children: [] })); }
  else if (b.t === 'faits') {
    const w = b.r.map(() => Math.round(LARGEUR / b.r.length));
    w[w.length - 1] = LARGEUR - w.slice(0, -1).reduce((a, x) => a + x, 0);
    enfants.push(new Table({
      width: { size: LARGEUR, type: WidthType.DXA }, columnWidths: w, borders: SANS_BORD,
      rows: [new TableRow({ children: b.r.map((f, i) => new TableCell({
        width: { size: w[i], type: WidthType.DXA },
        borders: { top: { style: BorderStyle.SINGLE, size: 16, color: V5 },
                   bottom: { style: BorderStyle.SINGLE, size: 4, color: TRAIT },
                   left: { style: BorderStyle.SINGLE, size: 4, color: TRAIT },
                   right: { style: BorderStyle.SINGLE, size: 4, color: TRAIT } },
        margins: { top: MM(2.5), bottom: MM(2.5), left: MM(2), right: MM(2) },
        children: [
          new Paragraph({ children: [new TextRun({ text: f.b, bold: true, size: 26,
            color: V7, font: POLICE })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: f.s, size: 15,
            color: ENCRE3, font: POLICE })], alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
        ],
      })) })],
    }));
    enfants.push(new Paragraph({ spacing: { after: 180 }, children: [] }));
  }
}

const pied = new Footer({ children: [new Paragraph({
  tabStops: [{ type: TabStopType.RIGHT, position: LARGEUR }],
  border: { top: { style: BorderStyle.SINGLE, size: 3, color: FILET, space: 6 } },
  children: [
    new TextRun({ text: 'EduCam', bold: true, size: 15, color: V, font: POLICE }),
    new TextRun({ text: " · Offre d'emploi — Mansa Musa Academy · Août 2026", size: 15, color: ENCRE3, font: POLICE }),
    new TextRun({ text: '\tPage ', size: 15, color: ENCRE3, font: POLICE }),
    new TextRun({ children: [PageNumber.CURRENT], size: 15, color: ENCRE3, font: POLICE }),
    new TextRun({ text: ' / ', size: 15, color: ENCRE3, font: POLICE }),
    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: ENCRE3, font: POLICE }),
  ],
})] });

const doc = new Document({
  creator: 'Mansa Musa Academy',
  title: "EduCam — Offre d'emploi · Référent pédagogique de terrain",
  numbering: { config: [{ reference: 'puces', levels: [{
    level: 0, format: LevelFormat.BULLET, text: '●', alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: MM(6), hanging: MM(3.5) } }, run: { color: V5, font: POLICE } },
  }] }] },
  styles: { default: { document: { run: { font: POLICE, size: 21, color: ENCRE2 } } } },
  sections: [{
    properties: { page: { margin: { top: MM(15), bottom: MM(16), left: MM(16), right: MM(16) } } },
    footers: { default: pied },
    children: enfants,
  }],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync('EduCam_Offre_Referent_Pedagogique.docx', buf);
console.log('✓ EduCam_Offre_Referent_Pedagogique.docx —', BLOCS.length, 'blocs');
