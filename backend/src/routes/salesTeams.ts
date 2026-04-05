import { Router } from 'express';
import { getTeamStructure, getTeamByProductLine, assignHead, addMember, removeMember, transferMember, getHistory } from '../controllers/salesTeamController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

// Get full team structure
router.get('/', getTeamStructure);

// Get team by product line
router.get(
  '/product-line/:productLineId',
  validate({ params: Joi.object({ productLineId: schemas.id }) }),
  getTeamByProductLine
);

// Get team history
router.get('/history', getHistory);

// Assign sales head to product line
router.post(
  '/assign-head',
  validate({
    body: Joi.object({
      userId: Joi.number().integer().positive().required(),
      productLineId: Joi.number().integer().positive().required(),
    }),
  }),
  assignHead
);

// Add team member
router.post(
  '/add-member',
  validate({
    body: Joi.object({
      teamMemberId: Joi.number().integer().positive().required(),
      salesHeadId: Joi.number().integer().positive().required(),
      productLineId: Joi.number().integer().positive().required(),
    }),
  }),
  addMember
);

// Remove team member
router.post(
  '/remove-member',
  validate({
    body: Joi.object({
      teamMemberId: Joi.number().integer().positive().required(),
      productLineId: Joi.number().integer().positive().required(),
    }),
  }),
  removeMember
);

// Transfer team member
router.post(
  '/transfer-member',
  validate({
    body: Joi.object({
      teamMemberId: Joi.number().integer().positive().required(),
      fromProductLineId: Joi.number().integer().positive().required(),
      toProductLineId: Joi.number().integer().positive().required(),
      toSalesHeadId: Joi.number().integer().positive().required(),
    }),
  }),
  transferMember
);

export default router;
