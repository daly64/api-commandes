// Constantes de l'interface : tables, libellés et étapes de préparation
export const NOMBRE_TABLES = 10;

export const LIBELLES = {
  en_attente: 'En attente',
  en_preparation: 'En préparation',
  prete: 'Prête',
  servie: 'Servie',
  payee: 'Payée',
};

// Étape suivante de chaque statut, et libellé du bouton correspondant
export const SUIVANT = {
  en_attente: 'en_preparation',
  en_preparation: 'prete',
  prete: 'servie',
  servie: 'payee',
};

export const ACTION = {
  en_attente: 'Démarrer',
  en_preparation: 'Marquer prête',
  prete: 'Marquer servie',
  servie: 'Marquer payée',
};

export const INTERVALLE_MS = 3000;
