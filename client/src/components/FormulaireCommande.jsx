import { useState } from 'react';
import { api } from '../api.js';
import { NOMBRE_TABLES } from '../constants.js';
import { ui } from '../ui.js';

// Identifiant local stable pour chaque ligne (sans dépendre de crypto.randomUUID)
let compteur = 0;
const ligneVide = () => ({ id: ++compteur, produit: '', quantite: '1' });

export default function FormulaireCommande({ menu, onEnvoye }) {
  const [table, setTable] = useState(1);
  const [lignes, setLignes] = useState([ligneVide()]);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  // Seules les catégories et produits visibles sont proposés
  const categories = (menu?.categories ?? []).filter((c) => c.visible);
  const produitsDe = (categorieId) =>
    (menu?.produits ?? []).filter((p) => p.categorieId === categorieId && p.visible);

  function modifier(id, champs) {
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, ...champs } : l)));
  }

  function retirer(id) {
    setLignes((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls));
  }

  async function envoyer(e) {
    e.preventDefault();
    setErreur('');

    if (lignes.some((l) => !l.produit)) {
      setErreur('Choisissez un produit pour chaque ligne.');
      return;
    }

    setEnvoi(true);
    try {
      await api.creerCommande({
        table: Number(table),
        lignes: lignes.map((l) => ({ produit: l.produit, quantite: Number(l.quantite) })),
      });
      setLignes([ligneVide()]);
      onEnvoye();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={envoyer} noValidate>
      <label htmlFor="table" className={ui.label}>Table</label>
      <select
        id="table"
        className={`${ui.champ} mb-2.5`}
        value={table}
        onChange={(e) => setTable(Number(e.target.value))}
      >
        {Array.from({ length: NOMBRE_TABLES }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>Table {n}</option>
        ))}
      </select>

      <span className={ui.label}>Produits</span>
      {lignes.map((l) => (
        <div className={ui.ligne} key={l.id}>
          <select
            aria-label="Produit"
            className={ui.champ}
            value={l.produit}
            onChange={(e) => modifier(l.id, { produit: e.target.value })}
          >
            <option value="">Choisir…</option>
            {categories.map((cat) => {
              const produits = produitsDe(cat.id);
              if (produits.length === 0) return null;
              return (
                <optgroup key={cat.id} label={cat.nom}>
                  {produits.map((p) => (
                    <option key={p.id} value={p.nom}>{p.nom}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          <input
            type="number"
            min="1"
            max="50"
            inputMode="numeric"
            aria-label="Quantité"
            className={ui.champ}
            value={l.quantite}
            onChange={(e) => modifier(l.id, { quantite: e.target.value })}
          />

          <button
            type="button"
            aria-label="Retirer ce produit"
            className={ui.boutonRetirer}
            onClick={() => retirer(l.id)}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        className={ui.boutonSecondaire}
        onClick={() => setLignes((ls) => [...ls, ligneVide()])}
      >
        + Ajouter un produit
      </button>

      <p className={ui.erreur} role="alert">{erreur}</p>
      <button type="submit" className={ui.boutonPrincipal} disabled={envoi}>
        Envoyer en cuisine
      </button>
    </form>
  );
}
