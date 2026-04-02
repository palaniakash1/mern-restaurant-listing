import { Router } from 'express';
import { createUploadSignature } from '../controllers/media.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validate } from '../middlewares/validate.js';
import { mediaValidators } from '../validators/index.js';

const router = Router();

router.post(
  '/signature',
  verifyToken,
  validate(mediaValidators.signatureBody),
  createUploadSignature
);

export default router;
