import express from 'express';
import {
  addFavourite,
  deleteUser,
  getFavourites,
  getSellerStats,
  getUser,
  removeFavourite,
} from '../controllers/user.controller.js';
import { verifyToken } from '../middleware/jwt.js';

const router = express.Router();

// "me" routes come first so they are not read as a user id.
router.get('/me/favourites', verifyToken, getFavourites);
router.put('/me/favourites/:itemId', verifyToken, addFavourite);
router.delete('/me/favourites/:itemId', verifyToken, removeFavourite);

router.delete('/:id', verifyToken, deleteUser);
router.get('/:id/stats', getSellerStats);
router.get('/:id', getUser);

export default router;
