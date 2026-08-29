# Plaquette EduCam — comment la modifier

Deux éditions, **deux fichiers sources indépendants** :

| Édition | Source | PDF | Captures |
|---|---|---|---|
| Français | `plaquette.html` | `EduCam_Presentation_Ecoles.pdf` | `shots/` |
| Anglais | `plaquette-en.html` | `EduCam_Presentation_Schools.pdf` | `shots-en/` |

Les deux partagent la **même feuille de style**, recopiée dans chaque fichier.
Une retouche de mise en page doit donc être portée **dans les deux**. C'est le prix
du choix « deux sources indépendantes » — en échange, chaque édition se modifie
sans risquer de casser l'autre.

Aucune des deux ne porte de personnalisation : ni nom d'école, ni date, ni
interlocuteur nommé. Le seul point de contact est le bloc de fin : Mansa Musa
Academy, `info@mansamusaacademy.com`, WhatsApp `+1 438 371 4344`.

## 1. Changer un mot, une phrase, un paragraphe

Ouvrez `plaquette.html` (ou `plaquette-en.html`) dans n'importe quel éditeur de
texte. Le texte est en clair entre les balises :

```html
<p>Deux classes du même niveau, dans la même école, peuvent vivre deux réalités…</p>
```

Modifiez ce qui est entre `<p>` et `</p>`, enregistrez, puis, depuis ce dossier :

```
node pdf.mjs        # édition française
node pdf-en.mjs     # édition anglaise
```

**Deux précautions.** N'effacez pas les chevrons `<` `>` ni ce qu'il y a dedans.
Et si vous ALLONGEZ un texte, lisez la sortie du script : il annonce toute page
dont le contenu déborderait sous le pied de page. Une page qui déborde est une
page dont la fin est coupée à l'impression. La sortie attendue est :

```
pages : 12
  aucun débordement
```

## 2. Relire chaque page à l'écran

```
node apercu.mjs      → apercu-01.png … apercu-12.png
node apercu-en.mjs   → apercu-en-01.png … apercu-en-12.png
```

Une image par page. C'est le moyen le plus rapide de vérifier un changement sans
ouvrir le PDF.

## 3. Changer la mise en page, ajouter ou retirer une page

Là, demandez-moi. Ce n'est pas une question de difficulté technique, c'est une
question de **pagination** : chaque édition fait 12 pages parce que c'est un
multiple de quatre, donc imprimable en cahier plié et agrafé sans page blanche.
Ajouter une page en casse la reliure ; il faut en ajouter ou en retirer **quatre
à la fois**, ou réorganiser le contenu.

## 4. Les captures anglaises — comment elles sont fabriquées

Les captures de l'édition anglaise montrent une **interface réellement en
anglais**, pas des écrans français sous-titrés. Elles sont produites en deux
temps, depuis la racine du dépôt :

```
node traduire-preview.mjs    # preview-static.html → preview-en.html
node shots-vente-en.mjs      # preview-en.html → plaquette/shots-en/
```

`traduire-preview.mjs` contient la table de correspondance français → anglais,
avec le **sous-système anglophone** assumé :

```
CM1 → Class 5      CE1 → Class 3      CE2 → Class 4      CM2 → Class 6
Littoral → South-West          École publique de Deido → Government School Buea
Mme Kamga → Mrs. Ngwa          M. Atangana (Directeur) → Mr. Ashu (Head Teacher)
M. Abena (parent) → Mr. Ebong  Junior ABENA → Junior EBONG
Amadou & Aïcha → Ayuk & Bih    galette → loaf of bread
```

Pour changer un libellé anglais dans une capture, modifiez la table puis
rejouez les deux commandes. Ne retouchez jamais un PNG à la main : il serait
écrasé au prochain rafraîchissement.

## Fichiers

| Fichier | Rôle |
|---|---|
| `EduCam_Presentation_Ecoles.pdf` | Le document final français |
| `EduCam_Presentation_Schools.pdf` | Le document final anglais |
| `plaquette.html` · `plaquette-en.html` | Les deux sources |
| `pdf.mjs` · `pdf-en.mjs` | Régénèrent le PDF + contrôlent la pagination |
| `apercu.mjs` · `apercu-en.mjs` | Régénèrent une image par page |
| `shots/` · `shots-en/` | Les dix captures de la plateforme, par langue |

## Impression

A4, quadrichromie, recto verso, reliure agrafée à cheval. Les fonds verts sont
pleins et sans dégradé, et le texte posé dessus est en graisse renforcée pour
rester lisible sur une machine d'imprimerie ordinaire. Aucune couleur claire ne
porte d'information seule.

## Rafraîchir les captures françaises

Elles viennent du code réel. Pour les remettre à jour après une évolution de
l'interface, demandez-moi : il faut remonter une route `/preview` dans
l'application et rejouer la capture.

> Un piège à connaître : la capture de l'espace parent **sur téléphone** doit être
> prise dans une fenêtre réellement étroite (412 px). Prise dans une fenêtre large,
> la requête média des 900 px s'applique et le rail de bureau vient s'écraser dans
> le cadre du téléphone.
