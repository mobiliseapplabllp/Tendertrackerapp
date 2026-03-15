import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import db from '../config/database';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users (Admin/Manager only)
router.get(
  '/',
  authorize('Admin', 'Manager'),
  UserController.getAll
);

// Get current user profile
router.get(
  '/me',
  async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const [users] = await db.query(
        `SELECT id, email, full_name, role, department, phone, status, last_login, created_at, updated_at
         FROM users WHERE id = ?`,
        [req.user.userId]
      );

      const userArray = users as any[];
      if (userArray.length === 0) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const user = userArray[0];
      // Transform snake_case to camelCase
      const transformedUser = {
        id: user.id,
        email: user.email,
        fullName: user.full_name || '',
        role: user.role,
        department: user.department,
        phone: user.phone,
        status: user.status,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };

      res.json({
        success: true,
        data: transformedUser,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

// Get user by ID
router.get(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  UserController.getById
);

// Create user (Admin only)
router.post(
  '/',
  authorize('Admin'),
  validate({
    body: Joi.object({
      email: schemas.email,
      password: schemas.password,
      fullName: Joi.string().min(1).max(100).required(),
      role: Joi.string().valid('Admin', 'Manager', 'User', 'Viewer').default('User'),
      department: Joi.string().max(100).allow(null, ''),
      phone: Joi.string().max(20).allow(null, ''),
      productLineIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    }),
  }),
  UserController.create
);

// Update user (Admin only)
router.put(
  '/:id',
  authorize('Admin'),
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      email: schemas.email.optional(),
      password: Joi.string().min(8).optional(),
      fullName: Joi.string().min(1).max(100).optional(),
      role: Joi.string().valid('Admin', 'Manager', 'User', 'Viewer').optional(),
      department: Joi.string().max(100).allow(null, '').optional(),
      phone: Joi.string().max(20).allow(null, '').optional(),
      status: Joi.string().valid('Active', 'Inactive', 'Suspended').optional(),
      productLineIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    }),
  }),
  UserController.update
);

// Delete user (Admin only)
router.delete(
  '/:id',
  authorize('Admin'),
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  UserController.delete
);

export default router;

