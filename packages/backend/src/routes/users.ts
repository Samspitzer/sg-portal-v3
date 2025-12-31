import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { authenticate, requirePermission, requireRole } from '../middleware/auth.js';
import { asyncHandler, errors } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, DBUser, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schemas
const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['admin', 'manager', 'estimator', 'accountant', 'project_manager', 'developer', 'viewer']).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// List all users
router.get(
  '/',
  authenticate,
  requirePermission('admin:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { role, isActive, search, page = '1', limit = '50' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (role) {
      whereClause += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0].count);

    // Get paginated users
    const users = await query<DBUser>(
      `SELECT * FROM users ${whereClause}
       ORDER BY name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        avatarUrl: u.avatar_url,
        role: u.role,
        permissions: u.permissions,
        isActive: u.is_active,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
      })),
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  })
);

// Get single user
router.get(
  '/:id',
  authenticate,
  requirePermission('admin:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;

    const users = await query<DBUser>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (users.length === 0) {
      throw errors.notFound('User');
    }

    const user = users[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        role: user.role,
        permissions: user.permissions,
        isActive: user.is_active,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  })
);

// Update user
router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const users = await query<DBUser>(
      `UPDATE users SET
         name = COALESCE($2, name),
         role = COALESCE($3, role),
         permissions = COALESCE($4, permissions),
         is_active = COALESCE($5, is_active)
       WHERE id = $1
       RETURNING *`,
      [id, data.name, data.role, data.permissions, data.isActive]
    );

    if (users.length === 0) {
      throw errors.notFound('User');
    }

    const user = users[0];

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description, metadata)
       VALUES ($1, 'user', $2, 'updated', 'User profile updated', $3)`,
      [req.user!.sub, id, JSON.stringify(data)]
    );

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        role: user.role,
        permissions: user.permissions,
        isActive: user.is_active,
      },
    });
  })
);

// Deactivate user
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;

    // Don't allow self-deactivation
    if (id === req.user!.sub) {
      throw errors.badRequest('Cannot deactivate your own account');
    }

    const users = await query<DBUser>(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (users.length === 0) {
      throw errors.notFound('User');
    }

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'user', $2, 'deactivated', 'User account deactivated')`,
      [req.user!.sub, id]
    );

    res.json({
      success: true,
      data: { message: 'User deactivated successfully' },
    });
  })
);

export default router;
