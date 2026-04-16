import express from 'express';
import {
  getGalleryRestaurantImages,
  getGalleryMenuImages,
  getGalleryReviewImages
} from '../controllers/gallery.controller.js';

const router = express.Router();

router.get('/restaurants', getGalleryRestaurantImages);
router.get('/menus', getGalleryMenuImages);
router.get('/reviews', getGalleryReviewImages);

export default router;
