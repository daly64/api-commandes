// Lecture du menu depuis l'API menu-board, avec un cache d'une minute
import { MENU_URL } from '../config.js';

const DUREE_CACHE_MS = 60_000;
let cache = null;
let dateCache = 0;

// L'API menu-board renvoie un tableau de catégories, chacune avec ses produits :
// [{ id, name, orderIndex, isVisible, products: [{ id, name, price, isVisible, categoryId, ... }] }]
// On le transforme en deux listes à plat.
function normaliser(categoriesBrutes) {
  const categories = categoriesBrutes.map((c) => ({
    id: String(c.id),
    nom: c.name,
    visible: c.isVisible !== false,
  }));

  const produits = categoriesBrutes.flatMap((c) =>
    (c.products ?? []).map((p) => ({
      id: String(p.id),
      nom: p.name,
      prix: Number(p.price ?? 0),
      categorieId: String(p.categoryId ?? c.id),
      visible: p.isVisible !== false,
    })),
  );

  return { categories, produits };
}

export async function chargerMenu() {
  if (cache && Date.now() - dateCache < DUREE_CACHE_MS) {
    return cache;
  }
  const reponse = await fetch(MENU_URL);
  if (!reponse.ok) {
    throw new Error(`Menu indisponible (statut ${reponse.status})`);
  }
  cache = normaliser(await reponse.json());
  dateCache = Date.now();
  return cache;
}
