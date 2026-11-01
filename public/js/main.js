// Point d'entrée de l'interface : charge le menu, affiche les commandes, rafraîchit
import { api } from './api.js';
import { afficherCommandes } from './commandes.js';
import { initFormulaire, majMenu } from './formulaire.js';

const INTERVALLE_MS = 3000;

const liste = document.getElementById('liste');
const etat = document.getElementById('etat');

let menuCharge = false;
let derniereListe = ''; // contenu de la dernière liste affichée
let dernierAppel = 0;   // numéro de la dernière lecture lancée

async function rafraichir() {
  const appel = ++dernierAppel;

  // Le menu est rechargé à chaque cycle tant qu'il n'a pas réussi une fois
  if (!menuCharge) {
    try {
      majMenu(await api.menu());
      menuCharge = true;
    } catch {
      etat.textContent = 'Menu indisponible';
    }
  }

  try {
    const commandes = await api.commandes();

    // Une réponse plus ancienne qu'une lecture plus récente est ignorée
    if (appel !== dernierAppel) return;

    // La liste n'est reconstruite que si elle a changé : les boutons restent cliquables
    const signature = JSON.stringify(commandes);
    if (signature !== derniereListe) {
      afficherCommandes(liste, commandes);
      derniereListe = signature;
    }

    if (menuCharge) etat.textContent = '';
  } catch {
    etat.textContent = 'Connexion perdue, nouvelle tentative…';
  }
}

// Changement de statut : délégation d'événement sur la liste
liste.addEventListener('click', async (e) => {
  const bouton = e.target.closest('button[data-id]');
  if (!bouton) return;
  bouton.disabled = true;
  try {
    await api.changerStatut(bouton.dataset.id, bouton.dataset.statut);
  } catch (erreur) {
    etat.textContent = erreur.message;
  }
  // Force une lecture fraîche après une modification
  derniereListe = '';
  rafraichir();
});

initFormulaire(rafraichir);
rafraichir();
setInterval(rafraichir, INTERVALLE_MS);

// En arrière-plan, le navigateur suspend les minuteurs : on recharge au retour sur la page
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') rafraichir();
});
