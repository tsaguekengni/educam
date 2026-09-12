// EduCam — normalisation des numéros de téléphone.
//
// POURQUOI CE FICHIER EXISTE. Les numéros servent aux notifications WhatsApp,
// et Meta n'accepte qu'un format : indicatif pays puis chiffres, sans espace
// (la fonction Edge `send-whatsapp` retire même le « + » avant l'envoi).
// Or un numéro saisi à la main arrive sous dix formes : « 690 00 00 00 »,
// « +237690000000 », « 00237 690-00-00-00 », « 0690000000 ».
//
// Un numéro mal formé ne provoque AUCUNE erreur visible : l'envoi est
// simplement refusé côté Meta, et le parent n'est jamais prévenu. C'est le pire
// des défauts — invisible. On normalise donc à la saisie, et la console
// signale tout numéro qu'on ne saurait pas envoyer.
//
// Le numéro est une COORDONNÉE, jamais un identifiant de connexion : il vit
// dans nos tables (teachers.phone, parents.phone, students.parent_phone) et
// jamais dans auth.users. C'est ce qui permet de le corriger depuis la
// plateforme, sans clé de service.

// Indicatif présumé quand l'utilisateur saisit un numéro local sans indicatif.
// Le pilote est au Cameroun ; à changer ici (et seulement ici) si cela évolue.
export const DEFAULT_COUNTRY_CODE = "237";

// Longueurs nationales connues, pour reconnaître un numéro local.
//   Cameroun : 9 chiffres depuis 2016 — mobile en 6…, fixe en 2…
const CM_NATIONAL_LENGTH = 9;

/**
 * Normalise une saisie libre en E.164 (« +237690000000 »).
 * Renvoie null si on ne peut pas conclure — on préfère un champ vide signalé
 * à un numéro inventé.
 */
export function normalizePhone(input) {
  if (input == null) return null;

  let raw = String(input).trim();
  if (!raw) return null;

  // On retient le « + » seulement s'il est en tête, puis on ne garde que les
  // chiffres : espaces, points, tirets, parenthèses et « (0) » disparaissent.
  const hadPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // « 00 » international (courant en Afrique centrale et en Europe) = « + ».
  if (!hadPlus && digits.startsWith("00")) {
    digits = digits.slice(2);
    return finish(digits);
  }

  if (hadPlus) return finish(digits);

  // Sans « + » ni « 00 » : numéro déjà préfixé de son indicatif ?
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) &&
      digits.length === DEFAULT_COUNTRY_CODE.length + CM_NATIONAL_LENGTH) {
    return finish(digits);
  }

  // Zéro de tête à la française / à la canadienne : on le retire avant de
  // préfixer, sinon on obtient +2370690000000 (un chiffre de trop).
  if (digits.length === CM_NATIONAL_LENGTH + 1 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Numéro national camerounais (9 chiffres) → on préfixe l'indicatif.
  if (digits.length === CM_NATIONAL_LENGTH) {
    return finish(DEFAULT_COUNTRY_CODE + digits);
  }

  // Tout le reste (trop court, trop long, indicatif inconnu sans « + ») : on
  // refuse de deviner. La console affichera « à vérifier ».
  return null;
}

// E.164 : « + » puis 8 à 15 chiffres. On borne aussi par le bas pour écarter
// les saisies tronquées qui passeraient autrement pour valides.
function finish(digits) {
  if (digits.length < 8 || digits.length > 15) return null;
  return "+" + digits;
}

/**
 * Vrai si la valeur STOCKÉE est envoyable telle quelle.
 * Un champ vide n'est pas « invalide » — il est simplement absent : c'est
 * `isSendablePhone` qui répond « peut-on notifier ce parent ? », et
 * `isSuspectPhone` qui répond « faut-il afficher un avertissement ? ».
 */
export function isSendablePhone(stored) {
  return typeof stored === "string" && /^\+[1-9]\d{7,14}$/.test(stored);
}

/** Renseigné mais pas envoyable → à corriger. C'est ce que la console signale. */
export function isSuspectPhone(stored) {
  if (stored == null || String(stored).trim() === "") return false;
  return !isSendablePhone(stored);
}

/**
 * Affichage lisible : « +237 6 90 00 00 00 ».
 * Purement cosmétique — on n'enregistre JAMAIS la version espacée.
 */
export function formatPhone(stored) {
  if (!isSendablePhone(stored)) return stored || "";
  const digits = stored.slice(1);
  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    const national = digits.slice(DEFAULT_COUNTRY_CODE.length);
    if (national.length === CM_NATIONAL_LENGTH) {
      // 6 90 00 00 00 : premier chiffre isolé, puis paires.
      const pairs = national.slice(1).match(/.{1,2}/g) || [];
      return `+${DEFAULT_COUNTRY_CODE} ${national[0]} ${pairs.join(" ")}`;
    }
    return `+${DEFAULT_COUNTRY_CODE} ${national}`;
  }
  return stored;
}
