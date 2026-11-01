import { useState } from 'react';
import { ui } from '../ui.js';

// Seul écran visible tant que la clé d'accès n'est pas valide
export default function AccesForm({ onValider, message }) {
  const [valeur, setValeur] = useState('');

  function soumettre(e) {
    e.preventDefault();
    const cle = valeur.trim();
    if (!cle) return;
    onValider(cle);
    setValeur('');
  }

  return (
    <main className={ui.contenu}>
      <section className={ui.carte}>
        <h2 className={ui.titre}>Accès du personnel</h2>
        <form onSubmit={soumettre}>
          <label htmlFor="cle" className={ui.label}>Clé d'accès</label>
          <input
            id="cle"
            type="password"
            autoComplete="off"
            className={ui.champ}
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
          />
          <button type="submit" className={ui.boutonPrincipal}>Valider</button>
        </form>
        {message && <p className={ui.erreur} role="alert">{message}</p>}
      </section>
    </main>
  );
}
