import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { asyncHandler, errors } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, DBClient, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schemas
const createClientSchema = z.object({
  companyName: z.string().min(1).max(255),
  contactName: z.string().max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  notes: z.string().optional(),
});

const updateClientSchema = createClientSchema.partial();

// Helper to map DB client to API response
function mapClient(c: DBClient) {
  return {
    id: c.id,
    companyName: c.company_name,
    contactName: c.contact_name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    city: c.city,
    state: c.state,
    zip: c.zip,
    notes: c.notes,
    isActive: c.is_active,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

// List all clients
router.get(
  '/',
  authenticate,
  requirePermission('customers:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { search, isActive = 'true', page = '1', limit = '50' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (isActive !== undefined && isActive !== 'all') {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (company_name ILIKE $${paramIndex} OR contact_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM clients ${whereClause}`,
      params
    );
    const countRow = countResult[0];
    const total = countRow ? parseInt(countRow.count) : 0;

    // Get paginated clients
    const clients = await query<DBClient>(
      `SELECT * FROM clients ${whereClause}
       ORDER BY company_name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      success: true,
      data: clients.map(mapClient),
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  })
);

// Get single client
router.get(
  '/:id',
  authenticate,
  requirePermission('customers:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;

    const clients = await query<DBClient>(
      'SELECT * FROM clients WHERE id = $1',
      [id]
    );

    const client = clients[0];
    if (!client) {
      throw errors.notFound('Client');
    }

    // Get related stats
    const stats = await query<{
      project_count: string;
      estimate_count: string;
      invoice_count: string;
      total_paid: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM projects WHERE client_id = $1) as project_count,
         (SELECT COUNT(*) FROM estimates WHERE client_id = $1) as estimate_count,
         (SELECT COUNT(*) FROM invoices WHERE client_id = $1) as invoice_count,
         (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE client_id = $1 AND status = 'paid') as total_paid`,
      [id]
    );

    const statsRow = stats[0];

    res.json({
      success: true,
      data: {
        ...mapClient(client),
        stats: {
          projectCount: statsRow ? parseInt(statsRow.project_count) : 0,
          estimateCount: statsRow ? parseInt(statsRow.estimate_count) : 0,
          invoiceCount: statsRow ? parseInt(statsRow.invoice_count) : 0,
          totalPaid: statsRow ? parseFloat(statsRow.total_paid) : 0,
        },
      },
    });
  })
);

// Create client
router.post(
  '/',
  authenticate,
  requirePermission('customers:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const data = createClientSchema.parse(req.body);

    const clients = await query<DBClient>(
      `INSERT INTO clients (company_name, contact_name, email, phone, address, city, state, zip, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.companyName,
        data.contactName,
        data.email || null,
        data.phone,
        data.address,
        data.city,
        data.state,
        data.zip,
        data.notes,
      ]
    );

    const client = clients[0];
    if (!client) {
      throw new Error('Failed to create client');
    }

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'client', $2, 'created', $3)`,
      [req.user!.sub, client.id, `Created client: ${client.company_name}`]
    );

    res.status(201).json({
      success: true,
      data: mapClient(client),
    });
  })
);

// Update client
router.patch(
  '/:id',
  authenticate,
  requirePermission('customers:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;
    const data = updateClientSchema.parse(req.body);

    const clients = await query<DBClient>(
      `UPDATE clients SET
         company_name = COALESCE($2, company_name),
         contact_name = COALESCE($3, contact_name),
         email = COALESCE($4, email),
         phone = COALESCE($5, phone),
         address = COALESCE($6, address),
         city = COALESCE($7, city),
         state = COALESCE($8, state),
         zip = COALESCE($9, zip),
         notes = COALESCE($10, notes)
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.companyName,
        data.contactName,
        data.email,
        data.phone,
        data.address,
        data.city,
        data.state,
        data.zip,
        data.notes,
      ]
    );

    const client = clients[0];
    if (!client) {
      throw errors.notFound('Client');
    }

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'client', $2, 'updated', $3)`,
      [req.user!.sub, id, `Updated client: ${client.company_name}`]
    );

    res.json({
      success: true,
      data: mapClient(client),
    });
  })
);

// Deactivate client
router.delete(
  '/:id',
  authenticate,
  requirePermission('customers:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;

    const clients = await query<DBClient>(
      'UPDATE clients SET is_active = false WHERE id = $1 RETURNING company_name',
      [id]
    );

    const client = clients[0];
    if (!client) {
      throw errors.notFound('Client');
    }

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'client', $2, 'deactivated', $3)`,
      [req.user!.sub, id, `Deactivated client: ${client.company_name}`]
    );

    res.json({
      success: true,
      data: { message: 'Client deactivated successfully' },
    });
  })
);

export default router;
