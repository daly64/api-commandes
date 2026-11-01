import { useState } from 'react';

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
    <main>
      <section className="carte">
        <h2>Accès du personnel</h2>
        <form onSubmit={soumettre}>
          <label htmlFor="cle">Clé d'accès</label>
          <input
            id="cle"
            type="password"
            autoComplete="off"
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
          />
          <button type="submit" className="principal">Valider</button>
        </form>
        {message && <p className="erreur" role="alert">{message}</p>}
      </section>
    </main>
  );
}
