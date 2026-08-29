// ============================================================================
// EduCam — version Word du protocole d'accord.
//
// POURQUOI UNE DEUXIÈME SOURCE
// Le PDF est le document que l'on présente ; le .docx est celui que l'on
// complète, que l'on fait relire par un juriste et que l'on signe. Les deux
// portent le même texte et la même identité, mais Word ne sait pas reproduire
// la maquette au pixel près — pas de coins arrondis, pas de grille CSS.
// On garde donc : les verts, la hiérarchie, les encarts « Intention », les
// tableaux à en-tête vert, les champs surlignés.
//
// POLICE : Calibri, et non Inter.
// Inter n'est pas installée sur un poste Windows ordinaire ; Word lui
// substituerait alors une police au hasard, souvent un romain, et le document
// perdrait plus en cohérence qu'il ne gagnerait à viser l'identité exacte.
// Calibri est présente partout et reste dans la même famille humaniste.
// Le PDF, lui, embarque Inter : c'est lui la référence visuelle.
// ============================================================================

import { createRequire } from 'module';
import fs from 'fs';

// `docx` est installé globalement et ne s'importe pas en ESM sous ce Node :
// on passe par createRequire plutôt que d'ajouter un package.json ici.
const require = createRequire(import.meta.url);
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  Footer, PageNumber, TabStopType, LevelFormat, PageBreak,
} = require('docx');

const V   = '0F4C35';  // vert principal
const V5  = '007A5E';  // vert vif
const V7  = '0A3626';  // vert profond
const V50 = 'EDF6F1';  // vert très clair
const V10 = 'CFE7DC';
const JAUNE = 'FCD116';
const ENCRE = '0D1219', ENCRE2 = '2E3843', ENCRE3 = '5A6470';
const TRAIT = 'C7CFD6', FILET = 'E3E8ED', BLEU = '0B5FA5';
const POLICE = 'Calibri';

const MM = (n) => Math.round(n * 56.7);           // millimètres → DXA
const LARGEUR = MM(174);                           // largeur utile A4 à 18 mm

const SANS_BORD = {
  top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

/* ---------- petites fabriques ------------------------------------------- */

// Texte enrichi : « **gras** » et « {{champ}} » (surligné, à compléter).
const runs = (txt, opts = {}) => {
  const base = { font: POLICE, size: opts.size || 20, color: opts.color || ENCRE2 };
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
  spacing: { after: opts.after ?? 120, line: opts.line ?? 264 },
  ...(opts.extra || {}),
});

// Titre d'article : numéro, libellé, filet vert dessous.
const ART = (num, titre) => new Paragraph({
  children: [
    // « 1. Parties » mais « ◆ L'essentiel » : le point n'a de sens qu'après un chiffre.
    new TextRun({ text: /^\d+$/.test(num) ? `${num}. ` : `${num}  `,
      bold: true, size: 28, color: V5, font: POLICE }),
    new TextRun({ text: titre, bold: true, size: 28, color: V7, font: POLICE }),
  ],
  spacing: { before: 320, after: 140 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: V, space: 6 } },
  keepNext: true,
  heading: HeadingLevel.HEADING_1,
});

const CL = (txt) => new Paragraph({
  children: [new TextRun({ text: txt, bold: true, size: 21, color: V, font: POLICE })],
  spacing: { before: 200, after: 80 },
  keepNext: true,
  heading: HeadingLevel.HEADING_2,
});

const PUCE = (txt) => new Paragraph({
  children: runs(txt),
  bullet: { level: 0 },
  spacing: { after: 70, line: 264 },
  alignment: AlignmentType.JUSTIFIED,
});

// Encart « Intention » : tableau d'une cellule, fond vert clair, barre à gauche.
const INTENTION = (label, txt) => new Table({
  width: { size: LARGEUR, type: WidthType.DXA },
  columnWidths: [LARGEUR],
  borders: {
    ...SANS_BORD,
    left: { style: BorderStyle.SINGLE, size: 18, color: V5 },
    top:    { style: BorderStyle.SINGLE, size: 4, color: V10 },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: V10 },
    right:  { style: BorderStyle.SINGLE, size: 4, color: V10 },
  },
  rows: [new TableRow({ children: [new TableCell({
    width: { size: LARGEUR, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: V50, color: 'auto' },
    margins: { top: MM(2.5), bottom: MM(2.5), left: MM(3.5), right: MM(3.5) },
    children: [
      new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), bold: true,
        size: 15, color: V5, font: POLICE, characterSpacing: 30 })],
        spacing: { after: 60 } }),
      new Paragraph({ children: runs(txt, { color: '0E3325' }),
        alignment: AlignmentType.LEFT, spacing: { after: 0, line: 260 } }),
    ],
  })] })],
});

// Tableau à en-tête vert. `cols` = largeurs relatives.
const TABLE = (entetes, lignes, cols) => {
  const total = cols.reduce((a, b) => a + b, 0);
  const w = cols.map((c) => Math.round((c / total) * LARGEUR));
  w[w.length - 1] = LARGEUR - w.slice(0, -1).reduce((a, b) => a + b, 0);
  const cell = (txt, i, opts = {}) => new TableCell({
    width: { size: w[i], type: WidthType.DXA },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: 'auto' } : undefined,
    margins: { top: MM(1.8), bottom: MM(1.8), left: MM(2.4), right: MM(2.4) },
    // Une cellule peut contenir plusieurs paragraphes : le texte est découpé
    // sur les sauts de ligne. Sans cela, une liste de sept puces se rendait en
    // un seul pavé continu.
    children: opts.entete
      ? [new Paragraph({ children: [new TextRun({ text: String(txt).toUpperCase(),
          bold: true, size: 15, color: 'FFFFFF', font: POLICE, characterSpacing: 24 })],
          alignment: AlignmentType.LEFT, spacing: { after: 0, line: 250 } })]
      // U+2028 accepté aussi : un copier-coller depuis le navigateur peut en
      // glisser un à la place d'un saut de ligne ordinaire.
      : String(txt).split(/[\n\u2028]/).map((ligne, k, tout) => new Paragraph({
          children: runs(ligne, { size: 18 }),
          alignment: AlignmentType.LEFT,
          spacing: { after: k === tout.length - 1 ? 0 : 60, line: 250 },
          // Pas de puce si la ligne porte déjà sa propre numérotation
          // (« **12.** Protection des données ») : deux marqueurs valent moins qu'un.
          ...(tout.length > 1 && !/^\*\*\d/.test(ligne) ? { bullet: { level: 0 } } : {}),
        })),
  });
  return new Table({
    width: { size: LARGEUR, type: WidthType.DXA },
    columnWidths: w,
    borders: {
      ...SANS_BORD,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 3, color: FILET },
    },
    rows: [
      // En-tête vert seulement s'il y a quelque chose à afficher : le sommaire
      // n'a pas besoin d'une bande « SOMMAIRE » au-dessus de son propre titre.
      ...(entetes.some((h) => String(h).trim()) ? [new TableRow({ tableHeader: true, children:
        entetes.map((h, i) => cell(h, i, { entete: true, fill: V })) })] : []),
      ...lignes.map((l, k) => new TableRow({ children:
        l.map((c, i) => cell(c, i, { fill: k % 2 ? 'FAFCFB' : undefined })) })),
    ],
  });
};

/* ---------- couverture --------------------------------------------------- */

const blancSur = (txt, opts = {}) => new Paragraph({
  children: [new TextRun({ text: txt, font: POLICE, color: opts.color || 'FFFFFF',
    size: opts.size || 22, bold: opts.bold })],
  alignment: opts.align || AlignmentType.LEFT,
  spacing: { after: opts.after ?? 100, line: 280 },
});

const COUVERTURE = new Table({
  width: { size: LARGEUR, type: WidthType.DXA },
  columnWidths: [LARGEUR],
  borders: SANS_BORD,
  rows: [new TableRow({ children: [new TableCell({
    width: { size: LARGEUR, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: V7, color: 'auto' },
    margins: { top: MM(14), bottom: MM(14), left: MM(12), right: MM(12) },
    children: [
      blancSur('EduCam', { bold: true, size: 34, after: 40 }),
      blancSur('une solution Mansa Musa Academy', { color: '8CBFA9', size: 18, after: 500 }),
      new Paragraph({ children: [new TextRun({ text: '━━━━', color: JAUNE, size: 26, font: POLICE })],
        spacing: { after: 160 } }),
      blancSur("Protocole d'accord", { bold: true, size: 52, after: 120 }),
      blancSur('Projet pilote de la plateforme pédagogique EduCam', { color: 'DCEDE5', size: 24, after: 40 }),
      blancSur('Année scolaire 2026–2027 · Région du Littoral', { color: 'DCEDE5', size: 24, after: 460 }),
      new Paragraph({ children: [
        new TextRun({ text: 'Entre  ', color: JAUNE, size: 22, bold: true, font: POLICE }),
        new TextRun({ text: 'Mansa Musa Academy', color: 'FFFFFF', size: 24, bold: true, font: POLICE }),
        new TextRun({ text: '  (éditeur de la plateforme EduCam)', color: 'A9CFBD', size: 20, font: POLICE }),
      ], spacing: { after: 100 } }),
      new Paragraph({ children: [
        new TextRun({ text: 'et       ', color: JAUNE, size: 22, bold: true, font: POLICE }),
        new TextRun({ text: "[DÉNOMINATION DE L'ÉCOLE]", color: JAUNE, size: 24, bold: true, font: POLICE }),
        new TextRun({ text: '  (établissement partenaire)', color: 'A9CFBD', size: 20, font: POLICE }),
      ], spacing: { after: 460 } }),
      new Paragraph({ children: [
        new TextRun({ text: 'Version [1.0] — [date] · Document en deux (2) exemplaires originaux',
          color: 'C6E5D6', size: 19, font: POLICE }),
      ], spacing: { after: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: '3A6B57', space: 8 } } }),
      new Paragraph({ children: [
        new TextRun({ text: "Gratuit pour l'École. ", color: 'FFFFFF', size: 19, bold: true, font: POLICE }),
        new TextRun({ text: "La seule contribution attendue est l'usage réel et quotidien de la plateforme.",
          color: 'C6E5D6', size: 19, font: POLICE }),
      ], spacing: { after: 0 } }),
    ],
  })] })],
});

/* ---------- signatures --------------------------------------------------- */

const ligneSignature = (titre) => new TableCell({
  width: { size: Math.round(LARGEUR / 2), type: WidthType.DXA },
  borders: {
    top:    { style: BorderStyle.SINGLE, size: 4, color: TRAIT },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: TRAIT },
    left:   { style: BorderStyle.SINGLE, size: 4, color: TRAIT },
    right:  { style: BorderStyle.SINGLE, size: 4, color: TRAIT },
  },
  margins: { top: MM(4), bottom: MM(4), left: MM(4), right: MM(4) },
  children: [
    new Paragraph({ children: [new TextRun({ text: titre.toUpperCase(), bold: true,
      size: 16, color: V, font: POLICE, characterSpacing: 24 })], spacing: { after: 300 } }),
    new Paragraph({ spacing: { after: 40 }, children: [],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TRAIT } } }),
    new Paragraph({ children: [new TextRun({ text: 'Nom et prénom', size: 16, color: ENCRE3, font: POLICE })],
      spacing: { after: 260 } }),
    new Paragraph({ spacing: { after: 40 }, children: [],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TRAIT } } }),
    new Paragraph({ children: [new TextRun({ text: 'Qualité', size: 16, color: ENCRE3, font: POLICE })],
      spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'Signature et cachet', size: 16, color: ENCRE3, font: POLICE })],
      spacing: { after: 900 }, alignment: AlignmentType.CENTER }),
  ],
});

const TABLE_SIGNATURES = new Table({
  width: { size: LARGEUR, type: WidthType.DXA },
  columnWidths: [Math.round(LARGEUR / 2), LARGEUR - Math.round(LARGEUR / 2)],
  borders: SANS_BORD,
  rows: [new TableRow({ children: [
    ligneSignature('Pour Mansa Musa Academy (EduCam)'),
    ligneSignature("Pour l'École"),
  ] })],
});

/* ---------- le corps ----------------------------------------------------- */

const T = fs.readFileSync('_texte-protocole.json', 'utf8');
const BLOCS = JSON.parse(T);

const enfants = [COUVERTURE, new Paragraph({ children: [new PageBreak()] })];

for (const b of BLOCS) {
  if (b.t === 'art')        enfants.push(ART(b.n, b.x));
  else if (b.t === 'cl')    enfants.push(CL(b.x));
  else if (b.t === 'p')     enfants.push(P(b.x));
  else if (b.t === 'puce')  enfants.push(PUCE(b.x));
  else if (b.t === 'int')   { enfants.push(INTENTION(b.l || 'Intention', b.x));
                              enfants.push(new Paragraph({ spacing: { after: 120 }, children: [] })); }
  else if (b.t === 'faits') {
    const w = b.r.map(() => Math.round(LARGEUR / b.r.length));
    w[w.length - 1] = LARGEUR - w.slice(0, -1).reduce((a, x) => a + x, 0);
    enfants.push(new Table({
      width: { size: LARGEUR, type: WidthType.DXA }, columnWidths: w,
      borders: SANS_BORD,
      rows: [new TableRow({ children: b.r.map((f, i) => new TableCell({
        width: { size: w[i], type: WidthType.DXA },
        borders: { top: { style: BorderStyle.SINGLE, size: 16, color: V5 },
                   bottom: { style: BorderStyle.SINGLE, size: 4, color: TRAIT },
                   left: { style: BorderStyle.SINGLE, size: 4, color: TRAIT },
                   right: { style: BorderStyle.SINGLE, size: 4, color: TRAIT } },
        margins: { top: MM(2.5), bottom: MM(2.5), left: MM(2), right: MM(2) },
        children: [
          new Paragraph({ children: [new TextRun({ text: f.b, bold: true, size: 30,
            color: V7, font: POLICE })], alignment: AlignmentType.CENTER,
            spacing: { after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: f.s, size: 16,
            color: ENCRE3, font: POLICE })], alignment: AlignmentType.CENTER,
            spacing: { after: 0 } }),
        ],
      })) })],
    }));
    enfants.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
  }
  else if (b.t === 'table') { enfants.push(TABLE(b.h, b.r, b.c));
                              enfants.push(new Paragraph({ spacing: { after: 160 }, children: [] })); }
  else if (b.t === 'saut')  enfants.push(new Paragraph({ children: [new PageBreak()] }));
  // Le bloc de signatures appartient à l'article 20, pas à la fin du document :
  // rendu en queue, il se retrouvait après les annexes, détaché de la phrase
  // « Fait à …, le … » qu'il conclut.
  else if (b.t === 'signatures') { enfants.push(TABLE_SIGNATURES);
                                   enfants.push(new Paragraph({ spacing: { after: 200 }, children: [] })); }
  else if (b.t === 'avert') {
    enfants.push(new Table({
      width: { size: LARGEUR, type: WidthType.DXA }, columnWidths: [LARGEUR],
      borders: { ...SANS_BORD,
        top: { style: BorderStyle.SINGLE, size: 4, color: 'E3CDA0' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E3CDA0' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'E3CDA0' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'E3CDA0' } },
      rows: [new TableRow({ children: [new TableCell({
        width: { size: LARGEUR, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: 'FDF6E7', color: 'auto' },
        margins: { top: MM(2.5), bottom: MM(2.5), left: MM(3.5), right: MM(3.5) },
        children: [new Paragraph({ children: runs(b.x, { boldColor: '6B4600' }),
          alignment: AlignmentType.JUSTIFIED, spacing: { after: 0, line: 260 } })],
      })] })],
    }));
  }
}

/* ---------- assemblage --------------------------------------------------- */

const pied = new Footer({ children: [new Paragraph({
  tabStops: [{ type: TabStopType.RIGHT, position: LARGEUR }],
  border: { top: { style: BorderStyle.SINGLE, size: 3, color: FILET, space: 6 } },
  children: [
    new TextRun({ text: 'EduCam', bold: true, size: 15, color: V, font: POLICE }),
    new TextRun({ text: " · Protocole d'accord pilote — Mansa Musa Academy", size: 15, color: ENCRE3, font: POLICE }),
    new TextRun({ text: '\tParaphes : ______ / ______   ·   Page ', size: 15, color: ENCRE3, font: POLICE }),
    new TextRun({ children: [PageNumber.CURRENT], size: 15, color: ENCRE3, font: POLICE }),
    new TextRun({ text: ' / ', size: 15, color: ENCRE3, font: POLICE }),
    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: ENCRE3, font: POLICE }),
  ],
})] });

const doc = new Document({
  creator: 'Mansa Musa Academy',
  title: "EduCam — Protocole d'accord pilote",
  numbering: { config: [{
    reference: 'puces', levels: [{
      level: 0, format: LevelFormat.BULLET, text: '●', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: MM(6), hanging: MM(3.5) } },
               run: { color: V5, font: POLICE } },
    }],
  }] },
  styles: { default: { document: { run: { font: POLICE, size: 20, color: ENCRE2 } } } },
  sections: [{
    properties: { page: { margin: { top: MM(20), bottom: MM(20), left: MM(18), right: MM(18) } } },
    footers: { default: pied },
    children: enfants,
  }],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync('EduCam_Protocole_Pilote.docx', buf);
console.log('✓ EduCam_Protocole_Pilote.docx —', BLOCS.length, 'blocs');
