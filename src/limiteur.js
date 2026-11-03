// Limite de débit simple, en mémoire : au plus « maximum » requêtes par fenêtre et par adresse
export function creerLimiteur(maximum, fenetreMs) {
  const compteurs = new Map();
  // Remise à zéro à chaque fenêtre ; unref() n'empêche pas le processus de s'arrêter
  setInterval(() => compteurs.clear(), fenetreMs).unref();

  return function depasse(adresse) {
    const total = (compteurs.get(adresse) ?? 0) + 1;
    compteurs.set(adresse, total);
    return total > maximum;
  };
}
