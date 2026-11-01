// Routes HTTP des commandes : lecture de la requête, validation, puis appel du service
import { Router } from 'express';
import { listerActives, creer, changerStatut, annuler } from '../services/commandes.service.js';
import { validerCommande, statutValide } from '../validation/commandes.validation.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await listerActives());
  } catch (erreur) {
    next(erreur);
  }
});

router.post('/', async (req, res, next) => {
  const erreurs = validerCommande(req.body ?? {});
  if (erreurs.length > 0) {
    return res.status(400).json({ erreurs });
  }
  try {
    res.status(201).json(await creer(req.body));
  } catch (erreur) {
    next(erreur);
  }
});

router.patch('/:id/statut', async (req, res, next) => {
  const statut = req.body?.statut;
  if (!statutValide(statut)) {
    return res.status(400).json({ erreur: 'Statut invalide' });
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ erreur: 'Commande introuvable' });
  }
  try {
    const resultat = await changerStatut(id, statut);
    if (resultat.erreur === 'introuvable') {
      return res.status(404).json({ erreur: 'Commande introuvable' });
    }
    if (resultat.erreur) {
      return res.status(409).json({ erreur: 'Commande annulée : modification impossible' });
    }
    res.json(resultat.commande);
  } catch (erreur) {
    next(erreur);
  }
});

router.post('/:id/annuler', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ erreur: 'Commande introuvable' });
  }
  try {
    const resultat = await annuler(id);
    if (resultat.erreur === 'introuvable') {
      return res.status(404).json({ erreur: 'Commande introuvable' });
    }
    if (resultat.erreur) {
      return res
        .status(409)
        .json({ erreur: 'Annulation impossible : la commande est déjà prête, servie ou annulée' });
    }
    res.json(resultat.commande);
  } catch (erreur) {
    next(erreur);
  }
});

export default router;
