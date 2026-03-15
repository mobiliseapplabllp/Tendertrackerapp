import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { emailService } from '../services/emailService';
import { validatePassword } from '../utils/settings';

export class UserController {
  /**
   * Get all users (with pagination and filters)
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const status = req.query.status as string;

      const offset = (page - 1) * pageSize;
      let whereClause = '1=1';
      const params: any[] = [];

      if (search) {
        whereClause += ' AND (email LIKE ? OR full_name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (role) {
        whereClause += ' AND role = ?';
        params.push(role);
      }

      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }

      // Get total count
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // Get users
      const [users] = await db.query(
        `SELECT id, email, full_name, role, department, phone, status, last_login, created_at, updated_at
         FROM users WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      // Transform snake_case to camelCase and fetch product lines
      const usersArray = users as any[];
      const transformedUsers = [];
      for (const user of usersArray) {
        // Fetch assigned product lines for each user
        let productLines: any[] = [];
        try {
          const [plRows] = await db.query(
            `SELECT pl.id, pl.name, pl.description
             FROM product_lines pl
             INNER JOIN user_product_lines upl ON upl.product_line_id = pl.id
             WHERE upl.user_id = ?
             ORDER BY pl.display_order ASC`,
            [user.id]
          );
          productLines = (plRows as any[]).map((pl: any) => ({
            id: pl.id,
            name: pl.name,
            description: pl.description,
          }));
        } catch (plErr) {
          // Table might not exist yet (pre-migration)
        }

        transformedUsers.push({
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
          productLines,
        });
      }

      res.json({
        success: true,
        data: {
          data: transformedUsers,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get user by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [users] = await db.query(
        `SELECT id, email, full_name, role, department, phone, status, last_login, created_at, updated_at
         FROM users WHERE id = ?`,
        [id]
      );

      const userArray = users as any[];
      if (userArray.length === 0) {
        throw new CustomError('User not found', 404);
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

  /**
   * Create user
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fullName, role, department, phone } = req.body;

      if (!email || !password || !fullName) {
        throw new CustomError('Email, password, and full name are required', 400);
      }

      // Check if user already exists
      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if ((existing as any[]).length > 0) {
        throw new CustomError('User with this email already exists', 409);
      }

      // Validate password against requirements
      const passwordValidation = await validatePassword(password);
      if (!passwordValidation.valid) {
        throw new CustomError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(
        password,
        parseInt(process.env.BCRYPT_ROUNDS || '10')
      );

      // Insert user
      const [result] = await db.query(
        `INSERT INTO users (email, password_hash, full_name, role, department, phone, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          email.toLowerCase(),
          passwordHash,
          fullName,
          role || 'User',
          department || null,
          phone || null,
          req.user?.userId || null,
        ]
      );

      const insertResult = result as any;
      const userId = insertResult.insertId;

      // Assign product lines if provided
      const { productLineIds } = req.body;
      if (productLineIds && Array.isArray(productLineIds) && productLineIds.length > 0) {
        try {
          for (const plId of productLineIds) {
            await db.query(
              'INSERT INTO user_product_lines (user_id, product_line_id) VALUES (?, ?)',
              [userId, plId]
            );
          }
        } catch (plError: any) {
          logger.warn({ message: 'Could not assign product lines (table may not exist yet)', error: plError.message });
        }
      }

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user?.userId || null,
          'CREATE_USER',
          'User',
          userId,
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({ email, fullName, role }),
        ]
      );

      logger.info({
        message: 'User created',
        userId,
        createdBy: req.user?.userId,
      });

      // Get created user
      const [users] = await db.query(
        `SELECT id, email, full_name, role, department, phone, status, created_at
         FROM users WHERE id = ?`,
        [userId]
      );

      const user = (users as any[])[0];
      // Transform snake_case to camelCase
      const transformedUser = {
        id: user.id,
        email: user.email,
        fullName: user.full_name || '',
        role: user.role,
        department: user.department,
        phone: user.phone,
        status: user.status,
        createdAt: user.created_at,
      };

      res.status(201).json({
        success: true,
        data: transformedUser,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update user
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { email, password, fullName, role, department, phone, status } = req.body;

      // Get existing user
      const [existing] = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('User not found', 404);
      }

      const oldUser = existingArray[0];
      const changes: any = {};

      // Build update query
      const updates: string[] = [];
      const params: any[] = [];

      if (email && email !== oldUser.email) {
        // Check if new email already exists
        const [emailCheck] = await db.query(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email.toLowerCase(), id]
        );
        if ((emailCheck as any[]).length > 0) {
          throw new CustomError('Email already in use', 409);
        }
        updates.push('email = ?');
        params.push(email.toLowerCase());
        changes.email = { old: oldUser.email, new: email };
      }

      if (password) {
        // Validate password against requirements
        const passwordValidation = await validatePassword(password);
        if (!passwordValidation.valid) {
          throw new CustomError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400);
        }
        
        const passwordHash = await bcrypt.hash(
          password,
          parseInt(process.env.BCRYPT_ROUNDS || '10')
        );
        updates.push('password_hash = ?');
        params.push(passwordHash);
        changes.password = 'updated';
      }

      if (fullName && fullName !== oldUser.full_name) {
        updates.push('full_name = ?');
        params.push(fullName);
        changes.fullName = { old: oldUser.full_name, new: fullName };
      }

      if (role && role !== oldUser.role) {
        updates.push('role = ?');
        params.push(role);
        changes.role = { old: oldUser.role, new: role };
      }

      if (department !== undefined && department !== oldUser.department) {
        updates.push('department = ?');
        params.push(department || null);
        changes.department = { old: oldUser.department, new: department };
      }

      if (phone !== undefined && phone !== oldUser.phone) {
        updates.push('phone = ?');
        params.push(phone || null);
        changes.phone = { old: oldUser.phone, new: phone };
      }

      if (status && status !== oldUser.status) {
        updates.push('status = ?');
        params.push(status);
        changes.status = { old: oldUser.status, new: status };
      }

      // Check if productLineIds are being updated
      const { productLineIds } = req.body;
      const hasProductLineUpdate = productLineIds !== undefined && Array.isArray(productLineIds);

      if (updates.length === 0 && !hasProductLineUpdate) {
        throw new CustomError('No fields to update', 400);
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        params.push(id);

        await db.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }

      // Sync product line assignments if provided
      if (hasProductLineUpdate) {
        try {
          // Delete existing assignments
          await db.query('DELETE FROM user_product_lines WHERE user_id = ?', [id]);
          // Insert new assignments
          for (const plId of productLineIds) {
            await db.query(
              'INSERT INTO user_product_lines (user_id, product_line_id) VALUES (?, ?)',
              [id, plId]
            );
          }
          changes.productLines = 'updated';
        } catch (plError: any) {
          logger.warn({ message: 'Could not update product lines (table may not exist yet)', error: plError.message });
        }
      }

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user?.userId || null,
          'UPDATE_USER',
          'User',
          parseInt(id),
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify(changes),
        ]
      );

      logger.info({
        message: 'User updated',
        userId: id,
        updatedBy: req.user?.userId,
      });

      // Get updated user
      const [users] = await db.query(
        `SELECT id, email, full_name, role, department, phone, status, last_login, created_at, updated_at
         FROM users WHERE id = ?`,
        [id]
      );

      const user = (users as any[])[0];
      // Transform snake_case to camelCase
      const updatedUser = {
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

      // Send email notification to user about profile changes
      if (Object.keys(changes).length > 0 && updatedUser.email) {
        try {
          const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
          const loginUrl = `${frontendUrl}/login`;

          // Build change details
          const changeDetails: string[] = [];
          if (changes.email) {
            changeDetails.push(`Email: ${changes.email.old} → ${changes.email.new}`);
          }
          if (changes.fullName) {
            changeDetails.push(`Full Name: ${changes.fullName.old} → ${changes.fullName.new}`);
          }
          if (changes.role) {
            changeDetails.push(`Role: ${changes.role.old} → ${changes.role.new}`);
          }
          if (changes.department !== undefined) {
            changeDetails.push(`Department: ${changes.department.old || 'N/A'} → ${changes.department.new || 'N/A'}`);
          }
          if (changes.phone !== undefined) {
            changeDetails.push(`Phone: ${changes.phone.old || 'N/A'} → ${changes.phone.new || 'N/A'}`);
          }
          if (changes.status) {
            changeDetails.push(`Status: ${changes.status.old} → ${changes.status.new}`);
          }
          if (changes.password) {
            changeDetails.push('Password: Updated');
          }

          const subject = 'Your Profile Has Been Updated - LeadTrack Pro';
          const htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                .changes { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4f46e5; }
                .change-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .change-item:last-child { border-bottom: none; }
                .old-value { color: #dc2626; text-decoration: line-through; }
                .new-value { color: #16a34a; font-weight: bold; }
                .button { display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>LeadTrack Pro</h1>
                  <p>Profile Update Notification</p>
                </div>
                <div class="content">
                  <h2>Hello ${updatedUser.fullName || 'User'},</h2>
                  <p>Your profile has been updated. Below are the details of the changes:</p>
                  
                  <div class="changes">
                    <h3 style="margin-top: 0; color: #4f46e5;">Changes Made:</h3>
                    ${changeDetails.map(detail => {
                      const parts = detail.split(' → ');
                      if (parts.length === 2) {
                        return `<div class="change-item">
                          <strong>${parts[0].split(':')[0]}:</strong><br>
                          <span class="old-value">${parts[0].split(':')[1].trim()}</span> → 
                          <span class="new-value">${parts[1]}</span>
                        </div>`;
                      }
                      return `<div class="change-item"><strong>${detail}</strong></div>`;
                    }).join('')}
                  </div>

                  <p><strong>Updated Profile Details:</strong></p>
                  <ul>
                    <li><strong>Full Name:</strong> ${updatedUser.fullName || 'N/A'}</li>
                    <li><strong>Email:</strong> ${updatedUser.email}</li>
                    <li><strong>Role:</strong> ${updatedUser.role}</li>
                    <li><strong>Department:</strong> ${updatedUser.department || 'N/A'}</li>
                    <li><strong>Phone:</strong> ${updatedUser.phone || 'N/A'}</li>
                    <li><strong>Status:</strong> ${updatedUser.status}</li>
                  </ul>

                  <p>Please log in to your account to view your updated profile:</p>
                  <div style="text-align: center;">
                    <a href="${loginUrl}" class="button">Login to LeadTrack Pro</a>
                  </div>

                  <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                    If you did not request this change or have any concerns, please contact your system administrator immediately.
                  </p>
                </div>
                <div class="footer">
                  <p>This is an automated notification from LeadTrack Pro.</p>
                  <p>© ${new Date().getFullYear()} LeadTrack Pro. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `;

          const textBody = `
LeadTrack Pro - Profile Update Notification

Hello ${updatedUser.fullName || 'User'},

Your profile has been updated. Below are the details of the changes:

${changeDetails.join('\n')}

Updated Profile Details:
- Full Name: ${updatedUser.fullName || 'N/A'}
- Email: ${updatedUser.email}
- Role: ${updatedUser.role}
- Department: ${updatedUser.department || 'N/A'}
- Phone: ${updatedUser.phone || 'N/A'}
- Status: ${updatedUser.status}

Please log in to your account to view your updated profile:
${loginUrl}

If you did not request this change or have any concerns, please contact your system administrator immediately.

---
This is an automated notification from LeadTrack Pro.
© ${new Date().getFullYear()} LeadTrack Pro. All rights reserved.
          `;

          await emailService.sendNotification(
            updatedUser.email,
            subject,
            textBody,
            htmlBody
          );

          logger.info({
            message: 'Profile update notification email sent',
            userId: id,
            email: updatedUser.email,
          });
        } catch (emailError: any) {
          // Log error but don't fail the update
          logger.error({
            message: 'Failed to send profile update notification email',
            userId: id,
            error: emailError.message,
          });
        }
      }

      res.json({
        success: true,
        data: updatedUser,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete user
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (req.user?.userId === parseInt(id)) {
        throw new CustomError('Cannot delete your own account', 400);
      }

      // Get user before deletion
      const [users] = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      const userArray = users as any[];
      if (userArray.length === 0) {
        throw new CustomError('User not found', 404);
      }

      // Delete user (cascade will handle related records)
      await db.query('DELETE FROM users WHERE id = ?', [id]);

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user?.userId || null,
          'DELETE_USER',
          'User',
          parseInt(id),
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({ deletedUser: userArray[0].email }),
        ]
      );

      logger.info({
        message: 'User deleted',
        userId: id,
        deletedBy: req.user?.userId,
      });

      res.json({
        success: true,
        data: {
          message: 'User deleted successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

