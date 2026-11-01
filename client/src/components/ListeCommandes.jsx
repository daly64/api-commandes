import { useState } from 'react';
import { ACTION, LIBELLES, SUIVANT } from '../constants.js';

export default function ListeCommandes({ commandes, onChangerStatut }) {
  // Commande dont le statut est en cours de modification (bouton désactivé)
  const [enCours, setEnCours] = useState(null);

  if (commandes.length === 0) {
    return <p>Aucune commande en cours.</p>;
  }

  async function avancer(commande) {
    setEnCours(commande.id);
    await onChangerStatut(commande.id, SUIVANT[commande.statut]);
    setEnCours(null);
  }

  return (
    <div>
      {commandes.map((c) => (
        <article className="commande" key={c.id}>
          <header>
            <strong>Table {c.table}</strong>{' '}
            <span className="statut">· {LIBELLES[c.statut]}</span>
          </header>
          <p>
            {c.lignes.map((l, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {l.quantite} × {l.produit}
              </span>
            ))}
          </p>
          {SUIVANT[c.statut] && (
            <button
              className="principal"
              disabled={enCours === c.id}
              onClick={() => avancer(c)}
            >
              {ACTION[c.statut]}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
