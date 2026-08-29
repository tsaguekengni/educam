# EduCam — jeu de démonstration

> **Dernière mise à jour : 2026-08-15 UTC** · Trois fichiers SQL à passer dans
> l'éditeur SQL de Supabase. Installation en une minute, suppression en dix secondes.

---

## 1. Où vivent les données

Il n'y a **pas de base locale**. `C:\dev\educam` ne contient que le code ;
toutes les données sont dans le projet Supabase `brrutnxaizdllthgcnqm`. Le jeu de
démonstration s'installe donc **en ligne** — ce qui a un avantage pour une
présentation : la démo est visible depuis n'importe quel poste, y compris un
téléphone que vous faites passer dans la salle.

---

## 2. Ordre d'exécution

Ouvrez l'éditeur SQL de Supabase et passez les fichiers **dans cet ordre**.

| # | Fichier | Pourquoi | Obligatoire ? |
|---|---|---|---|
| 1 | `claude-hard-lessons.sql` | crée `educam_hard_lessons` → le **« Signalement pédagogique »** du directeur | fortement recommandé |
| 2 | `claude-anomalies.sql` | crée `educam_anomalies` → la **console d'anomalies** du superadmin | fortement recommandé |
| 3 | `demo/demo-01-seed.sql` | installe la démonstration | **oui** |

Après la présentation, quand vous voulez :

| # | Fichier | Effet |
|---|---|---|
| 4 | `demo/demo-00-teardown.sql` | efface toute la démo, et rien d'autre |

**Ne passez pas `claude/timetable-cm1-8to4.sql` après le seed.** Il commence par
`DELETE FROM timetable_slots WHERE level='cm1'` et effacerait les emplois du temps
des classes de démonstration. Le seed installe lui-même ce gabarit s'il manque.

`claude-parent-tip.sql` n'est **pas** nécessaire : le conseil aux parents reste
derrière son drapeau, et l'écran parent est déjà complet sans lui.

---

## 3. Les comptes

**Mot de passe de tous les comptes : `Demo2026!`**

| Rôle | Identifiant | Ce qu'il montre |
|---|---|---|
| Superadmin | `admin@demo.educam.cm` | la console réseau : 3 écoles, adoption, anomalies |
| Direction — Deido | `direction.deido@demo.educam.cm` | **l'écran vedette** : carte de chaleur, alerte, élèves à suivre |
| Direction — Les Palmiers | `direction.palmiers@demo.educam.cm` | une école qui va bien, pour la comparaison |
| Direction — Saint-Michel | `direction.saintmichel@demo.educam.cm` | une école moyenne |
| Enseignante — Deido CM1-A | `kamga@demo.educam.cm` | classe en difficulté, 13 élèves sous la moyenne |
| Enseignant — Deido CM1-B | `mbida@demo.educam.cm` | classe qui va bien |
| Enseignante — Palmiers CM1-A | `nguele@demo.educam.cm` | la meilleure classe du réseau |
| Enseignant — Saint-Michel CM1-A | `tamo@demo.educam.cm` | celui dont la rafale de validations est signalée |
| **Parent de Junior** | `parent11@demo.educam.cm` | **l'écran parent vedette** |

Il y a en tout 16 comptes parents (`parent11`, `parent12`, … `parent74`), quatre
par classe de CM1. Un seul est utile en présentation : `parent11`.

> Votre propre compte administrateur continue de fonctionner et voit lui aussi
> les écoles de démonstration. Si un écran superadmin se comporte mal avec le
> compte de démo, repliez-vous sur le vôtre.

---

## 4. Ce que la démonstration raconte

Le jeu de données n'est pas du remplissage : il porte une histoire, et chaque
chiffre a été choisi pour qu'un écran dise quelque chose.

**Trois écoles, huit classes, 240 élèves, ~3 900 notes sur huit semaines.**

| École | Classe | Enseignant | Élèves | Moyenne | Avancement |
|---|---|---|---|---|---|
| Deido | CM1-A | Mme KAMGA | 36 | **11,0** · 13 sous la moyenne | **−3 semaines** sur l'unité 3 |
| Deido | CM1-B | M. MBIDA | 34 | 13,7 | −1 semaine |
| Deido | CM2-A · CE2-A | | 58 | — | pas encore commencé |
| Les Palmiers | CM1-A | Mme NGUELE | 32 | **15,3** | à jour |
| Les Palmiers | CE1-A | | 26 | — | pas encore commencé |
| Saint-Michel | CM1-A | M. TAMO | 30 | 12,5 | −1 puis −2 semaines |
| Saint-Michel | CM2-A | | 24 | — | pas encore commencé |

Les classes « pas encore commencé » sont **voulues**. Il n'existe de contenu que
pour le CM1, et une école réelle a toujours des classes qui n'ont pas démarré.
L'écran le dit au lieu d'inventer un zéro — c'est un argument, pas un manque.

**Les quatre anomalies s'allument, une fois chacune**, sur des cas construits :

| Règle | Cas installé |
|---|---|
| Leçon enseignée sans avoir été ouverte | Mme NGUELE, une leçon |
| Rafale de validations | M. TAMO, 5 leçons en 90 secondes |
| Enseignée, pas encore évaluée | M. MBIDA, deux leçons |
| Parent jamais connecté | 3 parents sur 16 |

Aucun faux positif : les 120 leçons enseignées ont toutes une ouverture
enregistrée avant leur validation, et les horaires sont espacés de 7 minutes
exprès. C'est vérifié — voir §7.

---

## 5. Le parcours, écran par écran

**Durée : 8 à 10 minutes.** Faites-le dans cet ordre, c'est une démonstration
qui monte.

### 1. L'enseignante — `kamga@demo.educam.cm`
> « Voilà ce que voit une enseignante en arrivant le matin. »

Accueil : le prochain cours, ses objectifs, le plan de la séance, l'état hors
ligne. **Ouvrez la leçon**, puis **le mode projecteur** — c'est le moment le plus
visuel de la démonstration, montrez-le en plein écran.

Puis **Résultats** : trois boutons par élève, « tout marquer acquis », les
raccourcis clavier `1` `2` `3`. Dites la phrase : *trente secondes pour toute la
classe*.

### 2. La direction — `direction.deido@demo.educam.cm`
> « Et voilà ce que la directrice voit, sans avoir rien demandé à personne. »

L'écran s'ouvre sur une **alerte rouge : CM1-A accuse 3 semaines de retard sur
l'unité 3**. Sous l'alerte, la carte de chaleur : une ligne par classe, une
colonne par unité, terracotta pour le retard, bleu pour l'avance, pointillés pour
ce qui n'a pas commencé.

Puis les **élèves à suivre** — les treize de CM1-A sous la moyenne, nommés — et
le **signalement pédagogique** : une leçon de mathématiques à ~41 % d'échec sur
les deux CM1. Dites : *ce n'est pas l'enseignante qui est en cause, c'est une
notion à reprendre.*

### 3. Le parent — `parent11@demo.educam.cm`
> « Et le père de Junior, sur son téléphone, ce soir. »

Moyenne 15,0 · une leçon à revoir · un message non lu. Ouvrez le message de
Mme KAMGA, puis **« Revoir cette leçon ensemble »** : le parent tombe sur la
leçon exacte que l'enseignante a faite en classe. C'est le moment qui fait
signer.

**Réduisez la fenêtre à moins de 900 px** avant de montrer cet écran, ou
ouvrez-le sur un vrai téléphone : c'est ainsi qu'un parent l'utilise.

### 4. Le superadmin — `admin@demo.educam.cm`
> « Et de notre côté, la vue du réseau. »

Trois écoles, courbes d'adoption, et la **console d'anomalies** : quatre règles,
quatre cas réels. Insistez sur le ton — *un motif de vérifier, jamais une
accusation*.

---

## 6. Avant de partir en présentation

- [ ] Les trois fichiers SQL sont passés, dans l'ordre du §2.
- [ ] Le tableau de contrôle en fin de seed affiche : **3 écoles · 8 classes ·
      240 élèves · 16 comptes parents · ~3 900 notes · 120 leçons enseignées ·
      28 comptes**.
- [ ] Les quatre comptes du §5 se connectent réellement. **Testez-les la veille**,
      pas cinq minutes avant.
- [ ] `npm run dev` tourne, ou la version en ligne est à jour.
- [ ] **La fenêtre du navigateur fait au moins 900 px de large** pour les écrans
      enseignant, direction et superadmin. Les outils de développement ancrés sur
      le côté rétrécissent la fenêtre sous ce seuil et écrasent toute la mise en
      page : c'est la panne la plus bête et elle est déjà arrivée.
- [ ] Vous avez un plan B hors ligne : la plaquette PDF, si le réseau lâche.

---

## 7. Comment ces fichiers ont été vérifiés

Je n'ai pas d'accès réseau à votre base Supabase. Le seed a donc été testé
autrement, et il l'a réellement été : j'ai monté un **PostgreSQL 16 local**,
reconstitué le schéma d'après le code et les migrations, chargé 36 leçons CM1
factices, puis exécuté :

1. `demo-01-seed.sql` → 3 écoles, 8 classes, 240 élèves, 3 886 notes ;
2. les cinq vues d'agrégation + `educam_hard_lessons` + `educam_anomalies` →
   moyennes de classe **15,3 · 13,7 · 12,5 · 11,0**, écarts de couverture
   **0 / −1 / −2 / −3 semaines**, leçon difficile à **41 %**, Junior à **15,0**
   avec exactement **une** leçon à revoir, et **une** occurrence de chacune des
   quatre anomalies ;
3. le seed **une deuxième fois** → chiffres identiques (idempotent) ;
4. des données « réelles » ajoutées à côté, puis `demo-00-teardown.sql` →
   **il ne restait que le réel**, et le gabarit d'emploi du temps partagé.

Trois défauts ont été trouvés et corrigés ainsi, dont un qui aurait été visible
en présentation : la leçon difficile, choisie par classe, était **diluée** par
l'agrégat d'école et retombait à 26 % — la carte du directeur restait muette.

**Ce que ce banc d'essai ne prouve pas**, et qu'il faut donc vérifier chez vous :

- la création de comptes dans `auth.users` dépend de la version de GoTrue de
  votre projet. Le script s'adapte à l'absence de `provider_id`, mais **testez
  une connexion tout de suite après le seed** ;
- si `claude/profiles-rls-rollout.sql` a été passé un jour, les politiques RLS
  s'appliquent. L'éditeur SQL les contourne pour l'écriture, mais la lecture
  depuis l'application pourrait filtrer. Là encore : testez une connexion ;
- le nombre exact de notes dépend du nombre réel de leçons CM1 en base.

---

## 8. Après la présentation

```
demo/demo-00-teardown.sql
```

Le contrôle en fin de fichier doit afficher **six zéros**. Si l'un ne l'est pas,
ne relancez rien : dites-le moi.
