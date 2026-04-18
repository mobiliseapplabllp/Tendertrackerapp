import { Router } from 'express';
import { SocialMediaController } from '../controllers/socialMediaController';
import { SocialOAuthController } from '../controllers/socialOAuthController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Apply authentication to all social media routes
router.use(authenticate);

// OAuth config (authenticated)
router.get('/oauth/config', SocialOAuthController.getOAuthConfig);

// ==================== AI ====================
router.post(
  '/ai-generate',
  validate({
    body: Joi.object({
      platform: Joi.string().min(1).max(50).required(),
      topic: Joi.string().min(1).max(500).required(),
      tone: Joi.string().max(50).allow(null, ''),
      includeHashtags: Joi.boolean().optional(),
    }).options({ allowUnknown: true }),
  }),
  SocialMediaController.aiGeneratePost
);

// ==================== Accounts ====================
router.get('/accounts', SocialMediaController.getAccounts);

router.post(
  '/accounts',
  validate({
    body: Joi.object({
      platform: Joi.string().valid('linkedin', 'twitter', 'instagram', 'facebook', 'youtube', 'tiktok', 'other').required(),
      account_name: Joi.string().min(1).max(255).required(),
      account_id: Joi.string().max(255).allow(null, ''),
      page_id: Joi.string().max(255).allow(null, ''),
      profile_url: Joi.string().uri().max(500).allow(null, ''),
      access_token: Joi.string().max(2000).allow(null, ''),
      refresh_token: Joi.string().max(2000).allow(null, ''),
    }).options({ allowUnknown: true }),
  }),
  SocialMediaController.connectAccount
);

router.put(
  '/accounts/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      account_name: Joi.string().min(1).max(255),
      account_id: Joi.string().max(255).allow(null, ''),
      page_id: Joi.string().max(255).allow(null, ''),
      profile_url: Joi.string().uri().max(500).allow(null, ''),
      access_token: Joi.string().max(2000).allow(null, ''),
      refresh_token: Joi.string().max(2000).allow(null, ''),
    }).options({ allowUnknown: true }),
  }),
  SocialMediaController.updateAccount
);

router.delete(
  '/accounts/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  SocialMediaController.disconnectAccount
);

// ==================== Posts ====================
router.get('/posts/scheduled', SocialMediaController.getScheduledPosts);
router.get('/posts/published', SocialMediaController.getPublishedPosts);

export default router;
