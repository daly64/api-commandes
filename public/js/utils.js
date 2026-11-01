// Échappe un texte avant de l'insérer dans du HTML (contenu ou valeur d'attribut)
export function echapper(texte) {
  return String(texte).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
