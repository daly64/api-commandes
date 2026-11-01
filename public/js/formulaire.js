// Formulaire de prise de commande : table, lignes de produits, envoi
import { api } from './api.js';
import { echapper } from './utils.js';

const NOMBRE_TABLES = 10;

let menu = { categories: [], produits: [] };

const formulaire = document.getElementById('formulaire');
const selectTable = document.getElementById('table');
const conteneurLignes = document.getElementById('lignes');
const erreurEl = document.getElementById('erreur-formulaire');
const boutonEnvoyer = document.getElementById('envoyer');

// Options de produits regroupées par catégorie, uniquement les produits visibles
function optionsProduits() {
  return menu.categories
    .filter((cat) => cat.visible)
    .map((cat) => {
      const produits = menu.produits.filter((p) => p.categorieId === cat.id && p.visible);
      if (produits.length === 0) return '';
      const options = produits
        .map((p) => `<option value="${echapper(p.nom)}">${echapper(p.nom)}</option>`)
        .join('');
      return `<optgroup label="${echapper(cat.nom)}">${options}</optgroup>`;
    })
    .join('');
}

function listeProduitsVide() {
  return `<option value="">Choisir…</option>${optionsProduits()}`;
}

function ajouterLigne() {
  const ligne = document.createElement('div');
  ligne.className = 'ligne';
  ligne.innerHTML = `
    <select class="produit" aria-label="Produit">${listeProduitsVide()}</select>
    <input class="quantite" type="number" min="1" max="50" value="1" inputmode="numeric" aria-label="Quantité">
    <button type="button" class="retirer" aria-label="Retirer ce produit">✕</button>`;
  conteneurLignes.appendChild(ligne);
}

// Appelé quand le menu est chargé ou mis à jour : conserve les choix déjà faits
export function majMenu(nouveauMenu) {
  menu = nouveauMenu;
  conteneurLignes.querySelectorAll('.produit').forEach((select) => {
    const valeur = select.value;
    select.innerHTML = listeProduitsVide();
    select.value = valeur;
  });
  if (conteneurLignes.children.length === 0) {
    ajouterLigne();
  }
}

function remplirTables() {
  selectTable.innerHTML = Array.from(
    { length: NOMBRE_TABLES },
    (_, i) => `<option value="${i + 1}">Table ${i + 1}</option>`,
  ).join('');
}

function lignesSaisies() {
  return [...conteneurLignes.querySelectorAll('.ligne')].map((el) => ({
    produit: el.querySelector('.produit').value,
    quantite: Number(el.querySelector('.quantite').value),
  }));
}

export function initFormulaire(onEnvoye) {
  remplirTables();
  ajouterLigne();

  document.getElementById('ajouter-ligne').addEventListener('click', ajouterLigne);

  conteneurLignes.addEventListener('click', (e) => {
    const bouton = e.target.closest('.retirer');
    if (!bouton || conteneurLignes.children.length === 1) return;
    bouton.closest('.ligne').remove();
  });

  formulaire.addEventListener('submit', async (e) => {
    e.preventDefault();
    erreurEl.textContent = '';

    const lignes = lignesSaisies();
    if (lignes.some((l) => !l.produit)) {
      erreurEl.textContent = 'Choisissez un produit pour chaque ligne.';
      return;
    }

    boutonEnvoyer.disabled = true;
    try {
      await api.creerCommande({ table: Number(selectTable.value), lignes });
      conteneurLignes.innerHTML = '';
      ajouterLigne();
      onEnvoye();
    } catch (erreur) {
      erreurEl.textContent = erreur.message;
    } finally {
      boutonEnvoyer.disabled = false;
    }
  });
}
