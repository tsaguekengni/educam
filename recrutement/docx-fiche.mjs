// ============================================================================
// EduCam — version Word de la FICHE DE POSTE (Référent pédagogique de terrain).
// Même texte et même identité que le PDF, engendrés depuis fiche.html.
// POLICE : Calibri. Étend le générateur de l'offre avec les tableaux et l'encart.
// ============================================================================

import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  Footer, PageNumber, TabStopType, LevelFormat,
} = require('docx');

const V='0F4C35', V5='007A5E', V7='0A3626', V50='EDF6F1', V10='CFE7DC';
const JAUNE='FCD116', ENCRE='0D1219', ENCRE2='2E3843', ENCRE3='5A6470';
const TRAIT='C7CFD6', FILET='E3E8ED', POLICE='Calibri';
const MM=(n)=>Math.round(n*56.7), LARGEUR=MM(178);

const SANS_BORD = {
  top:{style:BorderStyle.NONE,size:0,color:'FFFFFF'}, bottom:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},
  left:{style:BorderStyle.NONE,size:0,color:'FFFFFF'}, right:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},
  insideHorizontal:{style:BorderStyle.NONE,size:0,color:'FFFFFF'}, insideVertical:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},
};

const runs = (txt, opts={}) => {
  const base={font:POLICE,size:opts.size||21,color:opts.color||ENCRE2}; const out=[];
  for (const part of String(txt).split(/(\*\*[^*]+\*\*|\{\{[^}]+\}\})/g)) {
    if(!part) continue;
    if(part.startsWith('**')) out.push(new TextRun({...base,text:part.slice(2,-2),bold:true,color:opts.boldColor||ENCRE}));
    else if(part.startsWith('{{')) out.push(new TextRun({...base,text:part.slice(2,-2),bold:true,color:'6B4600',highlight:'yellow'}));
    else out.push(new TextRun({...base,text:part}));
  }
  return out;
};

const P = (txt,opts={}) => new Paragraph({ children:runs(txt,opts),
  alignment:opts.align||AlignmentType.JUSTIFIED, spacing:{after:opts.after??130,line:opts.line??268} });

const ART = (num,titre) => new Paragraph({ children:[
    new TextRun({text:/^\d+$/.test(num)?`${num}. `:`${num}  `,bold:true,size:28,color:V5,font:POLICE}),
    new TextRun({text:titre,bold:true,size:28,color:V7,font:POLICE}) ],
  spacing:{before:340,after:150}, border:{bottom:{style:BorderStyle.SINGLE,size:12,color:V,space:6}},
  keepNext:true, heading:HeadingLevel.HEADING_1 });

const CL = (txt) => new Paragraph({ children:[new TextRun({text:txt,bold:true,size:22,color:V,font:POLICE})],
  spacing:{before:200,after:80}, keepNext:true, heading:HeadingLevel.HEADING_2 });

const PUCE = (txt) => new Paragraph({ children:runs(txt), bullet:{level:0},
  spacing:{after:74,line:268}, alignment:AlignmentType.JUSTIFIED });

const CLE = (txt) => new Table({ width:{size:LARGEUR,type:WidthType.DXA}, columnWidths:[LARGEUR], borders:SANS_BORD,
  rows:[new TableRow({children:[new TableCell({ width:{size:LARGEUR,type:WidthType.DXA},
    shading:{type:ShadingType.CLEAR,fill:V,color:'auto'}, margins:{top:MM(3.4),bottom:MM(3.4),left:MM(4.6),right:MM(4.6)},
    children:[new Paragraph({children:runs(txt,{color:'FFFFFF',boldColor:'FFFFFF',size:22}),alignment:AlignmentType.LEFT,spacing:{after:0,line:268}})] })]})] });

const INTENTION = (label,txt) => new Table({ width:{size:LARGEUR,type:WidthType.DXA}, columnWidths:[LARGEUR],
  borders:{...SANS_BORD, left:{style:BorderStyle.SINGLE,size:18,color:V5},
    top:{style:BorderStyle.SINGLE,size:4,color:V10}, bottom:{style:BorderStyle.SINGLE,size:4,color:V10}, right:{style:BorderStyle.SINGLE,size:4,color:V10}},
  rows:[new TableRow({children:[new TableCell({ width:{size:LARGEUR,type:WidthType.DXA},
    shading:{type:ShadingType.CLEAR,fill:V50,color:'auto'}, margins:{top:MM(2.5),bottom:MM(2.5),left:MM(3.5),right:MM(3.5)},
    children:[ new Paragraph({children:[new TextRun({text:label.toUpperCase(),bold:true,size:15,color:V5,font:POLICE,characterSpacing:30})],spacing:{after:60}}),
      new Paragraph({children:runs(txt,{color:'0E3325'}),alignment:AlignmentType.LEFT,spacing:{after:0,line:260}}) ] })]})] });

// Tableau à en-tête vert. cols = largeurs relatives.
const TABLE = (entetes, lignes, cols) => {
  const total = cols.reduce((a,b)=>a+b,0);
  const w = cols.map((c)=>Math.round((c/total)*LARGEUR));
  w[w.length-1] = LARGEUR - w.slice(0,-1).reduce((a,b)=>a+b,0);
  const cell = (txt,i,opts={}) => new TableCell({
    width:{size:w[i],type:WidthType.DXA},
    shading: opts.fill?{type:ShadingType.CLEAR,fill:opts.fill,color:'auto'}:undefined,
    margins:{top:MM(1.8),bottom:MM(1.8),left:MM(2.4),right:MM(2.4)},
    children: opts.entete
      ? [new Paragraph({children:[new TextRun({text:String(txt).toUpperCase(),bold:true,size:15,color:'FFFFFF',font:POLICE,characterSpacing:24})],alignment:AlignmentType.LEFT,spacing:{after:0,line:250}})]
      : String(txt).split(/\n/).map((ligne,k,tout)=>new Paragraph({
          children:runs(ligne,{size:18}), alignment:AlignmentType.LEFT,
          spacing:{after:k===tout.length-1?0:60,line:250},
          ...(tout.length>1 && !/^\*\*\d/.test(ligne)?{bullet:{level:0}}:{}) })),
  });
  return new Table({ width:{size:LARGEUR,type:WidthType.DXA}, columnWidths:w,
    borders:{...SANS_BORD, insideHorizontal:{style:BorderStyle.SINGLE,size:3,color:FILET}},
    rows:[ ...(entetes.some((h)=>String(h).trim())?[new TableRow({tableHeader:true,children:entetes.map((h,i)=>cell(h,i,{entete:true,fill:V}))})]:[]),
      ...lignes.map((l,k)=>new TableRow({children:l.map((c,i)=>cell(c,i,{fill:k%2?'FAFCFB':undefined}))})) ] });
};

const blancSur = (txt,opts={}) => new Paragraph({ children:[new TextRun({text:txt,font:POLICE,color:opts.color||'FFFFFF',size:opts.size||22,bold:opts.bold,characterSpacing:opts.cs})],
  alignment:opts.align||AlignmentType.LEFT, spacing:{after:opts.after??100,line:opts.line??280} });

const ENTETE = (e) => new Table({ width:{size:LARGEUR,type:WidthType.DXA}, columnWidths:[LARGEUR], borders:SANS_BORD,
  rows:[new TableRow({children:[new TableCell({ width:{size:LARGEUR,type:WidthType.DXA},
    shading:{type:ShadingType.CLEAR,fill:V7,color:'auto'}, margins:{top:MM(11),bottom:MM(11),left:MM(12),right:MM(12)},
    children:[
      new Paragraph({children:[ new TextRun({text:'EduCam',bold:true,size:26,color:'FFFFFF',font:POLICE}),
        new TextRun({text:'   une solution Mansa Musa Academy',size:17,color:'A9CFBD',font:POLICE}) ],spacing:{after:360}}),
      new Paragraph({children:[new TextRun({text:'━━━',color:JAUNE,size:22,font:POLICE})],spacing:{after:120}}),
      e.eyebrow?blancSur(e.eyebrow.toUpperCase(),{color:JAUNE,size:16,bold:true,cs:34,after:90}):null,
      blancSur(e.titre,{bold:true,size:44,after:90}),
      blancSur(e.sous,{color:'DCEDE5',size:23,after:e.chips?.length?220:0}),
      e.chips?.length?new Paragraph({children:[new TextRun({text:e.chips.join('      ·      '),color:'FFFFFF',size:19,bold:true,font:POLICE})],
        spacing:{after:0}, border:{top:{style:BorderStyle.SINGLE,size:4,color:'3A6B57',space:8}}}):null,
    ].filter(Boolean) })]})] });

const AVERT = (txt) => new Table({ width:{size:LARGEUR,type:WidthType.DXA}, columnWidths:[LARGEUR],
  borders:{...SANS_BORD, top:{style:BorderStyle.SINGLE,size:4,color:'E3CDA0'}, bottom:{style:BorderStyle.SINGLE,size:4,color:'E3CDA0'},
    left:{style:BorderStyle.SINGLE,size:4,color:'E3CDA0'}, right:{style:BorderStyle.SINGLE,size:4,color:'E3CDA0'}},
  rows:[new TableRow({children:[new TableCell({ width:{size:LARGEUR,type:WidthType.DXA},
    shading:{type:ShadingType.CLEAR,fill:'FDF6E7',color:'auto'}, margins:{top:MM(2.5),bottom:MM(2.5),left:MM(3.5),right:MM(3.5)},
    children:[new Paragraph({children:runs(txt,{boldColor:'6B4600'}),alignment:AlignmentType.JUSTIFIED,spacing:{after:0,line:260}})] })]})] });

/* ---------- assemblage ---------- */
const BLOCS = JSON.parse(fs.readFileSync('_texte-fiche.json', 'utf8'));
const enfants = [];
for (const b of BLOCS) {
  if (b.t==='entete')     { enfants.push(ENTETE(b)); enfants.push(new Paragraph({spacing:{after:200},children:[]})); }
  else if (b.t==='cle')   { enfants.push(CLE(b.x)); enfants.push(new Paragraph({spacing:{after:160},children:[]})); }
  else if (b.t==='art')   enfants.push(ART(b.n,b.x));
  else if (b.t==='cl')    enfants.push(CL(b.x));
  else if (b.t==='p')     enfants.push(P(b.x));
  else if (b.t==='puce')  enfants.push(PUCE(b.x));
  else if (b.t==='int')   { enfants.push(INTENTION(b.l||'Intention',b.x)); enfants.push(new Paragraph({spacing:{after:140},children:[]})); }
  else if (b.t==='table') { enfants.push(TABLE(b.h,b.r,b.c)); enfants.push(new Paragraph({spacing:{after:160},children:[]})); }
  else if (b.t==='avert') { enfants.push(AVERT(b.x)); enfants.push(new Paragraph({spacing:{after:120},children:[]})); }
}

const pied = new Footer({ children:[new Paragraph({
  tabStops:[{type:TabStopType.RIGHT,position:LARGEUR}],
  border:{top:{style:BorderStyle.SINGLE,size:3,color:FILET,space:6}},
  children:[
    new TextRun({text:'EduCam',bold:true,size:15,color:V,font:POLICE}),
    new TextRun({text:' · Fiche de poste — Mansa Musa Academy · usage interne',size:15,color:ENCRE3,font:POLICE}),
    new TextRun({text:'\tPage ',size:15,color:ENCRE3,font:POLICE}),
    new TextRun({children:[PageNumber.CURRENT],size:15,color:ENCRE3,font:POLICE}),
    new TextRun({text:' / ',size:15,color:ENCRE3,font:POLICE}),
    new TextRun({children:[PageNumber.TOTAL_PAGES],size:15,color:ENCRE3,font:POLICE}),
  ] })] });

const doc = new Document({ creator:'Mansa Musa Academy',
  title:'EduCam — Fiche de poste · Référent pédagogique de terrain',
  numbering:{config:[{reference:'puces',levels:[{level:0,format:LevelFormat.BULLET,text:'●',alignment:AlignmentType.LEFT,
    style:{paragraph:{indent:{left:MM(6),hanging:MM(3.5)}},run:{color:V5,font:POLICE}}}]}]},
  styles:{default:{document:{run:{font:POLICE,size:21,color:ENCRE2}}}},
  sections:[{ properties:{page:{margin:{top:MM(15),bottom:MM(16),left:MM(16),right:MM(16)}}},
    footers:{default:pied}, children:enfants }] });

const buf = await Packer.toBuffer(doc);
fs.writeFileSync('EduCam_Fiche_Poste_Referent.docx', buf);
console.log('✓ EduCam_Fiche_Poste_Referent.docx —', BLOCS.length, 'blocs');
