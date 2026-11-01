// Route HTTP du menu : renvoie les catégories et produits lus depuis l'API menu-board
import { Router } from 'express';
import { chargerMenu } from '../services/menu.service.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    res.json(await chargerMenu());
  } catch (erreur) {
    res.status(502).json({ erreur: erreur.message });
  }
});

export default router;
