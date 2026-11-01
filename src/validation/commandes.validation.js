// Règles de validation des données reçues : aucune requête invalide n'arrive au service
import { NOMBRE_TABLES, STATUTS } from '../config.js';

// Bornes qui protègent la base et évitent les commandes absurdes
export const LIMITES = {
  lignesMax: 20,
  quantiteMax: 50,
  produitMax: 100,
};

export function validerCommande(corps) {
  const erreurs = [];

  if (!Number.isInteger(corps.table) || corps.table < 1 || corps.table > NOMBRE_TABLES) {
    erreurs.push(`table doit être un entier entre 1 et ${NOMBRE_TABLES}`);
  }

  if (!Array.isArray(corps.lignes) || corps.lignes.length === 0) {
    erreurs.push('lignes doit contenir au moins un produit');
  } else if (corps.lignes.length > LIMITES.lignesMax) {
    erreurs.push(`une commande ne peut pas dépasser ${LIMITES.lignesMax} lignes`);
  } else {
    for (const ligne of corps.lignes) {
      if (typeof ligne?.produit !== 'string' || ligne.produit.trim() === '') {
        erreurs.push('chaque ligne doit avoir un produit');
      } else if (ligne.produit.trim().length > LIMITES.produitMax) {
        erreurs.push(`le nom d'un produit ne peut pas dépasser ${LIMITES.produitMax} caractères`);
      }
      if (!Number.isInteger(ligne?.quantite) || ligne.quantite < 1 || ligne.quantite > LIMITES.quantiteMax) {
        erreurs.push(`chaque quantité doit être un entier entre 1 et ${LIMITES.quantiteMax}`);
      }
    }
  }

  return erreurs;
}

export function statutValide(statut) {
  return STATUTS.includes(statut);
}
