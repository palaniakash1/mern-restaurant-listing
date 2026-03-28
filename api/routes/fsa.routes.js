import express from 'express';

import {
  searchFSA,
  getRating,
  linkRestaurant,
  unlinkRestaurant,
  refreshRestaurantRating,
  getRestaurantRating,
  autoLinkRestaurant
} from '../controllers/fsa.controller.js';

import { verifyToken } from '../utils/verifyUser.js';

const router = express.Router();

router.get('/search', searchFSA);

router.get('/rating/:fhrsId', getRating);

router.get('/restaurant/:restaurantId', verifyToken, getRestaurantRating);

router.post('/restaurant/:restaurantId/link', verifyToken, linkRestaurant);

router.post('/restaurant/:restaurantId/auto-link', verifyToken, autoLinkRestaurant);

router.delete('/restaurant/:restaurantId/link', verifyToken, unlinkRestaurant);

router.post('/restaurant/:restaurantId/refresh', verifyToken, refreshRestaurantRating);

export default router;
