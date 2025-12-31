import { Router, Response } from 'express';
import { query } from '../config/database.js';
import { authenticate, generateToken } from '../middleware/auth.js';
import { asyncHandler, errors } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, DBUser, ApiResponse } from '../types/index.js';
import logger from '../config/logger.js';

const router = Router();

// Login / Sync user from Azure AD
router.post(
  '/login',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { sub: azureOid, email, name } = req.user!;

    // Check if user exists
    const existingUsers = await query<DBUser>(
      'SELECT * FROM users WHERE azure_oid = $1',
      [azureOid]
    );

    let user: DBUser;

    if (existingUsers.length === 0) {
      // Create new user on first login
      const result = await query<DBUser>(
        `INSERT INTO users (azure_oid, email, name, last_login_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING *`,
        [azureOid, email, name]
      );
      
      if (!result[0]) {
        throw errors.internal('Failed to create user');
      }
      user = result[0];
      logger.info('New user created', { userId: user.id, email });

      // Log activity
      await query(
        `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
         VALUES ($1, 'user', $1, 'created', 'User account created via Azure AD login')`,
        [user.id]
      );
    } else {
      const existingUser = existingUsers[0];
      if (!existingUser) {
        throw errors.internal('User query returned empty result');
      }

      // Check if user is active
      if (!existingUser.is_active) {
        throw errors.forbidden('Your account has been deactivated');
      }

      // Update user info and last login
      const updated = await query<DBUser>(
        `UPDATE users SET
           email = $2,
           name = $3,
           last_login_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [existingUser.id, email, name]
      );
      
      if (!updated[0]) {
        throw errors.internal('Failed to update user');
      }
      user = updated[0];
    }

    // Generate internal JWT for API calls
    const token = generateToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: [user.role],
      permissions: user.permissions,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatar_url,
          role: user.role,
          permissions: user.permissions,
        },
        token,
      },
    });
  })
);

// Get current user
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const userId = req.user!.sub;

    const users = await query<DBUser>(
      'SELECT * FROM users WHERE id = $1 OR azure_oid = $1',
      [userId]
    );

    const user = users[0];
    if (!user) {
      throw errors.notFound('User');
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        role: user.role,
        permissions: user.permissions,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
      },
    });
  })
);

// Update current user profile
router.patch(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const userId = req.user!.sub;
    const { name, avatarUrl } = req.body;

    const users = await query<DBUser>(
      `UPDATE users SET
         name = COALESCE($2, name),
         avatar_url = COALESCE($3, avatar_url)
       WHERE id = $1 OR azure_oid = $1
       RETURNING *`,
      [userId, name, avatarUrl]
    );

    const user = users[0];
    if (!user) {
      throw errors.notFound('User');
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        role: user.role,
        permissions: user.permissions,
      },
    });
  })
);

// Logout (client-side only, but we log the activity)
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const userId = req.user!.sub;

    // Log the logout activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'user', $1, 'logout', 'User logged out')`,
      [userId]
    );

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  })
);

export default router;
