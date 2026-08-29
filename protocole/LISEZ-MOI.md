# Protocole d'accord pilote — deux versions, une seule source

> **Dernière mise à jour : 2026-08-19 UTC** · Refonte du `Protocole_Accord_Pilote_EduCam.docx`
> d'origine, aligné sur la charte de la plaquette commerciale.

## Les deux livrables

| Fichier | Usage |
|---|---|
| `EduCam_Protocole_Pilote.pdf` | **17 pages.** Ce qu'on présente et qu'on imprime. Maquette identique à la plaquette : mêmes verts, police Inter embarquée, encarts « Intention », tableaux à en-tête vert. |
| `EduCam_Protocole_Pilote.docx` | **14 pages.** Ce qu'on complète, qu'on fait relire par un juriste et qu'on signe. Mêmes couleurs, même structure, champs surlignés en jaune. |

Les deux documents portent **exactement le même texte** : le .docx est engendré à
partir du HTML du PDF, pas ressaisi. Une phrase corrigée dans `_corps.html` se
retrouve dans les deux. Contrôle automatique : 25 champs à compléter de part et
d'autre, et huit phrases-clés vérifiées présentes dans les deux.

## Régénérer

```
node assembler.mjs  # entête + style + corps → protocole.html
node pdf.mjs        # HTML → PDF (Inter embarquée, pieds de page numérotés)
node extraire.mjs   # HTML → _texte-protocole.json (via Chromium, pas de regex)
node docx.mjs       # JSON → .docx
```

Modifier le texte : **`_corps.html`**, puis relancer les quatre commandes.
Ne modifiez pas `protocole.html` : il est reconstruit à chaque fois à partir de
`_entete-plaquette.txt` + `_style-protocole.css` + `_corps.html`.

## Pourquoi Calibri dans le Word et Inter dans le PDF

Inter n'est pas installée sur un poste Windows ordinaire. Word lui substituerait
une police au hasard — souvent un romain — et le document perdrait plus en
cohérence qu'il ne gagnerait à viser l'identité exacte. Calibri est présente
partout et reste dans la même famille humaniste. **Le PDF est la référence
visuelle** : il embarque Inter et s'affiche à l'identique sur n'importe quel poste.

## Ce qui a été ajouté au document d'origine

- **« L'essentiel en une page »** — quatre chiffres (0 FCFA · 1 classe · 6 matières ·
  5 jours), les deux colonnes « ce qu'apporte EduCam / ce qu'apporte l'École », le
  calendrier en un tableau, et un sommaire. Une direction décide en deux minutes ;
  cette page est faite pour ces deux minutes. Elle est explicitement **sans valeur
  contractuelle**.
- **Annexe I — champs à compléter avant signature** : l'inventaire des 25 crochets.
- **Nom du remplaçant** (Art. 6.2) : le document l'exigeait sans prévoir où l'écrire.
- **Ligne de paraphes et pagination** en pied de chaque page, et mention explicite
  du paraphe page par page à l'Article 20.
- **Avertissement final** : ce document a été mis en forme, pas rédigé par un juriste.

## Deux points à trancher avant la première signature

1. **WhatsApp.** L'Article 5.3 garantit « les notifications aux parents par WhatsApp »
   opérationnelles **au lancement**. WhatsApp n'existe nulle part dans le code de la
   plateforme. Décision de Maxime (2026-08-17) : **maintenu comme engagement ferme**,
   à construire avant octobre 2026. C'est une obligation contractuelle, pas une
   intention — elle est aussi consignée dans `claude/EduCam_Plaquette_Commerciale.md`.
2. **Relecture juridique.** En particulier les Articles 12 (données personnelles
   d'enfants), 14 (responsabilité sur le matériel), 16 (exclusivité et
   non-contournement) et 17 (responsabilité et force majeure).

## Fichiers de travail

| Fichier | Rôle |
|---|---|
| `_corps.html` | **La source du texte.** C'est le seul fichier à modifier. |
| `_style-protocole.css` | La feuille de style, qui prolonge celle de la plaquette |
| `_entete-plaquette.txt` | Entête repris de `plaquette/plaquette.html` (Inter en base64) |
| `assembler.mjs` | Recompose `protocole.html` — **la première commande de la chaîne** |
| `protocole.html` | Assemblé automatiquement — ne pas modifier |
| `_texte-protocole.json` | Structure extraite — ne pas modifier |
| `_apercu-docx.pdf` | Rendu du .docx par LibreOffice, pour relecture |
