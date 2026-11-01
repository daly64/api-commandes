import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ErreurAcces, cleEnregistree, effacerCle, enregistrerCle } from './api.js';
import { INTERVALLE_MS } from './constants.js';
import AccesForm from './components/AccesForm.jsx';
import FormulaireCommande from './components/FormulaireCommande.jsx';
import ListeCommandes from './components/ListeCommandes.jsx';

export default function App() {
  const [cleValide, setCleValide] = useState(cleEnregistree());
  const [menu, setMenu] = useState(null);
  const [commandes, setCommandes] = useState([]);
  const [etat, setEtat] = useState('');
  const [messageAcces, setMessageAcces] = useState('');

  // Numéro de la dernière lecture lancée : une réponse plus ancienne est ignorée
  const dernierAppel = useRef(0);
  const menuCharge = useRef(false);

  const rafraichir = useCallback(async () => {
    if (!cleEnregistree()) {
      setCleValide(false);
      return;
    }

    const appel = ++dernierAppel.current;

    // Le menu est relu à chaque cycle tant qu'il n'a pas réussi une fois
    if (!menuCharge.current) {
      try {
        setMenu(await api.menu());
        menuCharge.current = true;
      } catch {
        setEtat('Menu indisponible');
      }
    }

    try {
      const donnees = await api.commandes();
      if (appel !== dernierAppel.current) return;
      setCommandes(donnees);
      setEtat(menuCharge.current ? '' : 'Menu indisponible');
    } catch (erreur) {
      if (erreur instanceof ErreurAcces) {
        effacerCle();
        setCleValide(false);
        setCommandes([]);
        setMessageAcces('Clé refusée');
      } else {
        setEtat('Connexion perdue, nouvelle tentative…');
      }
    }
  }, []);

  // Interrogation régulière tant que la clé est valide
  useEffect(() => {
    if (!cleValide) return undefined;

    rafraichir();
    const minuteur = setInterval(rafraichir, INTERVALLE_MS);

    // En arrière-plan, le navigateur suspend les minuteurs : on recharge au retour sur la page
    const auRetour = () => {
      if (document.visibilityState === 'visible') rafraichir();
    };
    document.addEventListener('visibilitychange', auRetour);

    return () => {
      clearInterval(minuteur);
      document.removeEventListener('visibilitychange', auRetour);
    };
  }, [cleValide, rafraichir]);

  function validerCle(cle) {
    enregistrerCle(cle);
    setMessageAcces('');
    setCleValide(true);
  }

  async function changerStatut(id, statut) {
    try {
      await api.changerStatut(id, statut);
    } catch (erreur) {
      setEtat(erreur.message);
    }
    rafraichir();
  }

  return (
    <>
      <header className="entete">
        <h1>Prise de commande</h1>
        <span className="etat" role="status">{cleValide ? etat : ''}</span>
      </header>

      {!cleValide ? (
        <AccesForm onValider={validerCle} message={messageAcces} />
      ) : (
        <main>
          <section className="carte">
            <h2>Nouvelle commande</h2>
            <FormulaireCommande menu={menu} onEnvoye={rafraichir} />
          </section>

          <section className="carte">
            <h2>Commandes en cours</h2>
            <ListeCommandes commandes={commandes} onChangerStatut={changerStatut} />
          </section>
        </main>
      )}
    </>
  );
}
