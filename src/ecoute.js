// Écoute du canal PostgreSQL et relais vers les abonnés de cette instance.
// La connexion d'écoute n'est ouverte que tant qu'il y a des abonnés, pour laisser la base se mettre en veille.
import pg from 'pg';
import { DATABASE_URL_DIRECT, DATABASE_SSL } from './config.js';
import { CANAL } from './notification.js';
import { lireCommande } from './services/commandes.service.js';
import { pubsub, EVENEMENT_COMMANDE } from './pubsub.js';

const DELAI_ARRET_MS = 30_000;     // fermeture de l'écoute 30 s après le départ du dernier abonné
const DELAI_RECONNEXION_MS = 2_000;

let client = null;        // connexion d'écoute active
let demarrage = null;     // connexion en cours d'ouverture
let abonnes = 0;
let minuteurArret = null;

async function relayer(message) {
  try {
    const commande = await lireCommande(Number(message.payload));
    if (commande) pubsub.publish(EVENEMENT_COMMANDE, commande);
  } catch (erreur) {
    console.error('[écoute] lecture de la commande impossible :', erreur.message);
  }
}

function connexionPerdue(erreur) {
  if (erreur) console.error('[écoute] connexion perdue :', erreur.message);
  client = null;
  demarrage = null;
  // Reconnexion automatique tant que des abonnés attendent des événements
  if (abonnes > 0) {
    setTimeout(() => assurerEcoute().catch(() => {}), DELAI_RECONNEXION_MS);
  }
}

async function connecter() {
  const nouveau = new pg.Client({
    connectionString: DATABASE_URL_DIRECT,
    ssl: DATABASE_SSL ? { rejectUnauthorized: true } : false,
  });
  nouveau.on('notification', relayer);
  nouveau.on('error', connexionPerdue);
  nouveau.on('end', () => {
    if (client === nouveau) connexionPerdue();
  });
  await nouveau.connect();
  await nouveau.query(`LISTEN ${CANAL}`);
  client = nouveau;
}

function assurerEcoute() {
  if (client) return Promise.resolve();
  demarrage ??= connecter().catch((erreur) => {
    demarrage = null;
    throw erreur;
  });
  return demarrage;
}

async function arreter() {
  if (abonnes > 0 || !client) return;
  const ancien = client;
  client = null;
  demarrage = null;
  await ancien.end().catch(() => {});
}

// Enregistre un abonné et garantit que l'écoute est active. Renvoie la fonction à appeler à son départ.
export async function abonner() {
  abonnes += 1;
  clearTimeout(minuteurArret);
  try {
    await assurerEcoute();
  } catch (erreur) {
    abonnes -= 1;
    throw erreur;
  }

  let parti = false;
  return function liberer() {
    if (parti) return;
    parti = true;
    abonnes -= 1;
    if (abonnes === 0) {
      minuteurArret = setTimeout(arreter, DELAI_ARRET_MS);
      minuteurArret.unref?.();
    }
  };
}

// Enveloppe un flux d'événements pour libérer l'abonné quand le client se déconnecte
export function avecLiberation(iterateur, liberer) {
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      return iterateur.next();
    },
    return(valeur) {
      liberer();
      return iterateur.return ? iterateur.return(valeur) : Promise.resolve({ done: true, value: valeur });
    },
    throw(erreur) {
      liberer();
      return iterateur.throw ? iterateur.throw(erreur) : Promise.reject(erreur);
    },
  };
}
