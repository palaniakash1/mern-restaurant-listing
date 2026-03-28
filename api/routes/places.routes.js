import { Router } from 'express';
import {
  autocomplete,
  getDetails,
  search
} from '../controllers/places.controller.js';

const router = Router();

router.get('/autocomplete', autocomplete);
router.get('/search', search);
router.get('/details/:placeId', getDetails);

export default router;
