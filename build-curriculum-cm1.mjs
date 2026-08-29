// ============================================================
// EduCam — Rebuild CM1 curriculum_topics — FULLY LITTORAL-realigned
// (all subjects follow the Littoral répartition). Empty (component,unit)
// cells are intentional where the répartition schedules nothing that month.
//   node build-curriculum-cm1.mjs  ->  writes curriculum-cm1-rebuild.sql
// DATA["subject.component"] = { savoir, units: { <unit>: [ [title, desc], ... ] } }
// ============================================================
import { writeFileSync } from "fs";
const THEMES = ["La nature","Le village, la ville","L'école","Les métiers","Les voyages","La santé","Sports et loisirs","Dans l'espace"];
const DATA = {
  "maths.nombres-calculs": {
    "savoir": "Avoir un raisonnement cohérent et logique",
    "units": {
      "1": [
        [
          "Ensembles et grands nombres",
          "Utiliser le diagramme de Venn pour représenter des ensembles; Composer, décomposer les grands nombres entiers en utilisant des regroupements par millier (nombres jusqu'au million); Ajouter ou retrancher 10 à un nombre entier."
        ],
        [
          "Valeur des chiffres et opérations",
          "Déterminer la valeur de chaque chiffre dans un nombre; Calculer la somme et la différence des nombres entiers par un calcul en ligne ou posé; Ajouter ou retrancher 8, 9 à un nombre."
        ],
        [
          "Nombres de 9 chiffres",
          "Lire, écrire en chiffres et en lettres les nombres de 9 chiffres; Comparer, ranger les nombres entiers de 9 chiffres; Ajouter ou retrancher 18, 19 à un nombre."
        ]
      ],
      "2": [
        [
          "Ensembles et grands nombres",
          "Représenter l'union et l'intersection des ensembles dans le diagramme de Venn; encadrer et arrondir des grands nombres entiers de 9 chiffres, les repérer et les placer sur une droite graduée adaptée."
        ],
        [
          "Produit et preuve par 9",
          "Calculer le produit de deux entiers et faire une preuve par 9 pour vérifier la justesse du résultat; vérifier la vraisemblance d'un résultat en estimant son ordre de grandeur (pour l'addition, soustraction, multiplication)."
        ],
        [
          "Tables de multiplication",
          "Construire les tables de multiplication de 1 à 10."
        ]
      ],
      "3": [
        [
          "Notion de nombre décimal",
          "Utiliser l'inclusion et l'union dans la description et l'interprétation des situations de la vie courante; expliquer la notion de nombre décimal; lire et écrire un nombre décimal en lettres et en chiffres."
        ],
        [
          "Comparer et ranger les décimaux",
          "Repérer et placer un nombre décimal sur une demi-droite graduée; comparer et ranger des nombres décimaux; ajouter des compléments aux nombres décimaux pour obtenir l'unité (ex : 0,7+…=1)."
        ],
        [
          "Multiplier et calculer les décimaux",
          "Multiplier un nombre par 0,1 ; 0,5 ; 0,01 ; 0,001; calculer la somme et la différence des nombres décimaux par un calcul en ligne ou posé; calculer le produit d'un décimal par un entier ou d'un entier par un décimal par un calcul posé."
        ]
      ],
      "4": [
        [
          "Fractions et encadrement",
          "Encadrer des nombres décimaux par deux nombres entiers consécutifs; utiliser les termes demi, tiers, quart, dixième, centième pour nommer une fraction; écrire et lire en chiffres et en lettres les fractions; encadrer une fraction par deux nombres entiers consécutifs."
        ],
        [
          "Division et divisibilité",
          "Diviser des nombres entiers; diviser un nombre entier par un nombre décimal; facteur de divisibilité par 2, 3, 5."
        ],
        [
          "Multiplier et diviser par 10, 100, 1000",
          "Multiplier un nombre entier par 10, 100, 1000; diviser un nombre entier par 10, 100, 1000."
        ]
      ],
      "5": [
        [
          "Fractions : réduire, comparer",
          "Réduire les fractions au même dénominateur; simplifier les fractions; comparer les fractions à l'unité; établir la relation d'ordre avec les fractions de même dénominateur ou de même numérateur."
        ],
        [
          "Opérations sur les fractions",
          "Calculer la somme ou la différence de deux fractions ayant le même dénominateur; multiplier un nombre par une fraction; multiplier une fraction par un nombre entier; multiplier deux fractions."
        ],
        [
          "Calcul mental",
          "Calcul mental : multiplier un nombre par 5, 50, 500; multiplier un nombre par 0,5; diviser un nombre par 5, 50, 500."
        ]
      ],
      "6": [
        [
          "Les nombres complexes",
          "Les nombres complexes : Définir la notion de nombre complexe ; Écrire un nombre complexe sous forme de nombre entier ; Écrire un nombre entier sous forme de nombre complexe."
        ],
        [
          "Additionner et soustraire",
          "Calculs : Additionner les nombres complexes ; Soustraire les nombres complexes."
        ],
        [
          "Multiplier et diviser",
          "Calculs : Multiplier un nombre complexe par un nombre entier ; Diviser un nombre complexe par un nombre entier."
        ]
      ],
      "7": [
        [
          "Les mouvements uniformes",
          "Les mouvements uniformes : Définir les notions d'heure de départ et d'heure d'arrivée; Définir la notion de distance parcourue; Définir la notion de temps mis dans un trajet."
        ],
        [
          "Calculs de trajet",
          "Calculs : Calculer l'heure de départ et l'heure d'arrivée; Calculer la distance parcourue."
        ],
        [
          "Calculs de durée",
          "Calculs : Calculer le temps mis; Calculer la durée d'un trajet."
        ]
      ],
      "8": [
        [
          "Les opérations commerciales",
          "Les opérations commerciales : Définir les termes : gain, économie, dépense, perte, réduction, augmentation, remise, solde."
        ],
        [
          "Calculer les prix",
          "Calculs : Calculer le prix de vente ; Calculer le prix de revient ; Calculer le prix d'achat."
        ],
        [
          "Calculer perte et bénéfice",
          "Calculs : Calculer la perte ; Calculer le bénéfice, le gain."
        ]
      ]
    }
  },
  "maths.mesures-grandeurs": {
    "savoir": "Être précis et avoir le sens de la mesure et du jugement",
    "units": {
      "1": [
        [
          "Convertir les longueurs",
          "Convertir les unités de mesure de longueur en unités plus grandes que le mètre."
        ],
        [
          "Périmètre par formule",
          "Déterminer la mesure des périmètres en utilisant une formule (pour le carré, le rectangle)."
        ],
        [
          "Calculer des périmètres",
          "Calculer des périmètres en mobilisant les formules pour le carré, le rectangle et le cercle."
        ]
      ],
      "2": [
        [
          "Unités de capacité et volume",
          "Convertir les unités de mesure de capacités en unités plus grandes que le litre; connaître les unités usuelles de volume (cm3, dm3, m3), relations entre les unités."
        ],
        [
          "Volume du pavé et du cube",
          "Déterminer le volume d'un pavé droit ou d'un cube en se rapportant à un dénombrement d'unités."
        ],
        [
          "Calcul de volumes",
          "Calculer des volumes en mobilisant des formules pour un cube."
        ]
      ],
      "3": [
        [
          "Convertir les mesures de masse",
          "Convertir les mesures de masse."
        ],
        [
          "Convertir les mesures de masse (application)",
          "Convertir les mesures de masse."
        ],
        [
          "Convertir les mesures de masse (consolidation)",
          "Convertir les mesures de masse."
        ]
      ],
      "4": [
        [
          "Comparer des angles",
          "Comparer des angles avec des gabarits."
        ],
        [
          "Reproduire un angle",
          "Reproduire un angle donné en utilisant un gabarit."
        ],
        [
          "Mesurer un angle à l'équerre",
          "Mesurer à l'aide d'une équerre la valeur d'un angle (droit, aigu ou obtus)."
        ]
      ],
      "5": [
        [
          "Notion d'aire",
          "Définir la notion d'aire; comparer, classer et ranger des surfaces selon leurs aires sans avoir recours à la mesure (superposition et découpage)."
        ],
        [
          "Calcul des aires",
          "Déterminer la mesure de l'aire d'une surface à partir d'un pavage simple à l'aide d'une unité; calculer les aires du carré, du rectangle et du triangle."
        ],
        [
          "Unités de mesure d'aires",
          "Convertir et utiliser les unités usuelles de mesure d'aires : multiples et sous-multiples du m² et leurs relations."
        ]
      ],
      "6": [
        [
          "Les mesures de temps",
          "Les mesures de temps : Déterminer et utiliser les unités de mesure de durée et leurs relations (jour, semaine, heure, minute, seconde, mois, année, siècle, millénaire) ; Calculer la durée écoulée entre deux instants donnés."
        ],
        [
          "Les mesures de temps",
          "Les mesures de temps : Déterminer un instant donné à partir de la connaissance d'un autre instant et d'une durée."
        ],
        [
          "Les mesures de temps",
          "Les mesures de temps : Additionner et soustraire les durées."
        ]
      ],
      "7": [
        [
          "La monnaie",
          "La monnaie : Convertir la monnaie locale en monnaies étrangères."
        ],
        [
          "La monnaie (application)",
          "La monnaie : Convertir la monnaie locale en monnaies étrangères."
        ],
        [
          "La monnaie (consolidation)",
          "La monnaie : Convertir la monnaie locale en monnaies étrangères."
        ]
      ],
      "8": [
        [
          "Les intervalles",
          "Les intervalles : Créer des intervalles sur une portion donnée."
        ],
        [
          "Les intervalles (application)",
          "Les intervalles : Créer des intervalles sur une portion donnée."
        ],
        [
          "Les intervalles (consolidation)",
          "Les intervalles : Créer des intervalles sur une portion donnée."
        ]
      ]
    }
  },
  "maths.geometrie": {
    "savoir": "Avoir le sens du beau, être précis et fin",
    "units": {
      "1": [
        [
          "Le pentagone",
          "Caractériser et construire le pentagone."
        ],
        [
          "L'hexagone",
          "Caractériser et construire l'hexagone."
        ],
        [
          "L'octogone",
          "Caractériser et construire l'octogone."
        ]
      ],
      "2": [
        [
          "Notion d'angle",
          "Définir la notion d'angle; construire les différents types d'angles."
        ],
        [
          "Hauteur et médiane",
          "Construire la hauteur et la médiane d'un angle."
        ],
        [
          "Bissectrice d'un angle",
          "Construire la bissectrice d'un angle."
        ]
      ],
      "3": [
        [
          "Patron d'un cube",
          "Construire le patron d'un cube."
        ],
        [
          "Patron d'un pavé droit",
          "Construire le patron d'un pavé droit."
        ],
        [
          "Patron d'un cylindre",
          "Construire le patron d'un cylindre."
        ]
      ],
      "4": [
        [
          "Axe et symétrique d'une figure",
          "Tracer l'axe de symétrie d'une figure par rapport à un plan; tracer sur quadrillage le symétrique d'une figure."
        ],
        [
          "Symétrique par pliage",
          "Tracer par pliage le symétrique d'une figure."
        ],
        [
          "Axes de symétrie d'une figure",
          "Déterminer les axes de symétrie d'une figure simple."
        ]
      ],
      "5": [
        [
          "Le plan",
          "Le plan : déterminer les éléments constitutifs d'un plan; dessiner un plan."
        ],
        [
          "Échelle et plan",
          "Le plan : établir la relation entre échelle, dimension réelle et dimension sur le plan."
        ],
        [
          "Agrandissement et réduction",
          "Agrandissement et réduction : agrandir ou réduire une figure simple sur quadrillage."
        ]
      ],
      "8": [
        [
          "Le repérage sur le plan",
          "Le repérage : Se repérer sur le plan."
        ],
        [
          "Le repérage dans l'espace",
          "Le repérage : Se repérer dans l'espace."
        ],
        [
          "Positions et déplacements",
          "Le repérage : Utiliser un vocabulaire approprié pour définir des positions et des déplacements."
        ]
      ]
    }
  },
  "maths.statistiques": {
    "savoir": "Avoir un raisonnement cohérent, logique et précis",
    "units": {
      "1": [
        [
          "Situation et protocole d'enquête",
          "Déterminer une situation d'enquête; Construire un protocole d'enquête."
        ],
        [
          "Situation et protocole d'enquête (application)",
          "Déterminer une situation d'enquête; Construire un protocole d'enquête."
        ],
        [
          "Situation et protocole d'enquête (consolidation)",
          "Déterminer une situation d'enquête; Construire un protocole d'enquête."
        ]
      ],
      "2": [
        [
          "Moyenne arithmétique",
          "Calculer la moyenne arithmétique d'une suite de données numériques."
        ],
        [
          "Calculs de partage",
          "Effectuer des calculs de partage en utilisant les graphiques."
        ],
        [
          "Calculs de partage (application)",
          "Effectuer des calculs de partage en utilisant les graphiques."
        ]
      ],
      "3": [
        [
          "Moyenne arithmétique",
          "Calculer la moyenne arithmétique d'une suite de données numériques."
        ],
        [
          "Calculs de partage avec graphiques",
          "Effectuer des calculs de partage en utilisant les graphiques."
        ],
        [
          "Calculs de partage avec graphiques (application)",
          "Effectuer des calculs de partage en utilisant les graphiques."
        ]
      ],
      "4": [
        [
          "Notion de proportion",
          "Expliquer la notion de proportion."
        ],
        [
          "Coefficient de proportionnalité",
          "Calculer le coefficient de proportionnalité."
        ],
        [
          "Coefficient de proportionnalité (application)",
          "Calculer le coefficient de proportionnalité."
        ]
      ],
      "5": [
        [
          "Tableau à double entrée",
          "Tableaux et graphiques : lire un tableau à double entrée."
        ],
        [
          "Représenter dans un graphique",
          "Tableaux et graphiques : représenter les données dans un graphique."
        ],
        [
          "Représenter dans un graphique (application)",
          "Tableaux et graphiques : représenter les données dans un graphique."
        ]
      ],
      "7": [
        [
          "Les pourcentages",
          "Les pourcentages : Calculer un taux d'accroissement; Calculer le pourcentage d'une grandeur."
        ],
        [
          "Les pourcentages (application)",
          "Les pourcentages : Calculer un taux d'accroissement; Calculer le pourcentage d'une grandeur."
        ],
        [
          "Les pourcentages (consolidation)",
          "Les pourcentages : Calculer un taux d'accroissement; Calculer le pourcentage d'une grandeur."
        ]
      ],
      "8": [
        [
          "Les pourcentages",
          "Les pourcentages : Retrouver une valeur dont on connaît le pourcentage."
        ],
        [
          "Les pourcentages (application)",
          "Les pourcentages : Retrouver une valeur dont on connaît le pourcentage."
        ],
        [
          "Les pourcentages (consolidation)",
          "Les pourcentages : Retrouver une valeur dont on connaît le pourcentage."
        ]
      ]
    }
  },
  "sciences.sciences-vie": {
    "savoir": "Avoir le respect de la vie, être attentif à sa santé, avoir de l'empathie pour les autres",
    "units": {
      "1": [
        [
          "Les classes d'aliments",
          "Déterminer les classes d'aliments et définir le rôle de chaque aliment."
        ],
        [
          "Les besoins alimentaires",
          "Expliquer les besoins variables en aliments de l'être humain."
        ],
        [
          "L'hygiène alimentaire",
          "Appliquer l'hygiène alimentaire."
        ]
      ],
      "2": [
        [
          "Hygiène, puberté, reproduction",
          "Appliquer l'hygiène alimentaire; décrire les changements morphologiques et physiologiques liés à la puberté; schématiser et décrire l'appareil reproducteur mâle et femelle."
        ],
        [
          "Classification des animaux",
          "Identifier les catégories de classification des animaux; déterminer les différentes classes des vertébrés."
        ],
        [
          "Nutrition, locomotion, reproduction",
          "Expliquer les différents modes de nutrition des vertébrés; expliquer les différents modes de locomotion des vertébrés; expliquer les différents modes de reproduction des vertébrés."
        ]
      ],
      "3": [
        [
          "Digestion et appareil digestif",
          "Expliquer le mécanisme de la digestion chez l'homme; schématiser l'appareil digestif de l'homme; identifier les éléments qui composent le sang."
        ],
        [
          "Excrétion et appareil excréteur",
          "Définir l'excrétion; décrire l'appareil excréteur de l'homme; appliquer l'hygiène de l'appareil excréteur."
        ],
        [
          "Respiration et classes des végétaux",
          "Expliquer les différents modes de respiration des vertébrés; déterminer les différentes classes des végétaux."
        ]
      ],
      "4": [
        [
          "Circulation sanguine",
          "Expliquer le mécanisme de la circulation sanguine; schématiser l'appareil circulatoire; identifier les éléments qui composent le sang."
        ],
        [
          "Hygiène et accidents circulatoires",
          "Appliquer l'hygiène de la circulation sanguine; décrire les accidents de l'appareil circulatoire."
        ],
        [
          "Organes reproducteurs de la plante",
          "Décrire le rôle de chaque organe reproducteur de la plante à fleurs."
        ]
      ],
      "5": [
        [
          "Formation d'un fruit",
          "Reproduction des végétaux : expliquer les différentes étapes de la formation d'un fruit."
        ],
        [
          "Formation d'un fruit (application)",
          "Reproduction des végétaux : expliquer les différentes étapes de la formation d'un fruit."
        ],
        [
          "Formation d'un fruit (consolidation)",
          "Reproduction des végétaux : expliquer les différentes étapes de la formation d'un fruit."
        ]
      ],
      "6": [
        [
          "Le système nerveux et les sens",
          "Le système nerveux : expliquer ce qu'est le système nerveux et son rôle ; Décrire le parcours de l'influx nerveux dans les deux sens ; Appliquer l'hygiène du système nerveux. Les sens : Associer chaque organe de sens à son nerf ; Appliquer l'hygiène des organes de sens ; Identifier les maladies de la peau et des yeux."
        ],
        [
          "La respiration et les mouvements",
          "La respiration : Expliquer le mécanisme de la respiration chez l'homme ; Schématiser l'appareil respiratoire ; Appliquer l'hygiène de la respiration. Les mouvements : Déterminer les maladies et les accidents musculaires."
        ],
        [
          "Les ist et maladies endémiques",
          "Les IST : Expliquer la notion d'IST et VIH/SIDA. Les maladies : Identifier les maladies endémiques ; Expliquer les mesures de lutte contre les maladies endémiques ; Expliquer la différence entre maladies endémiques et épidémiques."
        ]
      ],
      "7": [
        [
          "Les mouvements : les muscles",
          "Les mouvements : Définir ce qu'est un muscle et décrire son rôle; Déterminer les types de muscles."
        ],
        [
          "Hygiène des muscles",
          "Les mouvements : Appliquer l'hygiène des muscles; Schématiser une articulation."
        ],
        [
          "Nutrition des végétaux",
          "Nutrition des végétaux : Déterminer les éléments nutritifs de la plante; Réaliser une expérience mettant en évidence la respiration et la transpiration des plantes vertes."
        ]
      ]
    }
  },
  "sciences.sciences-physiques": {
    "savoir": "Être curieux et prudent",
    "units": {
      "1": [
        [
          "Les états de la matière",
          "Identifier les quatre états de la matière."
        ],
        [
          "États et corps de la matière",
          "Identifier les quatre états de la matière; Associer des corps à des états de la matière."
        ],
        [
          "Associer corps et états",
          "Associer des corps à des états de la matière."
        ]
      ],
      "2": [
        [
          "Cycle de l'eau",
          "Expliquer et schématiser le cycle de l'eau."
        ],
        [
          "Cycle de l'eau (application)",
          "Expliquer et schématiser le cycle de l'eau."
        ],
        [
          "Cycle de l'eau (consolidation)",
          "Expliquer et schématiser le cycle de l'eau."
        ]
      ],
      "3": [
        [
          "Composantes de l'air",
          "Identifier les composantes de l'air."
        ],
        [
          "Notion d'oxydation",
          "Expliquer la notion d'oxydation (combustion lente); établir la différence entre une oxydation et une combustion vive."
        ],
        [
          "Matières oxydables et inoxydables",
          "Identifier les matières oxydables et les matières inoxydables."
        ]
      ],
      "7": [
        [
          "La lumière",
          "La lumière : Expliquer le phénomène de la réflexion et de la réfraction de la lumière."
        ],
        [
          "La lumière (application)",
          "La lumière : Expliquer le phénomène de la réflexion et de la réfraction de la lumière."
        ],
        [
          "La chaleur",
          "Chaleur : Expliquer le rôle de la chaleur dans la dilatation de certains corps."
        ]
      ],
      "8": [
        [
          "Les sources d'énergie",
          "Les sources d'énergie : Déterminer les sources d'énergie (fossile, hydraulique, solaire, éolienne)."
        ],
        [
          "Énergie renouvelable",
          "Les sources d'énergie : Expliquer la notion d'énergie renouvelable."
        ],
        [
          "Sources d'énergie renouvelables",
          "Les sources d'énergie : Déterminer les sources d'énergie renouvelables."
        ]
      ]
    }
  },
  "sciences.technologies": {
    "savoir": "Être inventif et créatif",
    "units": {
      "1": [
        [
          "Le courant électrique",
          "Déterminer les sources de production du courant électrique; Distinguer les dangers des avantages du courant électrique."
        ],
        [
          "Le circuit électrique",
          "Décrire le rôle des principaux éléments d'un circuit électrique."
        ],
        [
          "Montage série et parallèle",
          "Schématiser un montage en série et en parallèle."
        ]
      ],
      "2": [
        [
          "Lampe à pétrole",
          "Décrire le fonctionnement d'une lampe à pétrole."
        ],
        [
          "Lampe solaire et électrique",
          "Décrire le fonctionnement d'une lampe solaire et de la lampe électrique."
        ],
        [
          "Précautions des lampes",
          "Expliquer les précautions à prendre dans l'utilisation de la lampe à pétrole, de la lampe électrique et de la lampe solaire."
        ]
      ],
      "3": [
        [
          "Translation et rotation",
          "Distinguer un mouvement de translation d'un mouvement de rotation."
        ],
        [
          "Transformer rotation en translation",
          "Distinguer des outils ou des appareils qui transforment les mouvements de rotation en mouvement de translation."
        ],
        [
          "Transformer rotation en translation (application)",
          "Distinguer des outils ou des appareils qui transforment les mouvements de rotation en mouvement de translation."
        ]
      ],
      "4": [
        [
          "Notion de magnétisme",
          "Expliquer la notion de magnétisme."
        ],
        [
          "Propriétés des aimants",
          "Déterminer les propriétés des aimants."
        ],
        [
          "Aimanter un corps",
          "Expliquer comment aimanter un corps."
        ]
      ],
      "8": [
        [
          "Sécurisation des machines",
          "Sécurisation des machines et des appareils : Expliquer les mesures de sécurité à prendre pour protéger les machines et les appareils électriques."
        ],
        [
          "Sécurisation des machines (application)",
          "Sécurisation des machines et des appareils : Expliquer les mesures de sécurité à prendre pour protéger les machines et les appareils électriques."
        ],
        [
          "Sécurisation des machines (consolidation)",
          "Sécurisation des machines et des appareils : Expliquer les mesures de sécurité à prendre pour protéger les machines et les appareils électriques."
        ]
      ]
    }
  },
  "sciences.sciences-terre": {
    "savoir": "Avoir l'esprit scientifique",
    "units": {
      "1": [
        [
          "Classer sols et roches",
          "Classer les sols et les roches selon leurs caractéristiques."
        ],
        [
          "Classer sols et roches (application)",
          "Classer les sols et les roches selon leurs caractéristiques."
        ],
        [
          "Classer sols et roches (consolidation)",
          "Classer les sols et les roches selon leurs caractéristiques."
        ]
      ],
      "2": [
        [
          "Classer sols et roches",
          "Classer les sols et les roches selon leurs caractéristiques."
        ],
        [
          "Classer sols et roches (application)",
          "Classer les sols et les roches selon leurs caractéristiques."
        ],
        [
          "Classer sols et roches (consolidation)",
          "Classer les sols et les roches selon leurs caractéristiques."
        ]
      ],
      "3": [
        [
          "Structure d'un volcan",
          "Schématiser et annoter la structure d'un volcan."
        ],
        [
          "Signes d'une éruption volcanique",
          "Déterminer les signes prémonitoires d'une éruption volcanique."
        ],
        [
          "Protection pendant un séisme",
          "Présenter les mesures de protection pendant un séisme."
        ]
      ],
      "4": [
        [
          "Le séisme",
          "Définir un séisme; expliquer les conséquences d'un séisme."
        ],
        [
          "Le séisme (application)",
          "Définir un séisme; expliquer les conséquences d'un séisme."
        ],
        [
          "Le séisme (consolidation)",
          "Définir un séisme; expliquer les conséquences d'un séisme."
        ]
      ],
      "5": [
        [
          "Le séisme",
          "Le séisme ou tremblement de terre : expliquer comment se comporter en cas de séisme."
        ],
        [
          "Le séisme (application)",
          "Le séisme ou tremblement de terre : expliquer comment se comporter en cas de séisme."
        ],
        [
          "Le séisme (consolidation)",
          "Le séisme ou tremblement de terre : expliquer comment se comporter en cas de séisme."
        ]
      ],
      "6": [
        [
          "Les phénomènes naturels",
          "Les phénomènes naturels : Identifier les dangers que présentent certains phénomènes naturels (tempête, ouragan, séisme, volcanisme, tsunami, etc.)."
        ],
        [
          "Les phénomènes naturels (application)",
          "Les phénomènes naturels : Identifier les dangers que présentent certains phénomènes naturels (tempête, ouragan, séisme, volcanisme, tsunami, etc.)."
        ],
        [
          "Les phénomènes naturels (consolidation)",
          "Les phénomènes naturels : Identifier les dangers que présentent certains phénomènes naturels (tempête, ouragan, séisme, volcanisme, tsunami, etc.)."
        ]
      ],
      "8": [
        [
          "Les fossiles",
          "Les fossiles : Expliquer la notion de fossiles ; Identifier différents types de fossiles."
        ],
        [
          "Les fossiles (application)",
          "Les fossiles : Expliquer la notion de fossiles ; Identifier différents types de fossiles."
        ],
        [
          "Les fossiles (consolidation)",
          "Les fossiles : Expliquer la notion de fossiles ; Identifier différents types de fossiles."
        ]
      ]
    }
  },
  "sciences.agropastoral": {
    "savoir": "Avoir de l'estime pour les activités agropastorales",
    "units": {
      "1": [
        [
          "Aménagement des sols",
          "Expliquer les techniques d'aménagement des sols."
        ],
        [
          "Amélioration des sols cultivables",
          "Expliquer les techniques d'amélioration des sols cultivables (drainage, irrigation, amendement, assolement, jachère)."
        ],
        [
          "Enrichissement du sol",
          "Expliquer la notion d'enrichissement du sol."
        ]
      ],
      "2": [
        [
          "Fabrication du compost",
          "Déterminer les éléments qui entrent dans la fabrication du compost."
        ],
        [
          "Fabrication du compost (application)",
          "Déterminer les éléments qui entrent dans la fabrication du compost."
        ],
        [
          "Fabrication du compost (consolidation)",
          "Déterminer les éléments qui entrent dans la fabrication du compost."
        ]
      ],
      "3": [
        [
          "Lutter contre les ennemis des plantes",
          "Décrire comment lutter contre les ennemis des plantes."
        ],
        [
          "Lutter contre les ennemis des plantes (application)",
          "Décrire comment lutter contre les ennemis des plantes."
        ],
        [
          "Lutter contre les ennemis des plantes (consolidation)",
          "Décrire comment lutter contre les ennemis des plantes."
        ]
      ],
      "4": [
        [
          "Calendrier agricole",
          "Établir un calendrier agricole."
        ],
        [
          "Espèces de poissons locales",
          "Distinguer les espèces de poissons élevés dans sa localité."
        ],
        [
          "Nutrition des poissons",
          "Décrire la technique de nutrition des poissons."
        ]
      ],
      "5": [
        [
          "Autres élevages",
          "Autres élevages (aviculture, cuniculture, héliciculture…) : expliquer le type d'élevage pratiqué dans la localité."
        ],
        [
          "Autres élevages (application)",
          "Autres élevages (aviculture, cuniculture, héliciculture…) : expliquer le type d'élevage pratiqué dans la localité."
        ],
        [
          "Fabrication de la provende",
          "Autres élevages (aviculture, cuniculture, héliciculture…) : décrire les éléments qui entrent dans la fabrication de la provende."
        ]
      ],
      "6": [
        [
          "Production animale",
          "L'amélioration de la production animale : Expliquer différentes techniques de la production animale."
        ],
        [
          "Production animale (application)",
          "L'amélioration de la production animale : Expliquer différentes techniques de la production animale."
        ],
        [
          "Production animale (consolidation)",
          "L'amélioration de la production animale : Expliquer différentes techniques de la production animale."
        ]
      ]
    }
  },
  "sciences.environnement": {
    "savoir": "Avoir le sens du respect et de la protection de l'environnement, être soucieux du futur",
    "units": {
      "1": [
        [
          "Les problématiques de l'eau",
          "Analyser les problématiques de l'eau par rapport à la vie des animaux et des plantes."
        ],
        [
          "Les ressources minières",
          "Analyser les problématiques des ressources minières."
        ],
        [
          "La gestion des déchets",
          "Expliquer comment gérer les déchets ou les ordures dans la nature (plastiques, papiers, déchets ménagers etc.)."
        ]
      ],
      "2": [
        [
          "Gérer l'eau",
          "Expliquer comment gérer l'eau du puits, de la source ou du forage au village ou au quartier."
        ],
        [
          "Gérer l'eau (application)",
          "Expliquer comment gérer l'eau du puits, de la source ou du forage au village ou au quartier."
        ],
        [
          "Gérer les ordures",
          "Expliquer comment gérer les ordures au village ou au quartier (plastiques, papier, bouteilles…)."
        ]
      ],
      "3": [
        [
          "Gérer l'eau à l'école",
          "Expliquer comment gérer l'eau du robinet, du puits, de la source ou du forage à l'école."
        ],
        [
          "Gérer l'eau à l'école (application)",
          "Expliquer comment gérer l'eau du robinet, du puits, de la source ou du forage à l'école."
        ],
        [
          "Gérer les ordures à l'école",
          "Expliquer comment gérer les ordures à l'école (plastiques, papier, déchets ménagers…)."
        ]
      ],
      "4": [
        [
          "Gérer les déchets industriels",
          "Identifier les déchets industriels; expliquer comment gérer les déchets industriels."
        ],
        [
          "Gérer les déchets industriels (application)",
          "Identifier les déchets industriels; expliquer comment gérer les déchets industriels."
        ],
        [
          "Gérer les déchets industriels (consolidation)",
          "Identifier les déchets industriels; expliquer comment gérer les déchets industriels."
        ]
      ],
      "5": [
        [
          "Gestion de l'eau en voyage",
          "Le développement durable : expliquer comment gérer de l'eau pendant les voyages."
        ],
        [
          "Gestion de l'eau en voyage (application)",
          "Le développement durable : expliquer comment gérer de l'eau pendant les voyages."
        ],
        [
          "Gestion des déchets en voyage",
          "Le développement durable : expliquer comment gérer les déchets ou les ordures pendant les voyages (plastiques, papiers, déchets ménagers, etc.)."
        ]
      ],
      "6": [
        [
          "Les écosystèmes",
          "Les écosystèmes : Expliquer la notion d'écosystème ; Décrire le rôle de chaque être vivant dans son écosystème ; Déterminer les types de relations qui peuvent exister entre les êtres vivants ; Sensibiliser sur l'importance de l'équilibre d'un écosystème."
        ],
        [
          "Les écosystèmes (application)",
          "Les écosystèmes : Expliquer la notion d'écosystème ; Décrire le rôle de chaque être vivant dans son écosystème ; Déterminer les types de relations qui peuvent exister entre les êtres vivants ; Sensibiliser sur l'importance de l'équilibre d'un écosystème."
        ],
        [
          "Les écosystèmes (consolidation)",
          "Les écosystèmes : Expliquer la notion d'écosystème ; Décrire le rôle de chaque être vivant dans son écosystème ; Déterminer les types de relations qui peuvent exister entre les êtres vivants ; Sensibiliser sur l'importance de l'équilibre d'un écosystème."
        ]
      ],
      "7": [
        [
          "Le développement durable",
          "Le développement durable : Expliquer la notion de développement durable."
        ],
        [
          "Impact de l'homme",
          "Le développement durable : Déterminer l'impact de l'action de l'homme sur l'environnement à court et à long terme (pénurie, destruction des sols…)."
        ],
        [
          "Gestion durable des ressources",
          "Le développement durable : Décrire les techniques de gestion durable des ressources naturelles disponibles."
        ]
      ],
      "8": [
        [
          "Réchauffement climatique",
          "Réchauffement climatique : Identifier les mesures préconisées pour lutter contre le réchauffement climatique."
        ],
        [
          "L'effet de serre",
          "L'effet de serre : Expliquer la notion d'effet de serre ; Expliquer comment se produit l'effet de serre."
        ],
        [
          "Les aires protégées",
          "Les aires protégées : Expliquer l'importance des aires et des espèces protégées."
        ]
      ]
    }
  },
  "francais.grammaire": {
    "savoir": "Être un communicateur efficace et correct",
    "units": {
      "1": [
        [
          "Les adjectifs indéfinis",
          "Identifier les adjectifs indéfinis; Indiquer les fonctions des adjectifs indéfinis."
        ],
        [
          "Les adjectifs ordinaux",
          "Identifier les adjectifs ordinaux; Indiquer les fonctions des adjectifs ordinaux."
        ],
        [
          "Les adjectifs cardinaux",
          "Identifier les adjectifs cardinaux; Indiquer les fonctions des adjectifs cardinaux."
        ]
      ],
      "2": [
        [
          "Formes de phrases",
          "Identifier les formes de phrases (négatives, affirmatives, interronégatives)."
        ],
        [
          "Pronoms et groupes",
          "Identifier les pronoms indéfinis et les pronoms relatifs; identifier le groupe nominal; identifier le groupe verbal."
        ],
        [
          "Fonctions des pronoms",
          "Identifier les fonctions des pronoms indéfinis, des pronoms relatifs, du nom et du groupe nominal."
        ]
      ],
      "3": [
        [
          "Identifier les types de phrases",
          "Identifier les types de phrases (déclarative, négative, interrogative, injonctive)."
        ],
        [
          "Conjonctions de subordination",
          "Identifier les conjonctions de subordination."
        ],
        [
          "Fonctions des conjonctions de coordination",
          "Indiquer les fonctions des conjonctions de coordination."
        ]
      ],
      "4": [
        [
          "Voix active et passive",
          "Identifier les différentes voix (active et passive)."
        ],
        [
          "Identifier les adverbes",
          "Identifier les adverbes (manière, lieu, quantité, temps)."
        ],
        [
          "Fonctions des adverbes",
          "Indiquer les fonctions des adverbes."
        ]
      ],
      "5": [
        [
          "Notion de proposition",
          "Définir la notion de proposition."
        ],
        [
          "Nombre de propositions",
          "Trouver le nombre de proposition dans une phrase ou dans un texte."
        ],
        [
          "Types de propositions",
          "Identifier les types de propositions."
        ]
      ],
      "6": [
        [
          "La proposition principale",
          "La proposition : Identifier la proposition principale."
        ],
        [
          "Propositions subordonnées",
          "La proposition : Identifier les propositions subordonnées."
        ],
        [
          "Propositions subordonnées (application)",
          "La proposition : Identifier les propositions subordonnées."
        ]
      ],
      "7": [
        [
          "La proposition",
          "La proposition : Identifier la proposition principale et la proposition subordonnée relative."
        ],
        [
          "La proposition (application)",
          "La proposition : Identifier la proposition principale et la proposition subordonnée relative."
        ],
        [
          "La proposition (consolidation)",
          "La proposition : Identifier la proposition principale et la proposition subordonnée relative."
        ]
      ],
      "8": [
        [
          "Analyser logiquement une phrase",
          "La phrase : Analyser logiquement une phrase."
        ],
        [
          "Analyser logiquement une phrase (application)",
          "La phrase : Analyser logiquement une phrase."
        ],
        [
          "Analyser logiquement une phrase (consolidation)",
          "La phrase : Analyser logiquement une phrase."
        ]
      ]
    }
  },
  "francais.conjugaison": {
    "savoir": "Être un communicateur efficace et précis",
    "units": {
      "1": [
        [
          "Les états du verbe",
          "Identifier les différents états du verbe."
        ],
        [
          "Les types de verbes",
          "Identifier les types de verbes."
        ],
        [
          "Les groupes des verbes",
          "Identifier les différents groupes des verbes."
        ]
      ],
      "2": [
        [
          "Temps du mode indicatif",
          "Conjuguer les verbes aux temps simples et aux temps composés du mode indicatif."
        ],
        [
          "Temps du mode indicatif (application)",
          "Conjuguer les verbes aux temps simples et aux temps composés du mode indicatif."
        ],
        [
          "Temps du mode indicatif (consolidation)",
          "Conjuguer les verbes aux temps simples et aux temps composés du mode indicatif."
        ]
      ],
      "3": [
        [
          "Emploi du mode impératif",
          "Expliquer l'emploi du mode impératif."
        ],
        [
          "Conjuguer à l'impératif",
          "Conjuguer les verbes aux temps simples et aux temps composés du mode impératif."
        ],
        [
          "Conjuguer à l'impératif (application)",
          "Conjuguer les verbes aux temps simples et aux temps composés du mode impératif."
        ]
      ],
      "4": [
        [
          "Emploi du mode conditionnel",
          "Expliquer l'emploi du mode conditionnel."
        ],
        [
          "Conjuguer au conditionnel présent",
          "Conjuguer les verbes au conditionnel présent."
        ],
        [
          "Conjuguer au conditionnel présent (application)",
          "Conjuguer les verbes au conditionnel présent."
        ]
      ],
      "5": [
        [
          "Emploi du subjonctif",
          "Expliquer l'emploi du mode subjonctif."
        ],
        [
          "Subjonctif présent",
          "Conjuguer les verbes au subjonctif présent."
        ],
        [
          "Subjonctif présent (application)",
          "Conjuguer les verbes au subjonctif présent."
        ]
      ],
      "6": [
        [
          "Le mode participe",
          "Le mode participe : Expliquer l'emploi du mode participe."
        ],
        [
          "Le mode participe (application)",
          "Le mode participe : Expliquer l'emploi du mode participe."
        ],
        [
          "Le mode participe (consolidation)",
          "Le mode participe : Expliquer l'emploi du mode participe."
        ]
      ],
      "7": [
        [
          "La concordance des temps",
          "La concordance des temps : Faire la concordance des temps en relation avec la chronologie des faits."
        ],
        [
          "La concordance des temps (application)",
          "La concordance des temps : Faire la concordance des temps en relation avec la chronologie des faits."
        ],
        [
          "La concordance des temps (consolidation)",
          "La concordance des temps : Faire la concordance des temps en relation avec la chronologie des faits."
        ]
      ],
      "8": [
        [
          "La concordance des temps",
          "La concordance des temps : Faire la concordance des temps en relation avec la chronologie des faits."
        ],
        [
          "La concordance des temps (application)",
          "La concordance des temps : Faire la concordance des temps en relation avec la chronologie des faits."
        ],
        [
          "La concordance des temps (consolidation)",
          "La concordance des temps : Faire la concordance des temps en relation avec la chronologie des faits."
        ]
      ]
    }
  },
  "francais.vocabulaire": {
    "savoir": "Être un locuteur pertinent",
    "units": {
      "1": [
        [
          "Classe et sens des mots",
          "Trouver la classe d'un mot et sa signification; Utiliser au sens propre et au sens figuré les mots."
        ],
        [
          "Les différents sens des mots",
          "Donner en contexte les différents sens des mots."
        ],
        [
          "Le champ lexical de la maison",
          "Définir le champ lexical en rapport avec la maison."
        ]
      ],
      "2": [
        [
          "Sens commun et synonymes",
          "Définir un mot en utilisant son sens commun; définir les synonymes, les antonymes et les homonymes."
        ],
        [
          "Champ lexical village et ville",
          "Définir le champ lexical en rapport avec le village et la ville."
        ],
        [
          "Les sens d'un mot",
          "Identifier les différents sens d'un mot."
        ]
      ],
      "3": [
        [
          "Définir les homographes",
          "Définir les homographes."
        ],
        [
          "Définir les paronymes",
          "Définir les paronymes."
        ],
        [
          "Champ lexical de l'école",
          "Définir le champ lexical en rapport avec l'école."
        ]
      ],
      "4": [
        [
          "Champ lexical des métiers",
          "Définir le champ lexical en rapport avec les métiers."
        ],
        [
          "Regrouper les mots par radical",
          "Regrouper les mots par radical."
        ],
        [
          "Regrouper les mots par radical (application)",
          "Regrouper les mots par radical."
        ]
      ],
      "5": [
        [
          "Famille de mots",
          "Définir famille des mots."
        ],
        [
          "Champ lexical des voyages",
          "Définir le champ lexical en rapport avec les voyages."
        ],
        [
          "Champ lexical des voyages (application)",
          "Définir le champ lexical en rapport avec les voyages."
        ]
      ],
      "6": [
        [
          "Les niveaux de langue",
          "Les niveaux de langue : Identifier les différents niveaux de langue (familier, courant, soutenu)."
        ],
        [
          "Les niveaux de langue (application)",
          "Les niveaux de langue : Identifier les différents niveaux de langue (familier, courant, soutenu)."
        ],
        [
          "Le champ lexical",
          "Le champ lexical : Définir le champ lexical en rapport avec la santé."
        ]
      ],
      "7": [
        [
          "Les niveaux de langue",
          "Les niveaux de langue : Identifier les différents niveaux de langue (familier, courant, soutenu)."
        ],
        [
          "Les niveaux de langue (application)",
          "Les niveaux de langue : Identifier les différents niveaux de langue (familier, courant, soutenu)."
        ],
        [
          "Le champ lexical",
          "Le champ lexical : Définir le champ lexical en rapport avec les jeux."
        ]
      ],
      "8": [
        [
          "Les proverbes",
          "Proverbes : Utiliser les proverbes de la langue française."
        ],
        [
          "Les proverbes (application)",
          "Proverbes : Utiliser les proverbes de la langue française."
        ],
        [
          "Le champ lexical",
          "Le champ lexical : Définir le champ lexical en rapport avec les communications."
        ]
      ]
    }
  },
  "francais.orthographe": {
    "savoir": "Être rédacteur correct et efficace",
    "units": {
      "1": [
        [
          "Utiliser le dictionnaire",
          "Repérer facilement les mots dans un dictionnaire."
        ],
        [
          "La graphie en ac, ab, ad",
          "Appliquer correctement la règle de la graphie des mots commençant par ac, ab, ad."
        ],
        [
          "La virgule et le point",
          "Utiliser correctement la virgule et le point."
        ]
      ],
      "2": [
        [
          "Graphie ef, of",
          "Appliquer correctement la règle de la graphie des mots commençant par ef, of."
        ],
        [
          "Graphie a et à",
          "Appliquer correctement la règle de la graphie de a et à."
        ],
        [
          "Accord sujet-verbe",
          "Accorder correctement le verbe avec son sujet, avec plusieurs sujets, avec un sujet inversé."
        ]
      ],
      "3": [
        [
          "Point-virgule et deux points",
          "Utiliser correctement le point-virgule et les deux points."
        ],
        [
          "Graphie des mots en « ap »",
          "Appliquer correctement la règle de la graphie des mots commençant par ap."
        ],
        [
          "Graphie de et/est",
          "Appliquer correctement la règle de la graphie de et/est."
        ]
      ],
      "4": [
        [
          "Point d'exclamation et interrogation",
          "Utiliser correctement le point d'exclamation et le point d'interrogation."
        ],
        [
          "Graphie des mots en «ai»",
          "Appliquer correctement la règle de la graphie des mots commençant par «ai»."
        ],
        [
          "Participe passé avec être",
          "Écrire correctement le participe passé employé avec l'auxiliaire être."
        ]
      ],
      "5": [
        [
          "Points de suspension et tiret",
          "Utiliser correctement les trois points de suspension et le tiret."
        ],
        [
          "Graphie al, ar, as",
          "Appliquer correctement la règle de la graphie des mots commençant par al, ar, as."
        ],
        [
          "Homonymes son et sont",
          "Appliquer correctement la règle de la graphie des homonymes grammaticaux son et sont."
        ]
      ],
      "6": [
        [
          "Les signes de ponctuation",
          "Les signes de ponctuation : Utiliser correctement les parenthèses et les guillemets."
        ],
        [
          "Les homonymes grammaticaux",
          "Les homonymes grammaticaux : Appliquer correctement la règle de la graphie des homonymes grammaticaux (ma/m'a ; mon/m'ont)."
        ],
        [
          "Accord des adjectifs",
          "Accord des adjectifs : accorder correctement les adjectifs nu et demi."
        ]
      ],
      "7": [
        [
          "Homonymes grammaticaux",
          "Homonymes grammaticaux : Appliquer correctement la règle de la graphie des homonymes grammaticaux (mes, m'est, mais)."
        ],
        [
          "Participe passé avec « avoir »",
          "Accord du participe passé employé avec l'auxiliaire « avoir » : Accorder correctement le participe passé employé avec l'auxiliaire « avoir »."
        ],
        [
          "Participe passé verbes pronominaux",
          "Accord du participe passé des verbes pronominaux : Accorder correctement le participe passé des verbes pronominaux."
        ]
      ],
      "8": [
        [
          "Homonymes grammaticaux",
          "Homonymes grammaticaux : Appliquer correctement la règle de la graphie des homonymes grammaticaux (la/l'a ; peu/peut ; ni/n'y…)."
        ],
        [
          "Homonymes grammaticaux (application)",
          "Homonymes grammaticaux : Appliquer correctement la règle de la graphie des homonymes grammaticaux (la/l'a ; peu/peut ; ni/n'y…)."
        ],
        [
          "Mots en -ament, -amment…",
          "Appliquer correctement la règle de la graphie des mots se terminant par : ament ; amment ; ement ; emment ; ence."
        ]
      ]
    }
  },
  "francais.expression-orale": {
    "savoir": "Être un locuteur efficace qui sait écouter et s'exprimer de façon précise et correcte",
    "units": {
      "1": [
        [
          "Réagir et formuler ses idées",
          "Réagir efficacement à une consigne; Formuler clairement ses idées."
        ],
        [
          "Réagir et formuler ses idées (application)",
          "Réagir efficacement à une consigne; Formuler clairement ses idées."
        ],
        [
          "Réagir et formuler ses idées (consolidation)",
          "Réagir efficacement à une consigne; Formuler clairement ses idées."
        ]
      ],
      "2": [
        [
          "Réagir à une demande",
          "Réagir efficacement à une demande; s'exprimer de façon cohérente et structurée."
        ],
        [
          "Réagir à une consigne",
          "Réagir efficacement à une consigne; s'exprimer de façon cohérente et structurée."
        ],
        [
          "Réagir à une consigne (application)",
          "Réagir efficacement à une consigne; s'exprimer de façon cohérente et structurée."
        ]
      ],
      "3": [
        [
          "Réagir à un récit écouté",
          "Réagir efficacement à récit écouté."
        ],
        [
          "Utiliser les éléments prosodiques",
          "Utiliser de manière appropriée les éléments prosodiques que sont : le rythme, les intonations et le débit, le volume."
        ],
        [
          "Débattre sur un thème",
          "Débattre sur un thème choisi dans les textes lus en lecture."
        ]
      ],
      "4": [
        [
          "Réagir en communication orale",
          "Réagir efficacement à une action vue ou propos entendus au cours d'une situation de communication orale."
        ],
        [
          "Réagir en communication orale (application)",
          "Réagir efficacement à une action vue ou propos entendus au cours d'une situation de communication orale."
        ],
        [
          "Explorer verbalement divers sujets",
          "Explorer verbalement divers sujets avec autrui pour construire sa pensée."
        ]
      ],
      "5": [
        [
          "Règles de communication",
          "Respecter les règles de communication établies au cours d'une discussion."
        ],
        [
          "Règles de communication (application)",
          "Respecter les règles de communication établies au cours d'une discussion."
        ],
        [
          "Règles de communication (consolidation)",
          "Respecter les règles de communication établies au cours d'une discussion."
        ]
      ],
      "6": [
        [
          "Compte-rendu oral",
          "Faire un compte-rendu oral d'une situation vécue, entendue ou lue en respectant la chronologie des faits et en utilisant un registre de langue et un vocabulaire appropriés."
        ],
        [
          "Compte-rendu oral (application)",
          "Faire un compte-rendu oral d'une situation vécue, entendue ou lue en respectant la chronologie des faits et en utilisant un registre de langue et un vocabulaire appropriés."
        ],
        [
          "Compte-rendu oral (consolidation)",
          "Faire un compte-rendu oral d'une situation vécue, entendue ou lue en respectant la chronologie des faits et en utilisant un registre de langue et un vocabulaire appropriés."
        ]
      ],
      "7": [
        [
          "Poésie : déclamer un poème",
          "Poésie : Déclamer un poème."
        ],
        [
          "Poésie : déclamer un poème (application)",
          "Poésie : Déclamer un poème."
        ],
        [
          "Poésie : déclamer un poème (consolidation)",
          "Poésie : Déclamer un poème."
        ]
      ],
      "8": [
        [
          "Poésie : déclamer un poème",
          "Poésie : Déclamer un poème."
        ],
        [
          "Poésie : déclamer un poème (application)",
          "Poésie : Déclamer un poème."
        ],
        [
          "Poésie : déclamer un poème (consolidation)",
          "Poésie : Déclamer un poème."
        ]
      ]
    }
  },
  "francais.production-ecrits": {
    "savoir": "Être un rédacteur efficace et performant",
    "units": {
      "1": [
        [
          "Résumer un texte narratif",
          "Former les caractères d'écriture; Résumer un texte narratif et descriptif."
        ],
        [
          "Résumer un texte injonctif",
          "Former les caractères d'écriture; Résumer un texte injonctif."
        ],
        [
          "Résumer un texte poétique",
          "Former les caractères d'écriture; Résumer un texte poétique."
        ]
      ],
      "2": [
        [
          "Écriture manuscrite et rédaction",
          "Former les caractères d'écriture manuscrite; rédiger un texte selon les consignes précises."
        ],
        [
          "Écriture manuscrite et rédaction (application)",
          "Former les caractères d'écriture manuscrite; rédiger un texte selon les consignes précises."
        ],
        [
          "Écriture manuscrite et rédaction (consolidation)",
          "Former les caractères d'écriture manuscrite; rédiger un texte selon les consignes précises."
        ]
      ],
      "3": [
        [
          "Produire différents types d'écrits",
          "Produire différents types d'écrits (texte narratif, descriptif, injonctif, poétique)."
        ],
        [
          "Produire différents types d'écrits (application)",
          "Produire différents types d'écrits (texte narratif, descriptif, injonctif, poétique)."
        ],
        [
          "Produire différents types d'écrits (consolidation)",
          "Produire différents types d'écrits (texte narratif, descriptif, injonctif, poétique)."
        ]
      ],
      "4": [
        [
          "Produire différents types d'écrits",
          "Produire différents types d'écrits (texte narratif, descriptif, injonctif, poétique)."
        ],
        [
          "Produire différents types d'écrits (application)",
          "Produire différents types d'écrits (texte narratif, descriptif, injonctif, poétique)."
        ],
        [
          "Produire différents types d'écrits (consolidation)",
          "Produire différents types d'écrits (texte narratif, descriptif, injonctif, poétique)."
        ]
      ],
      "5": [
        [
          "Prise de notes",
          "Prendre des notes au cours d'un exposé."
        ],
        [
          "Prise de notes (application)",
          "Prendre des notes au cours d'un exposé."
        ],
        [
          "Prise de notes (consolidation)",
          "Prendre des notes au cours d'un exposé."
        ]
      ],
      "6": [
        [
          "Produire un compte-rendu",
          "Produire un compte-rendu."
        ],
        [
          "Produire un compte-rendu (application)",
          "Produire un compte-rendu."
        ],
        [
          "Produire un compte-rendu (consolidation)",
          "Produire un compte-rendu."
        ]
      ],
      "7": [
        [
          "Produire un poème",
          "Production de différents types de textes : Produire un poème."
        ],
        [
          "Produire un poème (application)",
          "Production de différents types de textes : Produire un poème."
        ],
        [
          "Produire un poème (consolidation)",
          "Production de différents types de textes : Produire un poème."
        ]
      ],
      "8": [
        [
          "Éditer un texte (TIC)",
          "Production de différents types de textes : Editer un texte en utilisant les TIC."
        ],
        [
          "Éditer un texte (TIC) (application)",
          "Production de différents types de textes : Editer un texte en utilisant les TIC."
        ],
        [
          "Éditer un texte (TIC) (consolidation)",
          "Production de différents types de textes : Editer un texte en utilisant les TIC."
        ]
      ]
    }
  },
  "francais.litterature": {
    "savoir": "Être un lecteur assidu",
    "units": {
      "1": [
        [
          "Lire une œuvre littéraire",
          "Lire intégralement une œuvre mettant en jeu une héroïne ou un héros face à des phénomènes naturels; Trouver des éléments recherchés dans un ouvrage."
        ],
        [
          "Lire une œuvre littéraire (application)",
          "Lire intégralement une œuvre mettant en jeu une héroïne ou un héros face à des phénomènes naturels; Trouver des éléments recherchés dans un ouvrage."
        ],
        [
          "Lire une œuvre littéraire (consolidation)",
          "Lire intégralement une œuvre mettant en jeu une héroïne ou un héros face à des phénomènes naturels; Trouver des éléments recherchés dans un ouvrage."
        ]
      ],
      "2": [
        [
          "Cahier de lecture et recherche",
          "Tenir un cahier de lecture pour prendre des notes; trouver des éléments recherchés dans un ouvrage."
        ],
        [
          "Cahier de lecture et recherche (application)",
          "Tenir un cahier de lecture pour prendre des notes; trouver des éléments recherchés dans un ouvrage."
        ],
        [
          "Cahier de lecture et recherche (consolidation)",
          "Tenir un cahier de lecture pour prendre des notes; trouver des éléments recherchés dans un ouvrage."
        ]
      ],
      "3": [
        [
          "Compte rendu de lecture",
          "Faire un compte rendu de lecture et donner son point de vue sur une œuvre et son auteur."
        ],
        [
          "Trouver des éléments dans un ouvrage",
          "Trouver des éléments recherchés dans un ouvrage."
        ],
        [
          "Trouver des éléments dans un ouvrage (application)",
          "Trouver des éléments recherchés dans un ouvrage."
        ]
      ],
      "4": [
        [
          "Lire des récits camerounais",
          "Lire intégralement des récits qui interrogent certains fondements de la société camerounaise (justice, respect des différences, droits et devoirs, protection de l'environnement)."
        ],
        [
          "Lire des récits camerounais (application)",
          "Lire intégralement des récits qui interrogent certains fondements de la société camerounaise (justice, respect des différences, droits et devoirs, protection de l'environnement)."
        ],
        [
          "Trouver des éléments dans un ouvrage",
          "Trouver des éléments recherchés dans un ouvrage."
        ]
      ],
      "5": [
        [
          "Lire des fables",
          "Lire intégralement des fables qui interrogent certains fondements de la société camerounaise : justice, respects des différences, droits et devoirs, protection de l'environnement."
        ],
        [
          "Lire des fables (application)",
          "Lire intégralement des fables qui interrogent certains fondements de la société camerounaise : justice, respects des différences, droits et devoirs, protection de l'environnement."
        ],
        [
          "Recherche documentaire",
          "Recherche documentaire : trouver des éléments recherchés dans un ouvrage."
        ]
      ],
      "6": [
        [
          "La morale en question",
          "La morale en question : Lire intégralement une bande dessinée qui interroge certains fondements de la société camerounaise (justice, respect des différences, droits et devoirs, protection de l'environnement)."
        ],
        [
          "La morale en question (application)",
          "La morale en question : Lire intégralement une bande dessinée qui interroge certains fondements de la société camerounaise (justice, respect des différences, droits et devoirs, protection de l'environnement)."
        ],
        [
          "Recherche documentaire",
          "Recherche documentaire : trouver des éléments recherchés dans un ouvrage."
        ]
      ],
      "7": [
        [
          "La poésie",
          "La poésie : Lire intégralement des œuvres poétiques."
        ],
        [
          "Recherche documentaire",
          "Recherche documentaire : Trouver des éléments recherchés dans un ouvrage."
        ],
        [
          "Recherche documentaire (application)",
          "Recherche documentaire : Trouver des éléments recherchés dans un ouvrage."
        ]
      ],
      "8": [
        [
          "La poésie",
          "La poésie : déclamer un poème."
        ],
        [
          "Recherche documentaire",
          "Recherche documentaire : Trouver des éléments recherchés dans un ouvrage."
        ],
        [
          "Recherche documentaire (application)",
          "Recherche documentaire : Trouver des éléments recherchés dans un ouvrage."
        ]
      ]
    }
  },
  "english.listening": {
    "savoir": "Develop the love for listening and speaking the English Language in specific contexts",
    "units": {
      "1": [
        [
          "Words with triphthongs",
          "Pronounce words with triphthongs."
        ],
        [
          "Comprehension questions",
          "Answer comprehension questions."
        ],
        [
          "Saying rhymes fluently",
          "Say rhyme audibly and fluently."
        ]
      ],
      "2": [
        [
          "Give and respect instructions",
          "Give and respect instructions."
        ],
        [
          "Count things and people",
          "Count things, people, etc."
        ],
        [
          "Introduce family members",
          "Introduce family members."
        ]
      ],
      "3": [
        [
          "Consonant clusters and instructions",
          "Pronounce words with consonant clusters; give and respect instructions."
        ],
        [
          "Comprehension and sketch roles",
          "Answer comprehension questions; play roles in a sketch."
        ],
        [
          "Sing songs with melody",
          "Sing songs respecting the right melody."
        ]
      ],
      "4": [
        [
          "Pronounce words with triphthongs",
          "Pronounce words with triphthongs."
        ],
        [
          "Pronounce words with triphthongs (application)",
          "Pronounce words with triphthongs."
        ],
        [
          "Answer comprehension questions",
          "Answer comprehension questions."
        ]
      ],
      "5": [
        [
          "Stress and intonation",
          "Speak with appropriate stress and intonation."
        ],
        [
          "Comprehension questions",
          "Answer comprehension questions."
        ],
        [
          "Retell and count",
          "Retell a story using one's words; count things, people etc."
        ]
      ],
      "6": [
        [
          "Listening comprehension",
          "Listening comprehension texts: Answer comprehension questions."
        ],
        [
          "Discussion",
          "Discussion: Take part in a discussion."
        ],
        [
          "Discussion (application)",
          "Discussion: Take part in a discussion."
        ]
      ],
      "7": [
        [
          "Instructions & listening comprehension",
          "Instructions: Give and respect instructions; Listening comprehension texts: Answer comprehension questions."
        ],
        [
          "Stories",
          "Stories: Retell a story using one's words."
        ],
        [
          "Sketches",
          "Sketches: Play roles in a sketch."
        ]
      ],
      "8": [
        [
          "Listening comprehension",
          "Listening comprehension texts: Answer comprehension questions."
        ],
        [
          "Rhymes",
          "Rhymes: Say rhymes audibly and fluently."
        ],
        [
          "Rhymes (application)",
          "Rhymes: Say rhymes audibly and fluently."
        ]
      ]
    }
  },
  "english.writing": {
    "savoir": "Show the interest to write",
    "units": {
      "1": [
        [
          "Construct meaningful text",
          "Construct meaningful words, sentences and texts."
        ],
        [
          "Construct meaningful text (application)",
          "Construct meaningful words, sentences and texts."
        ],
        [
          "Construct meaningful text (consolidation)",
          "Construct meaningful words, sentences and texts."
        ]
      ],
      "2": [
        [
          "Construct meaningful texts",
          "Construct meaningful words, sentences and texts."
        ],
        [
          "Construct meaningful texts (application)",
          "Construct meaningful words, sentences and texts."
        ],
        [
          "Write numbers in words",
          "Write numbers in words."
        ]
      ],
      "3": [
        [
          "Write numbers in words",
          "Write numbers in words."
        ],
        [
          "Write numbers in words (application)",
          "Write numbers in words."
        ],
        [
          "Write numbers in words (consolidation)",
          "Write numbers in words."
        ]
      ],
      "4": [
        [
          "Writing sentences dictated",
          "Writing sentences dictated."
        ],
        [
          "Writing sentences dictated (application)",
          "Writing sentences dictated."
        ],
        [
          "Writing sentences dictated (consolidation)",
          "Writing sentences dictated."
        ]
      ],
      "5": [
        [
          "Copy texts legibly",
          "Copy texts legibly and many times."
        ],
        [
          "Copy texts legibly (application)",
          "Copy texts legibly and many times."
        ],
        [
          "Copy texts legibly (consolidation)",
          "Copy texts legibly and many times."
        ]
      ],
      "6": [
        [
          "Spelling",
          "Spelling: Write sentences dictated."
        ],
        [
          "Spelling (application)",
          "Spelling: Write sentences dictated."
        ],
        [
          "Spelling (consolidation)",
          "Spelling: Write sentences dictated."
        ]
      ]
    }
  },
  "english.reading": {
    "savoir": "Show love for reading",
    "units": {
      "1": [
        [
          "Read aloud fluently",
          "Read aloud, audibly and fluently."
        ],
        [
          "Spell words",
          "Spell words."
        ],
        [
          "Answer questions",
          "Answer questions."
        ]
      ],
      "2": [
        [
          "Interpret pictures; read aloud",
          "Interpret pictures; read aloud."
        ],
        [
          "Spell words; read numbers",
          "Spell words; read numbers."
        ],
        [
          "Read fluently; answer questions",
          "Read audibly and fluently; answer questions."
        ]
      ],
      "3": [
        [
          "Interpret pictures, read aloud",
          "Interpret pictures; read aloud."
        ],
        [
          "Spell words, read numbers",
          "Spell words; read numbers."
        ],
        [
          "Read fluently, decode meanings",
          "Read audibly and fluently; decode meanings in words; answer questions."
        ]
      ],
      "4": [
        [
          "Read aloud",
          "Read aloud."
        ],
        [
          "Read fluently and decode",
          "Read audibly and fluently; decode meanings in words."
        ],
        [
          "Answer questions",
          "Answer questions."
        ]
      ],
      "5": [
        [
          "Read aloud fluently",
          "Read aloud, audibly and fluently."
        ],
        [
          "Decode Word meanings",
          "Decode meanings in words."
        ],
        [
          "Answer questions",
          "Answer question."
        ]
      ],
      "6": [
        [
          "English letter names",
          "English letter names: Read aloud."
        ],
        [
          "Sight words",
          "Sight words: Read audibly and fluently."
        ],
        [
          "Texts",
          "Texts: Answer questions."
        ]
      ],
      "7": [
        [
          "English letter names",
          "English letter names: Read aloud."
        ],
        [
          "Sight words",
          "Sight words: Read audibly and fluently."
        ],
        [
          "Texts",
          "Texts: Answer questions."
        ]
      ],
      "8": [
        [
          "English letter names",
          "English letter names: Read aloud."
        ],
        [
          "Sight words",
          "Sight words: Read audibly and fluently."
        ],
        [
          "Texts",
          "Texts: Answer questions."
        ]
      ]
    }
  },
  "english.grammar": {
    "savoir": "Show interest in acquiring new words",
    "units": {
      "1": [
        [
          "Articles and concrete nouns",
          "Use articles correctly in sentences; Construct sentences with concrete nouns."
        ],
        [
          "Ask and respond to questions",
          "Ask and respond to questions appropriately."
        ],
        [
          "Words in context",
          "Use words to communicate effectively in specific contexts."
        ]
      ],
      "2": [
        [
          "Articles and coherent sentences",
          "Use articles correctly in sentences; make coherent sentences."
        ],
        [
          "Concrete nouns; describe",
          "Construct sentences with concrete nouns; describe people, places and things."
        ],
        [
          "Ask and respond to questions",
          "Ask and respond to questions appropriately; use words to communicate effectively in specific contexts."
        ]
      ],
      "3": [
        [
          "Use articles correctly",
          "Use articles (a, an, the) correctly in sentences; make coherent sentences."
        ],
        [
          "Concrete nouns and possession",
          "Construct sentences with concrete nouns; express possession."
        ],
        [
          "Ask and respond to questions",
          "Ask and respond to questions appropriately; use words to communicate effectively in specific contexts."
        ]
      ],
      "4": [
        [
          "Sentences with concrete nouns",
          "Construct sentences with concrete nouns."
        ],
        [
          "Sentences with concrete nouns (application)",
          "Construct sentences with concrete nouns."
        ],
        [
          "Use words in specific contexts",
          "Use words to communicate effectively in specific contexts."
        ]
      ],
      "5": [
        [
          "Sentences with concrete nouns",
          "Make coherent sentences with concrete nouns."
        ],
        [
          "Adverbs in sentences",
          "Use adverbs correctly in sentences."
        ],
        [
          "Words in context",
          "Use words to communicate effectively in specific contexts."
        ]
      ],
      "6": [
        [
          "Nouns and conditionals",
          "Nouns: construct sentences with concrete nouns. Conditional tenses: making hypothetical statements."
        ],
        [
          "Adverbs",
          "Adverbs: Use adverbs correctly in sentences."
        ],
        [
          "Environment vocabulary",
          "Words related to the immediate and external environment: Use words to communicate effectively in specific contexts."
        ]
      ],
      "7": [
        [
          "Nouns",
          "Nouns: Construct sentences with concrete nouns."
        ],
        [
          "Adverbs",
          "Adverbs: Use adverbs correctly in sentences."
        ],
        [
          "Environment words",
          "Words related to the immediate and external environment: Use words to communicate effectively in specific contexts."
        ]
      ],
      "8": [
        [
          "Adjectives",
          "Adjectives: Describe people, place and things."
        ],
        [
          "Adverbs",
          "Adverbs: Use adverbs correctly in sentences."
        ],
        [
          "Environment words",
          "Words related to the immediate and external environment: Use words to communicate effectively in specific contexts."
        ]
      ]
    }
  },
  "langues.langue-nationale": {
    "savoir": "Être enraciné dans sa culture",
    "units": {
      "1": [
        [
          "Vocabulaire des phénomènes naturels",
          "Nommer les phénomènes naturels; Former les phrases en utilisant appropriée aux phénomènes naturels (pluies, vents, marées, séismes etc.); Lier les phénomènes naturels aux activités culturelles de son village."
        ],
        [
          "Vocabulaire de la vie végétale",
          "Nommer des arbres fruitiers et des plantes comestibles; Utiliser un vocabulaire approprié pour décrire la vie des plantes; Déterminer la portée culturelle de certaines plantes."
        ],
        [
          "Vocabulaire de la vie animale",
          "Nommer les animaux domestiques et les animaux sauvages; Utiliser un vocabulaire approprié pour décrire la vie des animaux domestiques; Dire des contes mettant en scènes des animaux."
        ]
      ],
      "2": [
        [
          "Décrire une fête au village",
          "produire un texte cohérent de cinq (5) phrases au plus décrivant une fête au village en respectant les temps de conjugaison (passé I, II ou III); expliquer le rôle des rites traditionnels."
        ],
        [
          "Lettre sur la vie en ville",
          "Rédiger une courte lettre à un proche sur le mode de vie en ville en utilisant les formules de comparaison; Former des mots nouveaux sur les activités de la ville en utilisant les affixes."
        ],
        [
          "Sécurité publique et domestique",
          "Nommer les agents qui s'occupent de la sécurité publique; Utiliser un vocabulaire approprié pour expliquer les mesures de sécurité à prendre à la maison."
        ]
      ],
      "3": [
        [
          "Vocabulaire activites enseignant",
          "Utiliser un vocabulaire approprie pour decrire les activites de l'enseignant."
        ],
        [
          "Vocabulaire activites eleve",
          "Utiliser un vocabulaire approprie pour decrire les activites de l'eleve."
        ],
        [
          "Utilite de l'ecole",
          "Expliquer l'utilite de l'ecole."
        ]
      ],
      "4": [
        [
          "Techniques artisanales",
          "Décrire oralement les techniques artisanales de pêche, de chasse, d'agriculture."
        ],
        [
          "Nommer des professionnels",
          "Nommer des professionnels et décrire leur travail dans de courtes phrases."
        ],
        [
          "Conseiller un créateur d'entreprise",
          "Formuler un conseil à un professionnel qui veut créer une entreprise."
        ]
      ],
      "5": [
        [
          "Moyens et voies de communication",
          "Nommer les moyens et les voies de communication."
        ],
        [
          "Décrire un voyage",
          "Décrire un voyage."
        ],
        [
          "Apprécier un voyage",
          "Apprécier un voyage effectué."
        ]
      ],
      "6": [
        [
          "La santé : médicaments traditionnels",
          "La santé : identifier les médicaments traditionnels pour soigner les maladies courantes."
        ],
        [
          "Les maladies",
          "Les maladies : nommer les maladies; décrire les symptômes des maladies fréquentes (paludisme, rhume, mal de ventre, etc.)."
        ],
        [
          "Industrie du médicament",
          "L'industrie du médicament : expliquer comment on soigne traditionnellement quelques maladies dans son village."
        ]
      ],
      "7": [
        [
          "Les sports de compétition",
          "Décrire les sports de compétition pratiqués dans son village."
        ],
        [
          "Les loisirs pour jeunes",
          "Nommer des jeux ou des sports traditionnellement pratiqués dans sa région et expliquer les règles."
        ],
        [
          "Les loisirs pour jeunes (application)",
          "Nommer des jeux ou des sports traditionnellement pratiqués dans sa région et expliquer les règles."
        ]
      ],
      "8": [
        [
          "Le système solaire : les astres",
          "Le système solaire : Nommer les astres."
        ],
        [
          "Soleil et lune dans la tradition",
          "Le système solaire : Expliquer l'importance du soleil et de la lune dans sa tradition."
        ],
        [
          "Soleil et lune dans la tradition (application)",
          "Le système solaire : Expliquer l'importance du soleil et de la lune dans sa tradition."
        ]
      ]
    }
  },
  "shs.morale": {
    "savoir": "Avoir le sens de la vie harmonieuse en collectivité",
    "units": {
      "1": [
        [
          "Le respect et l'estime de soi",
          "Expliquer la notion de respect; Se respecter et respecter les autres; Dire comment faire pour avoir l'estime de soi."
        ],
        [
          "La propreté",
          "Caractériser la propreté; Mettre en pratique la propreté de son corps et de la maison."
        ],
        [
          "Obéissance et opinion",
          "Expliquer la notion d'obéissance; Appliquer des recommandations; Expliquer la notion d'opinion; Analyser l'opinion des membres de sa famille."
        ]
      ],
      "2": [
        [
          "Propreté, notions de bien et de mal",
          "Mettre en évidence la propreté de son village ou de son quartier; Expliquer les notions de bien et de mal."
        ],
        [
          "Discriminer le bien du mal",
          "Discriminer le bien du mal à travers l'analyse des actions faites par des tiers; Expliquer la notion de modestie."
        ],
        [
          "Modestie et opinion d'autrui",
          "Démontrer sa modestie dans ses attitudes; Analyser l'opinion d'autrui."
        ]
      ],
      "3": [
        [
          "Proprete et endurance",
          "Mettre en evidence la proprete de sa classe et de son ecole; Decrire un comportement d'endurance; Demontrer son caractere d'endurance dans des activites en classe; Expliquer les notions de bien et de mal."
        ],
        [
          "Obeissance et recommandations",
          "Expliquer la notion d'obeissance; Appliquer des recommandations; Analyser l'opinion de ses camarades."
        ],
        [
          "Discriminer le bien du mal",
          "Expliquer les notions de bien et de mal; Discriminer le bien du mal a travers l'analyse des actions faites par des tiers."
        ]
      ],
      "4": [
        [
          "La sincérité",
          "Expliquer la notion de sincérité; mettre la sincérité en pratique."
        ],
        [
          "Honnêteté et modestie",
          "Expliquer la notion d'honnêteté; démontrer son honnêteté; expliquer la notion de modestie; démontrer sa modestie dans ses habitudes."
        ],
        [
          "L'esprit d'initiative",
          "Expliquer les notions d'initiative; démontrer l'esprit d'initiative; discriminer le bien du mal à travers l'analyse des actions faites par des tiers."
        ]
      ],
      "5": [
        [
          "Sincérité et honnêteté",
          "La sincérité : mettre la sincérité en pratique dans des situations de voyage; l'honnêteté : démontrer son honnêteté en situation de voyage."
        ],
        [
          "La serviabilité",
          "La serviabilité : expliquer la notion de serviabilité et rendre service sans contrepartie."
        ],
        [
          "La modestie",
          "La modestie : démontrer sa modestie dans ses attitudes pendant les voyages."
        ]
      ],
      "6": [
        [
          "L'honnêteté",
          "L'honnêteté : démontrer son honnêteté en cas de maladies."
        ],
        [
          "L'initiative",
          "L'initiative : démontrer l'esprit d'initiative face à des problèmes de santé."
        ],
        [
          "La modestie",
          "La modestie : démontrer l'estime de soi face à des problèmes de santé."
        ]
      ],
      "7": [
        [
          "L'endurance et la sincérité",
          "Démontrer son caractère d'endurance dans des activités ludiques; mettre la sincérité en pratique dans des situations de jeu."
        ],
        [
          "L'honnêteté et la modestie",
          "Démontrer son honnêteté pendant les jeux; démontrer sa modestie dans ses attitudes pendant les jeux."
        ],
        [
          "L'initiative",
          "Démontrer l'esprit d'initiative pendant les jeux."
        ]
      ],
      "8": [
        [
          "L'honnêteté",
          "L'honnêteté : Démontrer son honnêteté dans des situations de communication."
        ],
        [
          "L'opinion d'autrui",
          "L'opinion d'autrui : Analyser l'opinion d'autrui dans des situations de communication."
        ],
        [
          "La modestie",
          "La modestie : Démontrer sa modestie dans ses attitudes en situation de communication."
        ]
      ]
    }
  },
  "shs.droits": {
    "savoir": "Être humaniste et avoir le sens de la justice",
    "units": {
      "1": [
        [
          "Droit au refuge de l'enfant",
          "Expliquer pourquoi l'enfant a droit à un refuge, pourquoi il doit être secouru et bénéficier des conditions de vie décentes."
        ],
        [
          "Droit au refuge de l'enfant (application)",
          "Expliquer pourquoi l'enfant a droit à un refuge, pourquoi il doit être secouru et bénéficier des conditions de vie décentes."
        ],
        [
          "Droit à une famille",
          "Expliquer pourquoi l'enfant a droit à une famille et pourquoi il doit être entouré et aimé."
        ]
      ],
      "2": [
        [
          "Droit à un nom",
          "Expliquer pourquoi l'enfant a droit à un nom."
        ],
        [
          "Droit à une nationalité",
          "Expliquer pourquoi l'enfant a droit à une nationalité."
        ],
        [
          "Droit à une identité",
          "Expliquer pourquoi l'enfant a droit à une identité."
        ]
      ],
      "3": [
        [
          "Droit d'aller a l'ecole",
          "Expliquer pourquoi l'enfant a droit d'aller a l'ecole."
        ],
        [
          "Droit d'aller a l'ecole (application)",
          "Expliquer pourquoi l'enfant a droit d'aller a l'ecole."
        ],
        [
          "Droit d'aller a l'ecole (consolidation)",
          "Expliquer pourquoi l'enfant a droit d'aller a l'ecole."
        ]
      ],
      "4": [
        [
          "Droit à la protection",
          "Expliquer pourquoi l'enfant a le droit d'être protégé de la violence, de la maltraitance et de toute forme d'abus et d'exploitation."
        ],
        [
          "Droit à la protection (application)",
          "Expliquer pourquoi l'enfant a le droit d'être protégé de la violence, de la maltraitance et de toute forme d'abus et d'exploitation."
        ],
        [
          "Droit à la protection (consolidation)",
          "Expliquer pourquoi l'enfant a le droit d'être protégé de la violence, de la maltraitance et de toute forme d'abus et d'exploitation."
        ]
      ],
      "6": [
        [
          "Droits de l'enfant",
          "Droits de l'enfant : expliquer pourquoi l'enfant a le droit d'être soigné, protégé des maladies, d'avoir une alimentation suffisante et équilibrée."
        ],
        [
          "Droits de l'enfant (application)",
          "Droits de l'enfant : expliquer pourquoi l'enfant a le droit d'être soigné, protégé des maladies, d'avoir une alimentation suffisante et équilibrée."
        ],
        [
          "Droits de l'enfant (consolidation)",
          "Droits de l'enfant : expliquer pourquoi l'enfant a le droit d'être soigné, protégé des maladies, d'avoir une alimentation suffisante et équilibrée."
        ]
      ],
      "7": [
        [
          "Droits de l'enfant",
          "Expliquer pourquoi l'enfant a le droit de jouer et d'avoir des loisirs."
        ],
        [
          "Droits de l'enfant (application)",
          "Expliquer pourquoi l'enfant a le droit de jouer et d'avoir des loisirs."
        ],
        [
          "Droits de l'enfant (consolidation)",
          "Expliquer pourquoi l'enfant a le droit de jouer et d'avoir des loisirs."
        ]
      ],
      "8": [
        [
          "Droits de l'enfant",
          "Droits de l'enfant : Expliquer pourquoi l'enfant a le droit à la liberté d'information, d'expression et de participation."
        ],
        [
          "Droits de l'enfant (application)",
          "Droits de l'enfant : Expliquer pourquoi l'enfant a le droit à la liberté d'information, d'expression et de participation."
        ],
        [
          "Droits de l'homme",
          "Droits de l'Homme : Expliquer la notion de droits de l'Homme ; Enumérer les principaux droits de l'Homme."
        ]
      ]
    }
  },
  "shs.paix": {
    "savoir": "Être tolérant, pacifique et prudent",
    "units": {
      "1": [
        [
          "La notion de paix",
          "Expliquer la notion de paix; Mettre en scène le vivre ensemble à la maison."
        ],
        [
          "Règles de sécurité collective",
          "Énoncer les règles à respecter pour garantir sa sécurité et celles des autres."
        ],
        [
          "Sécurité à la maison",
          "Énoncer les règles de sécurité à observer à la maison."
        ]
      ],
      "2": [
        [
          "Notion de paix; vivre ensemble",
          "Expliquer la notion de paix; Mettre en évidence le vivre ensemble au village."
        ],
        [
          "Vivre ensemble en ville",
          "Mettre en évidence le vivre ensemble en ville."
        ],
        [
          "Règles de sécurité",
          "Énoncer les règles de sécurité à observer au village et en ville (code de la route, etc.)."
        ]
      ],
      "3": [
        [
          "Notion de paix",
          "Expliquer la notion de paix; Mettre en evidence le vivre ensemble en classe."
        ],
        [
          "Vivre ensemble a l'ecole",
          "Mettre en evidence le vivre ensemble a l'ecole."
        ],
        [
          "Regles de securite",
          "Enoncer les regles de securite a observer en classe et a l'ecole."
        ]
      ],
      "4": [
        [
          "La notion de paix",
          "Expliquer la notion de paix; mettre en évidence le vivre ensemble dans la communauté."
        ],
        [
          "La notion de paix (application)",
          "Expliquer la notion de paix; mettre en évidence le vivre ensemble dans la communauté."
        ],
        [
          "Sécurité dans les métiers",
          "Énoncer les règles de sécurité à observer dans les métiers."
        ]
      ],
      "5": [
        [
          "La paix : vivre ensemble",
          "La paix : mettre en scène le vivre ensemble pendant les voyages."
        ],
        [
          "La paix : vivre ensemble (application)",
          "La paix : mettre en scène le vivre ensemble pendant les voyages."
        ],
        [
          "La sécurité en voyage",
          "La sécurité : énoncer les règles de sécurité à observer pendant les voyages."
        ]
      ],
      "6": [
        [
          "La paix : formations sanitaires",
          "La paix : mettre en scène le vivre ensemble dans les formations sanitaires."
        ],
        [
          "La paix : formations sanitaires (application)",
          "La paix : mettre en scène le vivre ensemble dans les formations sanitaires."
        ],
        [
          "La sécurité : formations sanitaires",
          "La sécurité : énoncer les règles de sécurité à observer dans les formations sanitaires."
        ]
      ],
      "7": [
        [
          "La paix",
          "Mettre en scène le vivre ensemble pendant les jeux ou pendant le sport."
        ],
        [
          "La paix (application)",
          "Mettre en scène le vivre ensemble pendant les jeux ou pendant le sport."
        ],
        [
          "La sécurité",
          "Enoncer les règles de sécurité à observer pendant les jeux et le sport."
        ]
      ],
      "8": [
        [
          "La paix : vivre ensemble",
          "La paix : Mettre en scène le vivre ensemble pendant les communications."
        ],
        [
          "La paix : vivre ensemble (application)",
          "La paix : Mettre en scène le vivre ensemble pendant les communications."
        ],
        [
          "La paix : vivre ensemble (consolidation)",
          "La paix : Mettre en scène le vivre ensemble pendant les communications."
        ]
      ]
    }
  },
  "shs.citoyennete": {
    "savoir": "Avoir l'amour de la patrie",
    "units": {
      "1": [
        [
          "La démocratie",
          "Définir le concept de démocratie; Identifier les principes démocratiques."
        ],
        [
          "Règles démocratiques et drapeau",
          "Mettre en scènes les principales règles de la démocratie à la maison; Analyser le drapeau national."
        ],
        [
          "Hymne et devise nationale",
          "Chanter l'hymne national en français; Dire la devise du Cameroun."
        ]
      ],
      "2": [
        [
          "Démocratie et ses principes",
          "Définir le concept de démocratie; Identifier les principes démocratiques; Mettre en scène les principales règles de la démocratie au village et en ville."
        ],
        [
          "Intégration nationale et hymne",
          "Expliquer la notion d'intégration nationale et du vivre ensemble; Retracer l'histoire de l'hymne national."
        ],
        [
          "Hymne national et devise",
          "Chanter l'hymne national en français; Dire la devise du Cameroun."
        ]
      ],
      "3": [
        [
          "Concept de democratie",
          "Definir le concept de democratie; Identifier les principes democratiques; Mettre en scenes les principales regles de la democratie en classe et a l'ecole."
        ],
        [
          "Integration et symboles nationaux",
          "Enoncer les principes d'integration nationale et du vivre ensemble; Chanter l'hymne national en francais; Dire la devise du Cameroun."
        ],
        [
          "Types de pouvoirs",
          "Enumerer les differents types de pouvoirs (executif, judiciaire, legislatif)."
        ]
      ],
      "4": [
        [
          "Types d'élections",
          "Identifier les types d'élections; expliquer le processus électoral."
        ],
        [
          "Le processus électoral",
          "Expliquer le processus électoral."
        ],
        [
          "Le processus électoral (application)",
          "Expliquer le processus électoral."
        ]
      ],
      "5": [
        [
          "Intégration nationale",
          "Intégration nationale et vivre ensemble : mettre en scène l'intégration nationale et le vivre ensemble en situation de voyage."
        ],
        [
          "Intégration nationale (application)",
          "Intégration nationale et vivre ensemble : mettre en scène l'intégration nationale et le vivre ensemble en situation de voyage."
        ],
        [
          "Institutions internationales",
          "Les institutions internationales : expliquer ce qu'est une institution internationale."
        ]
      ],
      "7": [
        [
          "Intégration nationale et vivre ensemble",
          "Mettre en scène l'intégration nationale et le vivre ensemble en situation de jeux et de sport."
        ],
        [
          "Intégration nationale et vivre ensemble (application)",
          "Mettre en scène l'intégration nationale et le vivre ensemble en situation de jeux et de sport."
        ],
        [
          "Intégration nationale et vivre ensemble (consolidation)",
          "Mettre en scène l'intégration nationale et le vivre ensemble en situation de jeux et de sport."
        ]
      ]
    }
  },
  "shs.regles-reglements": {
    "savoir": "Respecter les règles et la réglementation en vigueur",
    "units": {
      "1": [
        [
          "La notion de loi",
          "Expliquer la notion de loi; Mettre en scène le respect des lois."
        ],
        [
          "La notion de loi (application)",
          "Expliquer la notion de loi; Mettre en scène le respect des lois."
        ],
        [
          "La notion de loi (consolidation)",
          "Expliquer la notion de loi; Mettre en scène le respect des lois."
        ]
      ],
      "2": [
        [
          "Notion de loi",
          "Expliquer la notion de loi; Mettre en scène le respect des lois."
        ],
        [
          "Notion de loi (application)",
          "Expliquer la notion de loi; Mettre en scène le respect des lois."
        ],
        [
          "Notion de loi (consolidation)",
          "Expliquer la notion de loi; Mettre en scène le respect des lois."
        ]
      ],
      "3": [
        [
          "Reglement interieur",
          "Expliquer la notion de reglement interieur."
        ],
        [
          "Reglement interieur (application)",
          "Expliquer la notion de reglement interieur."
        ],
        [
          "Reglement interieur (consolidation)",
          "Expliquer la notion de reglement interieur."
        ]
      ],
      "4": [
        [
          "Règle et acte administratif",
          "Expliquer la notion de règle; expliquer le concept d'acte administratif."
        ],
        [
          "Règle et acte administratif (application)",
          "Expliquer la notion de règle; expliquer le concept d'acte administratif."
        ],
        [
          "Règle et acte administratif (consolidation)",
          "Expliquer la notion de règle; expliquer le concept d'acte administratif."
        ]
      ],
      "7": [
        [
          "Les règles",
          "Expliquer la notion de règles de jeu."
        ],
        [
          "Les règles",
          "Appliquer les règles établies dans un jeu."
        ],
        [
          "Les règles (application)",
          "Appliquer les règles établies dans un jeu."
        ]
      ],
      "8": [
        [
          "Notion de règles",
          "Les règles : Expliquer la notion de règles dans la communication."
        ],
        [
          "Appliquer les règles",
          "Les règles : Appliquer les règles de communication."
        ],
        [
          "Appliquer les règles (application)",
          "Les règles : Appliquer les règles de communication."
        ]
      ]
    }
  },
  "shs.histoire": {
    "savoir": "Avoir une ouverture d'esprit",
    "units": {
      "1": [
        [
          "L'homme préhistorique",
          "Expliquer l'existence de l'homme préhistorique."
        ],
        [
          "Les grandes civilisations",
          "Identifier les grandes civilisations."
        ],
        [
          "La révolution industrielle",
          "Identifier les grandes transformations scientifiques et techniques intervenues pendant la révolution industrielle."
        ]
      ],
      "2": [
        [
          "Inventions et découvertes",
          "Associer chaque invention et découverte à son réalisateur."
        ],
        [
          "La traite des noirs",
          "Définir la traite des noirs et identifier ses auteurs; Expliquer les causes et les conséquences de la traite des noirs."
        ],
        [
          "Européens sur la côte du Cameroun",
          "Nommer les européens qui ont découvert la côte du Cameroun."
        ]
      ],
      "3": [
        [
          "Conference de berlin",
          "Determiner le but et la date de la tenue de la conference de Berlin."
        ],
        [
          "Partage de l'afrique",
          "Identifier les puissances europeennes qui se sont partage l'Afrique."
        ],
        [
          "Partage de l'afrique (application)",
          "Identifier les puissances europeennes qui se sont partage l'Afrique."
        ]
      ],
      "4": [
        [
          "Administration allemande",
          "Comparer le mode d'administration allemande au mode d'organisation traditionnelle; expliquer les avantages de la présence des allemands au Cameroun."
        ],
        [
          "Administration allemande (application)",
          "Comparer le mode d'administration allemande au mode d'organisation traditionnelle; expliquer les avantages de la présence des allemands au Cameroun."
        ],
        [
          "Administration allemande (consolidation)",
          "Comparer le mode d'administration allemande au mode d'organisation traditionnelle; expliquer les avantages de la présence des allemands au Cameroun."
        ]
      ],
      "5": [
        [
          "Résistances à la colonisation",
          "Résistances à la colonisation : citer les personnalités qui ont organisé la résistance à la pénétration européenne; donner les périodes de grandes résistances à la colonisation."
        ],
        [
          "Résistances à la colonisation (application)",
          "Résistances à la colonisation : citer les personnalités qui ont organisé la résistance à la pénétration européenne; donner les périodes de grandes résistances à la colonisation."
        ],
        [
          "Résistances à la colonisation (consolidation)",
          "Résistances à la colonisation : citer les personnalités qui ont organisé la résistance à la pénétration européenne; donner les périodes de grandes résistances à la colonisation."
        ]
      ],
      "6": [
        [
          "Première guerre mondiale",
          "La première guerre mondiale : expliquer les causes et les conséquences de la première guerre mondiale; expliquer les raisons qui ont amené la guerre au Cameroun."
        ],
        [
          "Régime de mandat",
          "Régime de mandat : expliquer le fonctionnement du régime de mandat."
        ],
        [
          "Régime de mandat : rôle de la SDN",
          "Régime de mandat : expliquer le rôle de la SDN dans le régime de mandat."
        ]
      ],
      "7": [
        [
          "La deuxième guerre mondiale",
          "Expliquer les causes et les conséquences de la deuxième guerre mondiale; expliquer les raisons qui ont amené la guerre au Cameroun."
        ],
        [
          "Le régime de tutelle",
          "Expliquer le fonctionnement du régime de tutelle."
        ],
        [
          "Le régime de tutelle",
          "Expliquer le rôle de l'ONU dans le régime de tutelle."
        ]
      ],
      "8": [
        [
          "Accès à l'indépendance",
          "Le Cameroun de l'indépendance à nos jours : Expliquer comment le Cameroun a procédé pour accéder à son indépendance ; Déterminer les caractéristiques d'un Etat indépendant."
        ],
        [
          "Le fédéralisme camerounais",
          "Le Cameroun de l'indépendance à nos jours : Expliquer le concept de fédéralisme ; Expliquer la naissance des deux Etats fédéraux du Cameroun."
        ],
        [
          "L'etat unitaire",
          "Le Cameroun de l'indépendance à nos jours : Donner l'explication de l'Etat unitaire ; Expliquer le sens de la fête de l'unité."
        ]
      ]
    }
  },
  "shs.geographie-physique": {
    "savoir": "Avoir un esprit inventif",
    "units": {
      "1": [
        [
          "Plan et carte",
          "Expliquer les notions de plan, carte."
        ],
        [
          "Lire une carte du Cameroun",
          "Dessiner une carte du Cameroun; Interpréter la légende pour lire une carte."
        ],
        [
          "Les basses terres du Cameroun",
          "Identifier les basses terres du Cameroun (plaines et plateaux)."
        ]
      ],
      "2": [
        [
          "Bassins hydrographiques du Cameroun",
          "Déterminer les bassins hydrographiques du Cameroun."
        ],
        [
          "Problèmes d'eau de la localité",
          "Expliquer quelques problèmes d'eau de sa localité."
        ],
        [
          "Problèmes d'eau de la localité (application)",
          "Expliquer quelques problèmes d'eau de sa localité."
        ]
      ],
      "3": [
        [
          "Caracteristiques du climat",
          "Determiner les elements qui caracterisent le climat; Expliquer le role du climat dans les activites de la vie de l'homme."
        ],
        [
          "Types de climats",
          "Donner les caracteristiques du climat equatorial, tropical et desertique."
        ],
        [
          "Relief et climat local",
          "Etablir le lien entre le relief de sa localite et le climat local."
        ]
      ],
      "4": [
        [
          "Bassins hydrographiques",
          "Identifier les fleuves qui constituent chaque bassin hydrographique du Cameroun."
        ],
        [
          "Villes et fleuves",
          "Indiquer les villes qui sont arrosées par les principaux fleuves du Cameroun."
        ],
        [
          "Villes et fleuves (application)",
          "Indiquer les villes qui sont arrosées par les principaux fleuves du Cameroun."
        ]
      ],
      "5": [
        [
          "Régions naturelles du Cameroun",
          "Les régions naturelles du Cameroun : représenter les régions naturelles sur la carte du Cameroun."
        ],
        [
          "Régions naturelles du Cameroun (application)",
          "Les régions naturelles du Cameroun : représenter les régions naturelles sur la carte du Cameroun."
        ],
        [
          "Spécificités des régions naturelles",
          "Les régions naturelles du Cameroun : identifier les spécificités de chaque région naturelle du Cameroun."
        ]
      ]
    }
  },
  "shs.geographie-humaine": {
    "savoir": "Avoir une pensée créative",
    "units": {
      "1": [
        [
          "Les couches de la population",
          "Identifier les différentes couches de la population et leurs caractéristiques."
        ],
        [
          "Les couches de la population (application)",
          "Identifier les différentes couches de la population et leurs caractéristiques."
        ],
        [
          "Les couches de la population (consolidation)",
          "Identifier les différentes couches de la population et leurs caractéristiques."
        ]
      ],
      "2": [
        [
          "Activités des populations",
          "Déterminer les principales activités des populations des villages et des villes."
        ],
        [
          "Activités des populations (application)",
          "Déterminer les principales activités des populations des villages et des villes."
        ],
        [
          "Activités des populations (consolidation)",
          "Déterminer les principales activités des populations des villages et des villes."
        ]
      ],
      "3": [
        [
          "Problemes villes et villages",
          "Determiner les principaux problemes des villes et des villages."
        ],
        [
          "Problemes villes et villages (application)",
          "Determiner les principaux problemes des villes et des villages."
        ],
        [
          "Problemes villes et villages (consolidation)",
          "Determiner les principaux problemes des villes et des villages."
        ]
      ],
      "6": [
        [
          "Population du Cameroun",
          "La population du Cameroun : définir le taux de natalité, le taux de mortalité, la densité de la population."
        ],
        [
          "Population du Cameroun (application)",
          "La population du Cameroun : définir le taux de natalité, le taux de mortalité, la densité de la population."
        ],
        [
          "Population du Cameroun (consolidation)",
          "La population du Cameroun : définir le taux de natalité, le taux de mortalité, la densité de la population."
        ]
      ],
      "7": [
        [
          "La population du Cameroun",
          "Caractériser le peuplement des régions du Cameroun; expliquer les causes du métissage des populations du Cameroun."
        ],
        [
          "La population du Cameroun (application)",
          "Caractériser le peuplement des régions du Cameroun; expliquer les causes du métissage des populations du Cameroun."
        ],
        [
          "La population du Cameroun (consolidation)",
          "Caractériser le peuplement des régions du Cameroun; expliquer les causes du métissage des populations du Cameroun."
        ]
      ],
      "8": [
        [
          "La population du Cameroun",
          "La population du Cameroun : Localiser sur une carte du Cameroun les zones de forte, moyenne et faible concentration des populations."
        ],
        [
          "La population du Cameroun (application)",
          "La population du Cameroun : Localiser sur une carte du Cameroun les zones de forte, moyenne et faible concentration des populations."
        ],
        [
          "La population du Cameroun (consolidation)",
          "La population du Cameroun : Localiser sur une carte du Cameroun les zones de forte, moyenne et faible concentration des populations."
        ]
      ]
    }
  },
  "shs.geographie-economique": {
    "savoir": "Être entreprenant",
    "units": {
      "1": [
        [
          "Ressources économiques du Cameroun",
          "Énumérer les principales ressources économiques du Cameroun."
        ],
        [
          "Ressources économiques du Cameroun (application)",
          "Énumérer les principales ressources économiques du Cameroun."
        ],
        [
          "Ressources économiques du Cameroun (consolidation)",
          "Énumérer les principales ressources économiques du Cameroun."
        ]
      ],
      "2": [
        [
          "Zones agricoles du Cameroun",
          "Situer sur la carte du Cameroun les grandes zones agricoles."
        ],
        [
          "Zones pastorales du Cameroun",
          "Situer sur la carte du Cameroun les grandes zones pastorales."
        ],
        [
          "Zones et produits agropastoraux",
          "Établir un lien entre les zones et leurs produits agropastoraux."
        ]
      ],
      "3": [
        [
          "Zones d'exploitation minieres",
          "Situer sur la carte du Cameroun les grandes zones d'exploitation minieres."
        ],
        [
          "Zones d'exploitation minieres (application)",
          "Situer sur la carte du Cameroun les grandes zones d'exploitation minieres."
        ],
        [
          "Zones d'exploitation minieres (consolidation)",
          "Situer sur la carte du Cameroun les grandes zones d'exploitation minieres."
        ]
      ],
      "4": [
        [
          "Zones d'exploitation forestière",
          "Situer sur la carte du Cameroun les grandes zones d'exploitation forestières."
        ],
        [
          "Zones d'exploitation forestière (application)",
          "Situer sur la carte du Cameroun les grandes zones d'exploitation forestières."
        ],
        [
          "Zones d'exploitation forestière (consolidation)",
          "Situer sur la carte du Cameroun les grandes zones d'exploitation forestières."
        ]
      ],
      "5": [
        [
          "Le commerce",
          "Le commerce : définir la notion de commerce."
        ],
        [
          "Les transports",
          "Les transports : identifier les types de transports utilisés au Cameroun."
        ],
        [
          "Ressources économiques du Cameroun",
          "Les différentes ressources économiques du Cameroun : situer sur la carte les grandes zones touristiques du Cameroun."
        ]
      ],
      "6": [
        [
          "Ressources économiques du Cameroun",
          "Les différentes ressources économiques du Cameroun : situer sur la carte du Cameroun les grandes zones industrielles."
        ],
        [
          "Ressources économiques du Cameroun (application)",
          "Les différentes ressources économiques du Cameroun : situer sur la carte du Cameroun les grandes zones industrielles."
        ],
        [
          "Le commerce",
          "Le commerce : expliquer la notion de commerce intérieur et de commerce extérieur."
        ]
      ],
      "7": [
        [
          "Le commerce",
          "Identifier les différentes formes de monnaie (monnaie fiduciaire, scripturale, métallique)."
        ],
        [
          "Le commerce (application)",
          "Identifier les différentes formes de monnaie (monnaie fiduciaire, scripturale, métallique)."
        ],
        [
          "Le commerce (consolidation)",
          "Identifier les différentes formes de monnaie (monnaie fiduciaire, scripturale, métallique)."
        ]
      ],
      "8": [
        [
          "Le commerce électronique",
          "Le commerce électronique (e-commerce) : Expliquer la notion de commerce électronique ; Expliquer le rapport entre les technologies et le commerce électronique."
        ],
        [
          "Le commerce électronique (application)",
          "Le commerce électronique (e-commerce) : Expliquer la notion de commerce électronique ; Expliquer le rapport entre les technologies et le commerce électronique."
        ],
        [
          "Le commerce électronique (consolidation)",
          "Le commerce électronique (e-commerce) : Expliquer la notion de commerce électronique ; Expliquer le rapport entre les technologies et le commerce électronique."
        ]
      ]
    }
  },
  "tic.env-info": {
    "savoir": "Avoir un esprit critique et être créatif",
    "units": {
      "1": [
        [
          "Périphériques d'entrée et sortie",
          "Identifier les périphériques et discriminer les périphériques d'entrée et les périphériques de sortie des outils TIC."
        ],
        [
          "Périphériques d'entrée et sortie (application)",
          "Identifier les périphériques et discriminer les périphériques d'entrée et les périphériques de sortie des outils TIC."
        ],
        [
          "Connecter les périphériques",
          "Connecter les différents périphériques à l'unité centrale."
        ]
      ],
      "2": [
        [
          "Composantes du logiciel Word",
          "Identifier les principales composantes du logiciel Word (barre de menus, barre d'outils)."
        ],
        [
          "Composantes du logiciel Word (application)",
          "Identifier les principales composantes du logiciel Word (barre de menus, barre d'outils)."
        ],
        [
          "Composantes du logiciel Word (consolidation)",
          "Identifier les principales composantes du logiciel Word (barre de menus, barre d'outils)."
        ]
      ],
      "3": [
        [
          "Qu'est-ce qu'un fichier",
          "Expliquer ce qu'est un fichier."
        ],
        [
          "Creer des fichiers",
          "Creer des fichiers dans l'ordinateur et dans les unites de stockage externe (cle USB)."
        ],
        [
          "Stocker et recuperer l'information",
          "Stocker et recuperer l'information dans l'ordinateur ou dans une memoire externe."
        ]
      ],
      "4": [
        [
          "Logiciel de présentation",
          "Expliquer ce qu'est un logiciel de présentation assistée par ordinateur."
        ],
        [
          "Le logiciel PowerPoint",
          "Expliquer le fonctionnement du logiciel PowerPoint."
        ],
        [
          "Le logiciel PowerPoint (application)",
          "Expliquer le fonctionnement du logiciel PowerPoint."
        ]
      ],
      "5": [
        [
          "Créer une diapositive",
          "Présentation assistée par ordinateur : créer une diapositive ayant un texte court; produire 5 diapositives."
        ],
        [
          "Réaliser une présentation",
          "Présentation assistée par ordinateur : réaliser une présentation avec un logiciel de présentation."
        ],
        [
          "Photo et vidéo",
          "Photo et vidéo : prendre une photo; réaliser une vidéo."
        ]
      ],
      "6": [
        [
          "Calculs avec un tableur",
          "Calculs avec un tableur : créer une feuille de calcul sous un tableur; créer un tableau avec un tableur."
        ],
        [
          "Calculs avec un tableur (application)",
          "Calculs avec un tableur : créer une feuille de calcul sous un tableur; créer un tableau avec un tableur."
        ],
        [
          "Calculs avec un tableur (consolidation)",
          "Calculs avec un tableur : créer une feuille de calcul sous un tableur; créer un tableau avec un tableur."
        ]
      ],
      "7": [
        [
          "Dessin sur logiciel",
          "Produire un dessin en utilisant un logiciel approprié."
        ],
        [
          "Dessin sur logiciel (application)",
          "Produire un dessin en utilisant un logiciel approprié."
        ],
        [
          "Les jeux numériques",
          "Pratiquer un jeu numérique éducatif."
        ]
      ]
    }
  },
  "tic.production-tic": {
    "savoir": "Être créatif",
    "units": {
      "1": [
        [
          "Produire un texte",
          "Produire un texte kilométrique avec un logiciel de saisie."
        ],
        [
          "Produire un texte (application)",
          "Produire un texte kilométrique avec un logiciel de saisie."
        ],
        [
          "Produire un texte (consolidation)",
          "Produire un texte kilométrique avec un logiciel de saisie."
        ]
      ],
      "2": [
        [
          "Insérer une image",
          "Insérer une image dans un document."
        ],
        [
          "Insérer un tableau",
          "Insérer un tableau dans un document."
        ],
        [
          "Insérer tableau et image",
          "Insérer un tableau et une image dans un document."
        ]
      ],
      "3": [
        [
          "Feuille de calcul et tableau",
          "Creer une feuille de calcul sur un tableur; Creer un tableau avec un tableur."
        ],
        [
          "Feuille de calcul et tableau (application)",
          "Creer une feuille de calcul sur un tableur; Creer un tableau avec un tableur."
        ],
        [
          "Feuille de calcul et tableau (consolidation)",
          "Creer une feuille de calcul sur un tableur; Creer un tableau avec un tableur."
        ]
      ],
      "4": [
        [
          "Dessin avec logiciel",
          "Produire un dessin en utilisant un logiciel approprié."
        ],
        [
          "Dessin avec logiciel (application)",
          "Produire un dessin en utilisant un logiciel approprié."
        ],
        [
          "Dessin avec logiciel (consolidation)",
          "Produire un dessin en utilisant un logiciel approprié."
        ]
      ],
      "5": [
        [
          "Photo et vidéo",
          "Photo et vidéo : prendre une photo; réaliser une vidéo."
        ],
        [
          "Photo et vidéo (application)",
          "Photo et vidéo : prendre une photo; réaliser une vidéo."
        ],
        [
          "Photo et vidéo (consolidation)",
          "Photo et vidéo : prendre une photo; réaliser une vidéo."
        ]
      ],
      "6": [
        [
          "Présentation assistée par ordinateur",
          "Présentation assistée par ordinateur : insérer un texte, une image, un tableau sur une diapositive."
        ],
        [
          "Présentation assistée par ordinateur (application)",
          "Présentation assistée par ordinateur : insérer un texte, une image, un tableau sur une diapositive."
        ],
        [
          "Présentation assistée par ordinateur (consolidation)",
          "Présentation assistée par ordinateur : insérer un texte, une image, un tableau sur une diapositive."
        ]
      ],
      "7": [
        [
          "Présentation assistée par ordinateur",
          "Produire 5 diapositives."
        ],
        [
          "Présentation assistée par ordinateur (application)",
          "Produire 5 diapositives."
        ],
        [
          "Présentation assistée par ordinateur",
          "Présenter une production avec un logiciel de présentation."
        ]
      ],
      "8": [
        [
          "PowerPoint : insérer des éléments",
          "Powerpoint : Insérer un texte, une image, un tableau sur une diapositive."
        ],
        [
          "PowerPoint : insérer des éléments (application)",
          "Powerpoint : Insérer un texte, une image, un tableau sur une diapositive."
        ],
        [
          "PowerPoint : insérer des éléments (consolidation)",
          "Powerpoint : Insérer un texte, une image, un tableau sur une diapositive."
        ]
      ]
    }
  },
  "tic.internet": {
    "savoir": "Avoir la culture numérique",
    "units": {
      "1": [
        [
          "Le concept de réseau",
          "Expliquer le concept de réseau."
        ],
        [
          "Utilisations d'internet",
          "Expliquer les utilisations qu'on peut faire d'Internet."
        ],
        [
          "Schématiser le réseau Internet",
          "Schématiser le réseau internet."
        ]
      ],
      "4": [
        [
          "Réseau et Internet",
          "Expliquer le concept de réseau et d'internet; expliquer les utilisations qu'on peut faire d'internet; schématiser le réseau internet."
        ],
        [
          "Courrier électronique",
          "Expliquer les termes relatifs au courrier électronique; expliquer comment communiquer par internet."
        ],
        [
          "Logiciel de messagerie",
          "Expliquer ce qu'est un logiciel de messagerie; explorer un logiciel de messagerie; identifier les fonctionnalités d'un logiciel de messagerie."
        ]
      ],
      "5": [
        [
          "Courrier électronique",
          "Courrier électronique : traiter un texte dans un logiciel de messagerie."
        ],
        [
          "Moteur de recherche",
          "Recherche sur internet : expliquer ce qu'est un moteur de recherche."
        ],
        [
          "Faire une recherche Internet",
          "Recherche sur internet : expliquer comment faire une recherche sur internet."
        ]
      ],
      "6": [
        [
          "Recherche sur Internet",
          "Recherche sur internet : rechercher une information sur internet; rechercher une information à la demande sur internet."
        ],
        [
          "Recherche sur Internet (application)",
          "Recherche sur internet : rechercher une information sur internet; rechercher une information à la demande sur internet."
        ],
        [
          "Recherche sur Internet (consolidation)",
          "Recherche sur internet : rechercher une information sur internet; rechercher une information à la demande sur internet."
        ]
      ],
      "7": [
        [
          "Réseaux sociaux",
          "Expliquer la notion de réseau social; expliquer le fonctionnement d'un réseau social sur internet."
        ],
        [
          "Recherche sur Internet",
          "Rechercher une information sur internet."
        ],
        [
          "Recherche sur Internet",
          "Rechercher une information à la demande sur internet."
        ]
      ],
      "8": [
        [
          "Recherche sur Internet",
          "Recherche sur internet : Rechercher une information sur internet."
        ],
        [
          "Recherche sur Internet (application)",
          "Recherche sur internet : Rechercher une information sur internet."
        ],
        [
          "Recherche sur Internet (consolidation)",
          "Recherche sur internet : Rechercher une information sur internet."
        ]
      ]
    }
  },
  "tic.sante-securite-ethique": {
    "savoir": "Être prudent et intègre",
    "units": {
      "1": [
        [
          "Sécurité des appareils électroniques",
          "Énoncer les mesures de sécurité à respecter quand on utilise les appareils électroniques (radio, téléviseur, téléphone, ordinateur…)."
        ],
        [
          "Sécurité et hygiène des appareils",
          "Énoncer les mesures de sécurité à respecter quand on utilise les appareils électroniques (radio, téléviseur, téléphone, ordinateur…); Énoncer les mesures d'hygiène à respecter quand on utilise les appareils électroniques (radio, téléviseur, téléphone, ordinateur…)."
        ],
        [
          "Hygiène des appareils électroniques",
          "Énoncer les mesures d'hygiène à respecter quand on utilise les appareils électroniques (radio, téléviseur, téléphone, ordinateur…)."
        ]
      ],
      "2": [
        [
          "Comportement vis-à-vis des TIC d'autrui",
          "Expliquer le comportement à adopter vis-à-vis des outils TIC d'autrui."
        ],
        [
          "Comportement vis-à-vis des TIC d'autrui (application)",
          "Expliquer le comportement à adopter vis-à-vis des outils TIC d'autrui."
        ],
        [
          "Comportement vis-à-vis des TIC d'autrui (consolidation)",
          "Expliquer le comportement à adopter vis-à-vis des outils TIC d'autrui."
        ]
      ],
      "3": [
        [
          "Notion de droits d'auteur",
          "Expliquer la notion de droits d'auteur."
        ],
        [
          "Notion de droits d'auteur (application)",
          "Expliquer la notion de droits d'auteur."
        ],
        [
          "Notion de droits d'auteur (consolidation)",
          "Expliquer la notion de droits d'auteur."
        ]
      ],
      "4": [
        [
          "Règles de communication",
          "Expliquer les règles à respecter quand on écrit un message à envoyer sur internet; expliquer les règles à respecter quand on fait un appel téléphonique."
        ],
        [
          "Règles de communication (application)",
          "Expliquer les règles à respecter quand on écrit un message à envoyer sur internet; expliquer les règles à respecter quand on fait un appel téléphonique."
        ],
        [
          "Règles de communication (consolidation)",
          "Expliquer les règles à respecter quand on écrit un message à envoyer sur internet; expliquer les règles à respecter quand on fait un appel téléphonique."
        ]
      ],
      "5": [
        [
          "Éthique de la recherche",
          "Éthique : expliquer les règles à respecter lorsqu'on fait une recherche sur internet."
        ],
        [
          "Éthique de la recherche (application)",
          "Éthique : expliquer les règles à respecter lorsqu'on fait une recherche sur internet."
        ],
        [
          "Éthique du jeu en ligne",
          "Éthique : expliquer les règles à respecter lorsqu'on joue avec des amis sur un outil TIC."
        ]
      ],
      "6": [
        [
          "Éthique : recherche Internet",
          "Éthique : expliquer les règles à respecter lorsqu'on fait une recherche sur internet."
        ],
        [
          "Éthique : recherche Internet (application)",
          "Éthique : expliquer les règles à respecter lorsqu'on fait une recherche sur internet."
        ],
        [
          "Éthique : jeux en ligne",
          "Éthique : expliquer les règles à respecter lorsqu'on joue avec des amis sur un outil TIC."
        ]
      ],
      "7": [
        [
          "Loi et droits",
          "Expliquer la notion de cybercriminalité."
        ],
        [
          "Éthique",
          "Expliquer les règles de conduite à mettre en pratique pour communiquer en général avec les TIC."
        ],
        [
          "Éthique (application)",
          "Expliquer les règles de conduite à mettre en pratique pour communiquer en général avec les TIC."
        ]
      ],
      "8": [
        [
          "Sécurité sur Internet",
          "Sécurité : Enoncer les mesures de sécurité à respecter quand on navigue sur internet."
        ],
        [
          "Éthique : diffusion de données",
          "Ethique : Expliquer les dangers auxquels on peut s'exposer en diffusant des données (photo, informations fausses…) sur les réseaux sociaux ou sur internet."
        ],
        [
          "Éthique : diffusion de données (application)",
          "Ethique : Expliquer les dangers auxquels on peut s'exposer en diffusant des données (photo, informations fausses…) sur les réseaux sociaux ou sur internet."
        ]
      ]
    }
  },
  "tic.programmation": {
    "savoir": "Être créatif",
    "units": {
      "1": [
        [
          "Notion de programmation",
          "Expliquer la notion de programme et de programmation."
        ],
        [
          "Écrire un algorithme",
          "Utiliser les opérations arithmétiques, les conditionnels et les répétitions pour écrire un algorithme."
        ],
        [
          "Écrire un algorithme (application)",
          "Utiliser les opérations arithmétiques, les conditionnels et les répétitions pour écrire un algorithme."
        ]
      ],
      "6": [
        [
          "Programme et programmation",
          "Programme : expliquer la notion de programme et de programmation."
        ],
        [
          "Écriture d'un algorithme",
          "Écriture d'un algorithme numérique : utiliser les opérations arithmétiques, les conditionnels et les répétitions pour écrire un algorithme."
        ],
        [
          "Écriture d'un algorithme (application)",
          "Écriture d'un algorithme numérique : utiliser les opérations arithmétiques, les conditionnels et les répétitions pour écrire un algorithme."
        ]
      ],
      "8": [
        [
          "Scratch : programmation",
          "Scratch : Utiliser scratch pour réaliser des programmations."
        ],
        [
          "Art tortue : programmation",
          "Art tortue : Utiliser Art tortue pour réaliser des programmations."
        ],
        [
          "Art tortue : programmation (application)",
          "Art tortue : Utiliser Art tortue pour réaliser des programmations."
        ]
      ]
    }
  },
  "arts.arts-visuels": {
    "savoir": "Avoir le goût du beau et être créatif",
    "units": {
      "1": [
        [
          "Dessiner objets et êtres",
          "Dessiner des objets ou des êtres."
        ],
        [
          "Dessiner objets et êtres (application)",
          "Dessiner des objets ou des êtres."
        ],
        [
          "Dessiner objets et êtres (consolidation)",
          "Dessiner des objets ou des êtres."
        ]
      ],
      "2": [
        [
          "Enduire une surface",
          "Enduire une surface."
        ],
        [
          "Enduire une surface (application)",
          "Enduire une surface."
        ],
        [
          "Enduire une surface (consolidation)",
          "Enduire une surface."
        ]
      ],
      "3": [
        [
          "Entailler des materiaux",
          "Entailler (papier, bois, plastique...)."
        ],
        [
          "Entailler des materiaux (application)",
          "Entailler (papier, bois, plastique...)."
        ],
        [
          "Entailler des materiaux (consolidation)",
          "Entailler (papier, bois, plastique...)."
        ]
      ],
      "4": [
        [
          "Imprimer et modeler",
          "Imprimer (empreinte); modeler."
        ],
        [
          "Imprimer et modeler (application)",
          "Imprimer (empreinte); modeler."
        ],
        [
          "Imprimer et modeler (consolidation)",
          "Imprimer (empreinte); modeler."
        ]
      ],
      "5": [
        [
          "Dessiner avec les TIC",
          "Techniques de traitement avec les TIC : dessiner (formes, personnages…)."
        ],
        [
          "Dessiner avec les TIC (application)",
          "Techniques de traitement avec les TIC : dessiner (formes, personnages…)."
        ],
        [
          "Dessiner avec les TIC (consolidation)",
          "Techniques de traitement avec les TIC : dessiner (formes, personnages…)."
        ]
      ],
      "6": [
        [
          "Traitement avec les TIC",
          "Techniques de traitement avec les TIC : colorier des formes et des bordures."
        ],
        [
          "Traitement avec les TIC (application)",
          "Techniques de traitement avec les TIC : colorier des formes et des bordures."
        ],
        [
          "Traitement avec les TIC (consolidation)",
          "Techniques de traitement avec les TIC : colorier des formes et des bordures."
        ]
      ],
      "7": [
        [
          "Restauration d'œuvres",
          "Appliquer les techniques de restauration des tableaux."
        ],
        [
          "Restauration d'œuvres (application)",
          "Appliquer les techniques de restauration des tableaux."
        ],
        [
          "Restauration d'œuvres (consolidation)",
          "Appliquer les techniques de restauration des tableaux."
        ]
      ],
      "8": [
        [
          "Techniques de restauration d'œuvres",
          "Techniques de restauration d'œuvres : Appliquer les techniques de restauration des tableaux."
        ],
        [
          "Techniques de restauration d'œuvres (application)",
          "Techniques de restauration d'œuvres : Appliquer les techniques de restauration des tableaux."
        ],
        [
          "Techniques de restauration d'œuvres (consolidation)",
          "Techniques de restauration d'œuvres : Appliquer les techniques de restauration des tableaux."
        ]
      ]
    }
  },
  "arts.musique": {
    "savoir": "Avoir le goût du beau et être créatif",
    "units": {
      "1": [
        [
          "Noms des notes",
          "Identifier les noms des notes."
        ],
        [
          "Noms des notes (application)",
          "Identifier les noms des notes."
        ],
        [
          "Noms des notes (consolidation)",
          "Identifier les noms des notes."
        ]
      ],
      "2": [
        [
          "Chanter les notes",
          "Chanter les notes."
        ],
        [
          "Origine des noms des notes",
          "Expliquer l'origine des noms des notes."
        ],
        [
          "Origine des noms des notes (application)",
          "Expliquer l'origine des noms des notes."
        ]
      ],
      "3": [
        [
          "Portee musicale",
          "Dessiner la portee musicale; Identifier les lignes et les interlignes."
        ],
        [
          "Portee musicale (application)",
          "Dessiner la portee musicale; Identifier les lignes et les interlignes."
        ],
        [
          "Portee musicale (consolidation)",
          "Dessiner la portee musicale; Identifier les lignes et les interlignes."
        ]
      ],
      "4": [
        [
          "Figures de notes",
          "Identifier les figures de notes et leur durée."
        ],
        [
          "Figures de notes (application)",
          "Identifier les figures de notes et leur durée."
        ],
        [
          "Figures de notes (consolidation)",
          "Identifier les figures de notes et leur durée."
        ]
      ],
      "5": [
        [
          "Clefs de sol et fa",
          "Les figures de clefs : identifier la clef de SOL et la clef de FA."
        ],
        [
          "Clefs de do et ut",
          "Les figures de clefs : identifier la clef de DO et la clef d'UT."
        ],
        [
          "Placer les clefs",
          "Les figures de clefs : placer les clefs sur une portée."
        ]
      ],
      "6": [
        [
          "Les altérations",
          "Les altérations : identifier le dièse, le bémol et le bécarre."
        ],
        [
          "Altérations sur une portée",
          "Les altérations : identifier les altérations sur une portée."
        ],
        [
          "Les figures des silences",
          "Les figures des silences : identifier les figures des silences."
        ]
      ],
      "7": [
        [
          "Les figures de silence",
          "Identifier les durées des figures des silences."
        ],
        [
          "Les mesures",
          "Identifier les mesures sur une portée."
        ],
        [
          "Les mesures",
          "Identifier les mesures simples."
        ]
      ],
      "8": [
        [
          "Les mesures",
          "Les mesures : Battre la mesure à 2, à 3 et à 4 temps."
        ],
        [
          "Les instruments de musique",
          "Les instruments de musique : Identifier les instruments de musique et les sons qu'ils produisent ; Décrire les instruments de musique ; Fabriquer un instrument de musique."
        ],
        [
          "Figures de la musique camerounaise",
          "Quelques figures emblématiques de la musique camerounaise : Nommer quelques figures de la musique camerounaise ; Interpréter une chanson d'un musicien de sa localité."
        ]
      ]
    }
  },
  "arts.arts-dramatiques": {
    "savoir": "Avoir le sens de l'humour et être rigoureux dans le respect des normes artistiques",
    "units": {
      "1": [
        [
          "Imiter une voix",
          "Imiter une voix."
        ],
        [
          "Imiter une voix et adopter attitude",
          "Imiter une voix; Adopter une attitude."
        ],
        [
          "Adopter une attitude",
          "Adopter une attitude."
        ]
      ],
      "2": [
        [
          "Imiter une voix",
          "Imiter une voix."
        ],
        [
          "Exécuter un geste précis",
          "Exécuter un geste précis."
        ],
        [
          "Adopter une attitude",
          "Adopter une attitude."
        ]
      ],
      "3": [
        [
          "Imiter une voix",
          "Imiter une voix."
        ],
        [
          "Executer un geste precis",
          "Executer un geste precis."
        ],
        [
          "Adopter une attitude",
          "Adopter une attitude."
        ]
      ],
      "4": [
        [
          "Imiter une voix",
          "Imiter une voix."
        ],
        [
          "Exécuter un geste",
          "Exécuter un geste précis."
        ],
        [
          "Adopter une attitude",
          "Adopter une attitude."
        ]
      ],
      "5": [
        [
          "Les voix",
          "Les voix : imiter une voix."
        ],
        [
          "Les gestes",
          "Les gestes : exécuter un geste précis."
        ],
        [
          "Les attitudes",
          "Les attitudes : adopter une attitude."
        ]
      ],
      "6": [
        [
          "Les voix",
          "Les voix : imiter une voix."
        ],
        [
          "Les gestes",
          "Les gestes : exécuter un geste précis."
        ],
        [
          "Les attitudes",
          "Les attitudes : adopter une attitude."
        ]
      ],
      "7": [
        [
          "Les sketches",
          "Jouer un rôle."
        ],
        [
          "Les attitudes",
          "Adopter une attitude."
        ],
        [
          "Les attitudes (application)",
          "Adopter une attitude."
        ]
      ],
      "8": [
        [
          "Figures du théâtre camerounais",
          "Quelques figures emblématiques du théâtre camerounais : Nommer des figures emblématiques du théâtre camerounais."
        ],
        [
          "Interpréter un sketch",
          "Quelques figures emblématiques du théâtre camerounais : Interpréter un sketch ou un extrait d'une œuvre d'un homme de théâtre de sa localité."
        ],
        [
          "Interpréter un sketch (application)",
          "Quelques figures emblématiques du théâtre camerounais : Interpréter un sketch ou un extrait d'une œuvre d'un homme de théâtre de sa localité."
        ]
      ]
    }
  },
  "arts.danse": {
    "savoir": "Avoir le sens du rythme, de l'esthétique et de l'harmonie dans les mouvements de son corps",
    "units": {
      "1": [
        [
          "Imiter un pas de danse",
          "Imiter un pas de danse."
        ],
        [
          "Imiter un pas de danse (application)",
          "Imiter un pas de danse."
        ],
        [
          "Imiter un pas de danse (consolidation)",
          "Imiter un pas de danse."
        ]
      ],
      "2": [
        [
          "Imiter un pas de danse",
          "Imiter un pas de danse."
        ],
        [
          "Imiter un pas de danse (application)",
          "Imiter un pas de danse."
        ],
        [
          "Imiter un pas de danse (consolidation)",
          "Imiter un pas de danse."
        ]
      ],
      "3": [
        [
          "Danse traditionnelle locale",
          "Executer une danse traditionnelle de sa localite."
        ],
        [
          "Danse traditionnelle locale (application)",
          "Executer une danse traditionnelle de sa localite."
        ],
        [
          "Danse traditionnelle locale (consolidation)",
          "Executer une danse traditionnelle de sa localite."
        ]
      ],
      "4": [
        [
          "Danse traditionnelle locale",
          "Exécuter une danse traditionnelle de sa localité."
        ],
        [
          "Danse traditionnelle locale (application)",
          "Exécuter une danse traditionnelle de sa localité."
        ],
        [
          "Danse traditionnelle locale (consolidation)",
          "Exécuter une danse traditionnelle de sa localité."
        ]
      ],
      "5": [
        [
          "Danse moderne",
          "Exécuter une danse moderne."
        ],
        [
          "Danse moderne (application)",
          "Exécuter une danse moderne."
        ],
        [
          "Danse moderne (consolidation)",
          "Exécuter une danse moderne."
        ]
      ],
      "6": [
        [
          "Danses modernes",
          "Danses modernes : exécuter une danse moderne."
        ],
        [
          "Danses modernes (application)",
          "Danses modernes : exécuter une danse moderne."
        ],
        [
          "Danses modernes (consolidation)",
          "Danses modernes : exécuter une danse moderne."
        ]
      ],
      "7": [
        [
          "Les rythmes",
          "Identifier les rythmes."
        ],
        [
          "Les rythmes",
          "Chanter/danser au rythme d'une cadence."
        ],
        [
          "Les rythmes (application)",
          "Chanter/danser au rythme d'une cadence."
        ]
      ],
      "8": [
        [
          "Identifier les rythmes",
          "Les rythmes : Identifier les rythmes."
        ],
        [
          "Danser au rythme d'une cadence",
          "Les rythmes : Chanter/danser au rythme d'une cadence."
        ],
        [
          "Danser au rythme d'une cadence (application)",
          "Les rythmes : Chanter/danser au rythme d'une cadence."
        ]
      ]
    }
  },
  "eps.athletisme": {
    "savoir": "Avoir le goût de l'effort, la maîtrise de ses émotions et l'esprit de fairplay",
    "units": {
      "1": [
        [
          "Notion d'athlétisme",
          "Expliquer la notion d'athlétisme; Déterminer les principales disciplines étudiées; Utiliser un vocabulaire approprié en athlétisme."
        ],
        [
          "Courir vite sur 60m",
          "Courir vite sur 60m; Se propulser plus efficacement vers l'avant au départ."
        ],
        [
          "Courir vite sur 60m (application)",
          "Courir vite sur 60m; Se propulser plus efficacement vers l'avant au départ."
        ]
      ],
      "2": [
        [
          "Course régulière et gestion d'allure",
          "Courir en allure régulière, en aisance respiratoire à l'aide de repères visuels ou sonores puis sans repères dans un temps donné; Gérer sa course en changeant de rythme et de cadence sur une distance de 70 à 100 m pendant 10 minutes."
        ],
        [
          "Récupération et lancer d'engin",
          "Récupérer activement après une course pour enchaîner une autre (3 passages); Projeter un engin de 2kg; Se familiariser et manipuler l'engin (balle lestée, balle de tennis…)."
        ],
        [
          "Trajectoire de lancer et règlement",
          "Construire une trajectoire de lancer; Pratiquer quelques éléments du règlement."
        ]
      ],
      "3": [
        [
          "Course d'elan et franchissement",
          "Enchainer l'execution des actions de la course d'elan et de franchissement; Impulser les jambes avec action des bras dans le sens du saut; Utiliser les bras pour sauter haut; Augmenter la dynamique du mouvement au moment de l'impulsion pour le franchissement."
        ],
        [
          "Appuis et enchainement au sol",
          "Se deplacer de differentes facons sur des appuis manuels et pedestres; Construire et realiser un enchainement de 4 a 5 elements au sol (tourner, se renverser et envol)."
        ],
        [
          "Appuis et enchainement au sol (application)",
          "Se deplacer de differentes facons sur des appuis manuels et pedestres; Construire et realiser un enchainement de 4 a 5 elements au sol (tourner, se renverser et envol)."
        ]
      ]
    }
  },
  "eps.sports-co": {
    "savoir": "Avoir le goût de l'effort, la maîtrise de ses émotions et l'esprit de fairplay",
    "units": {
      "4": [
        [
          "Notion de sports collectifs",
          "Expliquer la notion de sports collectifs; déterminer les principaux sports collectifs et les principes des disciplines étudiées; récupérer le ballon."
        ],
        [
          "Placement et principes",
          "Déterminer les principaux principes des sports collectifs étudiés; se placer, se déplacer, se replacer."
        ],
        [
          "Conserver et passer le ballon",
          "Conserver le ballon; effectuer une passe; connaître les règles élémentaires du jeu; réceptionner le ballon."
        ]
      ],
      "5": [
        [
          "Basket-ball : principes et placement",
          "Basket-ball (attaque) : déterminer les principaux principes des sports collectifs étudiés; se placer, se déplacer, se replacer. Basket-ball (défense) : récupérer le ballon, se placer, se déplacer, se replacer; réceptionner le ballon."
        ],
        [
          "Basket-ball : conserver et passer",
          "Basket-ball (attaque) : conserver le ballon; effectuer une passe. Basket-ball (défense) : récupérer le ballon, se placer, se déplacer, se replacer; réceptionner le ballon."
        ],
        [
          "Basket-ball : règles du jeu",
          "Basket-ball (attaque) : connaître les règles élémentaires du jeu; pratiquer des sports collectifs. Basket-ball (défense) : récupérer le ballon, se placer, se déplacer, se replacer; réceptionner le ballon."
        ]
      ],
      "6": [
        [
          "Handball : principes et placement",
          "Sports collectifs, activités d'opposition/coopération. Attaque — Handball : déterminer les principaux principes des sports collectifs étudiés; se placer, se déplacer, se replacer. Défense — Handball : récupérer le ballon, se placer, se déplacer, se replacer; réceptionner le ballon."
        ],
        [
          "Handball : conserver et passer",
          "Attaque — Handball : conserver le ballon; effectuer une passe. Défense — Handball : récupérer le ballon, se placer, se déplacer, se replacer; réceptionner le ballon."
        ],
        [
          "Handball : règles du jeu",
          "Attaque — Handball : connaître les règles élémentaires du jeu; pratiquer des sports collectifs. Défense — Handball : récupérer le ballon, se placer, se déplacer, se replacer; réceptionner le ballon."
        ]
      ],
      "7": [
        [
          "Volley-ball (attaque et défense)",
          "En attaque: se placer, se déplacer, se replacer; identifier les postes et expliquer les rôles des joueurs. En défense: se placer, se déplacer, se replacer, réceptionner le ballon; connaître les postes des joueurs."
        ],
        [
          "Volley-ball (attaque et défense) (application)",
          "En attaque: se placer, se déplacer, se replacer; identifier les postes et expliquer les rôles des joueurs. En défense: se placer, se déplacer, se replacer, réceptionner le ballon; connaître les postes des joueurs."
        ],
        [
          "Volley-ball (attaque et défense) (consolidation)",
          "En attaque: se placer, se déplacer, se replacer; identifier les postes et expliquer les rôles des joueurs. En défense: se placer, se déplacer, se replacer, réceptionner le ballon; connaître les postes des joueurs."
        ]
      ]
    }
  },
  "eps.autodefense": {
    "savoir": "Être vigilant et avoir le sens de l'autodéfense",
    "units": {
      "1": [
        [
          "Situation d'autodéfense",
          "Mettre en scène une situation d'autodéfense (feindre un déplacement)."
        ],
        [
          "Situation d'autodéfense (application)",
          "Mettre en scène une situation d'autodéfense (feindre un déplacement)."
        ],
        [
          "Situation d'autodéfense (consolidation)",
          "Mettre en scène une situation d'autodéfense (feindre un déplacement)."
        ]
      ],
      "2": [
        [
          "Situation d'autodéfense",
          "Mettre en scène une situation d'autodéfense (feindre un déplacement."
        ],
        [
          "Situation d'autodéfense (application)",
          "Mettre en scène une situation d'autodéfense (feindre un déplacement."
        ],
        [
          "Situation d'autodéfense (consolidation)",
          "Mettre en scène une situation d'autodéfense (feindre un déplacement."
        ]
      ],
      "3": [
        [
          "Situation d'autodefense",
          "Mettre en scene une situation d'autodefense (feindre une frappe)."
        ],
        [
          "Situation d'autodefense (application)",
          "Mettre en scene une situation d'autodefense (feindre une frappe)."
        ],
        [
          "Situation d'autodefense (consolidation)",
          "Mettre en scene une situation d'autodefense (feindre une frappe)."
        ]
      ],
      "4": [
        [
          "Situation d'autodéfense",
          "Mettre en scène une situation d'autodéfense (feindre une frappe)."
        ],
        [
          "Situation d'autodéfense (application)",
          "Mettre en scène une situation d'autodéfense (feindre une frappe)."
        ],
        [
          "Situation d'autodéfense (consolidation)",
          "Mettre en scène une situation d'autodéfense (feindre une frappe)."
        ]
      ],
      "5": [
        [
          "Les feintes",
          "Les feintes : mettre en scène une situation d'autodéfense (feindre d'avoir peur)."
        ],
        [
          "Les feintes (application)",
          "Les feintes : mettre en scène une situation d'autodéfense (feindre d'avoir peur)."
        ],
        [
          "Les feintes (consolidation)",
          "Les feintes : mettre en scène une situation d'autodéfense (feindre d'avoir peur)."
        ]
      ],
      "6": [
        [
          "Les feintes",
          "Les feintes : mettre en scène une situation d'autodéfense (feindre une frappe, feindre d'avoir peur)."
        ],
        [
          "Les feintes (application)",
          "Les feintes : mettre en scène une situation d'autodéfense (feindre une frappe, feindre d'avoir peur)."
        ],
        [
          "Les feintes (consolidation)",
          "Les feintes : mettre en scène une situation d'autodéfense (feindre une frappe, feindre d'avoir peur)."
        ]
      ],
      "7": [
        [
          "Les mains",
          "Dégager une main tenue par un tiers."
        ],
        [
          "Les mains (application)",
          "Dégager une main tenue par un tiers."
        ],
        [
          "Les mains (consolidation)",
          "Dégager une main tenue par un tiers."
        ]
      ],
      "8": [
        [
          "Les mains : blocage d'un coup",
          "Les mains : Utiliser la technique de blocage d'un coup avec la main."
        ],
        [
          "Les mains : blocage d'un coup (application)",
          "Les mains : Utiliser la technique de blocage d'un coup avec la main."
        ],
        [
          "Les mains : blocage d'un coup (consolidation)",
          "Les mains : Utiliser la technique de blocage d'un coup avec la main."
        ]
      ]
    }
  },
  "devperso.artisanat": {
    "savoir": "Être inventif et avoir l'esprit d'initiative",
    "units": {
      "1": [
        [
          "Poterie et modelage",
          "Préparer le matériau de poterie; Mouler et modeler les objets courants de la maison."
        ],
        [
          "Décoration en creux et relief",
          "Préparer les matériaux de la décoration en creux; Réaliser les décors en creux et en relief à la maison."
        ],
        [
          "Objets et jouets mathématiques",
          "Construire des jouets en carton à partir des données mathématiques; Construire des objets en utilisant des critères mathématiques (mesure, couleur et formes); Modeler et mouler les objets."
        ]
      ],
      "2": [
        [
          "Construire des objets",
          "Construire des objets en lie avec des projets à réaliser."
        ],
        [
          "Construire des objets (application)",
          "Construire des objets en lie avec des projets à réaliser."
        ],
        [
          "Construire des objets (consolidation)",
          "Construire des objets en lie avec des projets à réaliser."
        ]
      ],
      "3": [
        [
          "Poterie: mouler et modeler",
          "Preparer le materiau de poterie; Mouler et modeler les objets courants de la classe."
        ],
        [
          "Decoration en creux et relief",
          "Preparer les materiaux de la decoration en creux; Realiser les decors en creux et en relief en classe."
        ],
        [
          "Fabriquer solides et objets",
          "Fabriquer les solides etudies en classe en mathematiques a l'aide du carton et du materiel approprie; Fabriquer des enveloppes; Construire les objets en lien avec les projets a realiser."
        ]
      ],
      "4": [
        [
          "Matériau de vannerie",
          "Préparer le matériau de vannerie; utiliser le matériel local pour modeler les objets par tissage."
        ],
        [
          "Matériau de vannerie (application)",
          "Préparer le matériau de vannerie; utiliser le matériel local pour modeler les objets par tissage."
        ],
        [
          "Construire des objets",
          "Construire les objets en lien avec les projets à réaliser."
        ]
      ],
      "5": [
        [
          "Construction artistique",
          "Construction artistique : construire des objets en lien avec les projets à réaliser."
        ],
        [
          "Construction artistique (application)",
          "Construction artistique : construire des objets en lien avec les projets à réaliser."
        ],
        [
          "Construction artistique (consolidation)",
          "Construction artistique : construire des objets en lien avec les projets à réaliser."
        ]
      ],
      "6": [
        [
          "Construction artistique",
          "Construction artistique : construire des objets en lien avec les projets à réaliser."
        ],
        [
          "Construction artistique (application)",
          "Construction artistique : construire des objets en lien avec les projets à réaliser."
        ],
        [
          "Construction artistique (consolidation)",
          "Construction artistique : construire des objets en lien avec les projets à réaliser."
        ]
      ],
      "7": [
        [
          "Construction artistique",
          "Construire des objets en lien avec les projets à réaliser."
        ],
        [
          "Construction artistique (application)",
          "Construire des objets en lien avec les projets à réaliser."
        ],
        [
          "Construction artistique (consolidation)",
          "Construire des objets en lien avec les projets à réaliser."
        ]
      ],
      "8": [
        [
          "Construction artistique",
          "Construction artistique : Construire des objets en lien avec les projets à réaliser."
        ],
        [
          "Construction artistique (application)",
          "Construction artistique : Construire des objets en lien avec les projets à réaliser."
        ],
        [
          "Construction artistique (consolidation)",
          "Construction artistique : Construire des objets en lien avec les projets à réaliser."
        ]
      ]
    }
  },
  "devperso.agropastoral-dp": {
    "savoir": "Être inventif, avoir l'esprit d'initiative et être entreprenant",
    "units": {
      "1": [
        [
          "Élever un animal de sa zone",
          "Élever et entretenir un animal de sa zone."
        ],
        [
          "Élever un animal de sa zone (application)",
          "Élever et entretenir un animal de sa zone."
        ],
        [
          "Élever un animal de sa zone (consolidation)",
          "Élever et entretenir un animal de sa zone."
        ]
      ],
      "2": [
        [
          "Préparer et fertiliser avec compost",
          "Préparer du compost; Fertiliser le sol avec du compost, du fumier, des engrais chimiques."
        ],
        [
          "Préparer le sol pour les semences",
          "Préparer le sol du défrichage jusqu'au début des semences."
        ],
        [
          "Élever et entretenir un animal",
          "Élever et entretenir un animal de sa zone."
        ]
      ],
      "3": [
        [
          "Maladies des plantes et elevage",
          "Lutter contre les maladies des plantes; Elever et entretenir un animal de sa zone."
        ],
        [
          "Maladies des plantes et elevage (application)",
          "Lutter contre les maladies des plantes; Elever et entretenir un animal de sa zone."
        ],
        [
          "Maladies des plantes et elevage (consolidation)",
          "Lutter contre les maladies des plantes; Elever et entretenir un animal de sa zone."
        ]
      ],
      "4": [
        [
          "Fabriquer de la provende",
          "Fabriquer de la provende."
        ],
        [
          "Utiliser du compost",
          "Utiliser convenablement du compost."
        ],
        [
          "Maladies des plantes et élevage",
          "Lutter contre les maladies des plantes; élever et entretenir un animal de sa zone."
        ]
      ],
      "5": [
        [
          "Entretien des plantes",
          "L'entretien des plantes : lutter contre les maladies des plantes."
        ],
        [
          "Entretien des plantes (application)",
          "L'entretien des plantes : lutter contre les maladies des plantes."
        ],
        [
          "Élevage des animaux",
          "L'élevage des animaux : élever et entretenir un animal de sa zone."
        ]
      ],
      "6": [
        [
          "Entretien des plantes",
          "L'entretien des plantes : lutter contre les maladies des plantes."
        ],
        [
          "Entretien des plantes (application)",
          "L'entretien des plantes : lutter contre les maladies des plantes."
        ],
        [
          "Élevage des animaux",
          "L'élevage des animaux : élever et entretenir un animal de sa zone."
        ]
      ],
      "7": [
        [
          "Entretien des plantes",
          "Lutter contre les maladies des plantes."
        ],
        [
          "Entretien des plantes (application)",
          "Lutter contre les maladies des plantes."
        ],
        [
          "Élevage des animaux",
          "Élever et entretenir un animal de sa zone."
        ]
      ],
      "8": [
        [
          "L'entretien des plantes",
          "L'entretien des plantes : Lutter contre les maladies des plantes."
        ],
        [
          "Méthodes de conservation",
          "Les méthodes de conservation : Fabriquer les outils de conservation des récoltes."
        ],
        [
          "L'élevage des animaux",
          "L'élevage des animaux : Elever et entretenir un animal de sa zone."
        ]
      ]
    }
  },
  "devperso.domestique": {
    "savoir": "Être méticuleux",
    "units": {
      "1": [
        [
          "Entretien des habits et maison",
          "Entretenir ses habits, de la vaisselle et de sa maison."
        ],
        [
          "Entretien des habits et maison (application)",
          "Entretenir ses habits, de la vaisselle et de sa maison."
        ],
        [
          "Entretien des habits et maison (consolidation)",
          "Entretenir ses habits, de la vaisselle et de sa maison."
        ]
      ],
      "2": [
        [
          "Faire les mailles à l'endroit",
          "Faire les mailles à l'endroit."
        ],
        [
          "Entretenir son village ou quartier",
          "Entretenir son village ou son quartier."
        ],
        [
          "Entretenir son village ou quartier (application)",
          "Entretenir son village ou son quartier."
        ]
      ],
      "3": [
        [
          "Entretenir classe et ecole",
          "Entretenir sa classe et son ecole."
        ],
        [
          "Entretenir classe et ecole (application)",
          "Entretenir sa classe et son ecole."
        ],
        [
          "Entretenir classe et ecole (consolidation)",
          "Entretenir sa classe et son ecole."
        ]
      ],
      "4": [
        [
          "Point de tige",
          "Effectuer un mouvement régulier sur un modèle en point de tige."
        ],
        [
          "Point de tige (application)",
          "Effectuer un mouvement régulier sur un modèle en point de tige."
        ],
        [
          "Point de tige (consolidation)",
          "Effectuer un mouvement régulier sur un modèle en point de tige."
        ]
      ]
    }
  }
};
function esc(s){return String(s).replace(/'/g,"''");}
const rows=[];
for(const key of Object.keys(DATA)){const [subject,component]=key.split(".");const {savoir,units}=DATA[key];
 for(const u of Object.keys(units)){const unit=parseInt(u);const theme=THEMES[unit-1];
  units[u].forEach((e,i)=>{rows.push({subject,component,unit,week:i+1,theme,title:e[0],desc:e[1],savoir});});}}
{const holes=[];for(const k of Object.keys(DATA))for(let u=1;u<=8;u++)if(!DATA[k].units[u]||!DATA[k].units[u].length)holes.push(`${k} U${u}`);
 if(holes.length)console.log(`Note: ${holes.length} empty (component,unit) cells (expected).`);}
let sql="-- EduCam — CM1 curriculum_topics — FULLY LITTORAL-realigned (all subjects).\n-- Wipes and replaces all CM1 topic rows. Safe to re-run (idempotent).\n\nBEGIN;\n\nDELETE FROM curriculum_topics WHERE level = 'cm1';\n\n";
sql+="INSERT INTO curriculum_topics (level, subject_id, component_id, unit_number, theme, week_number, topic_title, topic_description, savoir_etre, has_content) VALUES\n";
sql+=rows.map(r=>`  ('cm1', '${esc(r.subject)}', '${esc(r.component)}', ${r.unit}, '${esc(r.theme)}', ${r.week}, '${esc(r.title)}', '${esc(r.desc)}', '${esc(r.savoir)}', false)`).join(",\n")+";\n\nCOMMIT;\n";
writeFileSync("curriculum-cm1-rebuild.sql",sql);
console.log("Total topic rows:",rows.length,"| components:",Object.keys(DATA).length);
export { DATA, THEMES };
