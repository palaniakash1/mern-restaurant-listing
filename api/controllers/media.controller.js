import crypto from 'crypto';
import config from '../config.js';
import { errorHandler } from '../utils/error.js';

const allowedRestaurantFolderPrefix = config.cloudinary.uploadFolder;
const allowedProfileFolderPrefix = 'users/profiles';
const allowedReviewsFolderPrefix = 'reviews';

const buildSignature = (paramsToSign) =>
  crypto
    .createHash('sha1')
    .update(`${paramsToSign}${config.cloudinary.apiSecret}`)
    .digest('hex');

export const createUploadSignature = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw errorHandler(401, 'Authentication required');
    }

    if (
      !config.cloudinary.cloudName ||
      !config.cloudinary.apiKey ||
      !config.cloudinary.apiSecret
    ) {
      throw errorHandler(503, 'Cloudinary is not configured');
    }

    const { folder, publicId } = req.body;

    const isRestaurantFolder = folder.startsWith(allowedRestaurantFolderPrefix);
    const isProfileFolder = folder.startsWith(allowedProfileFolderPrefix);
    const isReviewsFolder = folder.startsWith(allowedReviewsFolderPrefix);

    if (!isRestaurantFolder && !isProfileFolder && !isReviewsFolder) {
      throw errorHandler(400, 'Invalid upload folder');
    }

    if (isRestaurantFolder && !['admin', 'superAdmin'].includes(req.user?.role)) {
      throw errorHandler(403, 'You are not allowed to upload restaurant media');
    }

    if (isReviewsFolder && !['user', 'admin', 'superAdmin', 'storeManager'].includes(req.user?.role)) {
      throw errorHandler(403, 'You are not allowed to upload review media');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const params = [`folder=${folder}`];

    if (publicId) {
      params.push(`public_id=${publicId}`);
    }

    params.push(`timestamp=${timestamp}`);

    const signature = buildSignature(params.join('&'));

    res.status(200).json({
      success: true,
      data: {
        cloudName: config.cloudinary.cloudName,
        apiKey: config.cloudinary.apiKey,
        timestamp,
        signature,
        folder,
        publicId: publicId || null
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createUploadSignature
};
