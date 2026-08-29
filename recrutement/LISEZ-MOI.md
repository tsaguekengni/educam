# Recrutement — Référent pédagogique de terrain

> **Dernière mise à jour : 2026-08-20 UTC** · Ce dossier contient DEUX documents de
> recrutement, engendrés à la charte (mêmes verts, police Inter dans le PDF).

## Les deux documents

| Document | Fichiers | Usage |
|---|---|---|
| **Offre d'emploi** (annonce) | `EduCam_Offre_Referent_Pedagogique.pdf` / `.docx` | Le texte court qui présente le poste et attire le bon profil. 2 pages. |
| **Fiche de poste** (référence interne) | `EduCam_Fiche_Poste_Referent.pdf` / `.docx` | Le document détaillé : tout ce qu'on attend du titulaire, aligné sur le protocole pilote. 6 pages. |

Chaque document a **son propre fichier de contenu** et **ses propres commandes**, mais ils
partagent la même feuille de style et le même entête (police Inter), réutilisés depuis
`../protocole/` — on ne les duplique pas.

## Régénérer

**Offre d'emploi** — n'éditer que `_corps.html` :

```
node assembler.mjs   # ../protocole (entête + style) + _style-offre-extra.css + _corps.html → offre.html
node pdf.mjs         # offre.html → EduCam_Offre_Referent_Pedagogique.pdf
node extraire.mjs    # offre.html → _texte-offre.json  (lecture du DOM via Chromium)
node docx.mjs        # _texte-offre.json → .docx
```

**Fiche de poste** — n'éditer que `_corps-fiche.html` :

```
node assembler-fiche.mjs   # … + _corps-fiche.html → fiche.html
node pdf-fiche.mjs         # fiche.html → EduCam_Fiche_Poste_Referent.pdf
node extraire-fiche.mjs    # fiche.html → _texte-fiche.json
node docx-fiche.mjs        # _texte-fiche.json → .docx  (gère aussi tableaux + encart d'avertissement)
```

## Fichiers de travail

| Fichier | Rôle |
|---|---|
| `_corps.html` | **Contenu de l'offre** — le seul fichier de texte à modifier pour l'annonce. |
| `_corps-fiche.html` | **Contenu de la fiche de poste** — le seul fichier de texte à modifier pour la fiche. |
| `_style-offre-extra.css` | Mise en forme commune aux deux (bandeau d'en-tête, rythme des pages). |
| `assembler*.mjs · pdf*.mjs · extraire*.mjs · docx*.mjs` | La chaîne, en deux jeux (offre / fiche). |
| `offre.html · fiche.html · _texte-*.json` | Engendrés — ne pas éditer. |

## Ressources partagées — non dupliquées

Les deux `assembler` lisent `../protocole/_entete-plaquette.txt` (police Inter en base64) et
`../protocole/_style-protocole.css`. Si le dossier `protocole/` change de place, corriger
les deux chemins en tête des deux `assembler*.mjs`.

## À savoir sur la fiche de poste

- Elle est **alignée sur le protocole pilote** : chaque tâche renvoie à son article
  (Art. 5 engagements, 7 boucle quotidienne, 9 gouvernance, 10 critères de réussite,
  12 données des enfants).
- Le poste y est décrit en **périmètre unique** ; une ligne (§7) note que la revue des
  contenus pourra se spécialiser à mesure que le réseau grandit.
- Les cibles chiffrées (≥ 90 % / ≥ 70 %) sont reprises du protocole. Pour les laisser à
  confirmer école par école, les remettre en champs surlignés dans `_corps-fiche.html`.
- **Document interne** : à faire valider (RH / juridique) avant diffusion.

## Détail Chromium

`pdf*.mjs` et `extraire*.mjs` lancent `chromium.launch()` sans argument (Playwright trouve
son navigateur). La variable `PW_CHROMIUM` ne sert qu'à forcer un chemin d'exécutable si
l'environnement l'exige — inutile sur un poste ordinaire.

## Vérifier avant diffusion

Régénérer, puis **regarder les pages en image**
(`pdftoppm -jpeg -r 110 <fichier>.pdf p`) — jamais se fier à une coche verte. Contrôler
qu'aucun titre n'est orphelin, que le pied de page est cohérent, et ouvrir le `.docx`
converti en PDF (LibreOffice) pour vérifier son rendu.
