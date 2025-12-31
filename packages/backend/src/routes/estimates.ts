import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { asyncHandler, errors } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, DBEstimate, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schemas
const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0),
});

const createEstimateSchema = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(1).optional(),
  validUntil: z.string().optional(),
});

const updateEstimateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'expired']).optional(),
  lineItems: z.array(lineItemSchema).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  validUntil: z.string().optional(),
});

// Generate estimate number
async function generateEstimateNumber(): Promise<string> {
  const result = await query<{ nextval: string }>(
    "SELECT nextval('estimate_number_seq')"
  );
  return `EST-${result[0].nextval}`;
}

// Calculate totals
function calculateTotals(lineItems: Array<{ quantity: number; unitPrice: number }>, taxRate?: number) {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = taxRate ? subtotal * taxRate : 0;
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

// List all estimates
router.get(
  '/',
  authenticate,
  requirePermission('estimating:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { status, clientId, search, page = '1', limit = '50' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (clientId) {
      whereClause += ` AND e.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (e.estimate_number ILIKE $${paramIndex} OR e.title ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM estimates e ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0].count);

    const estimates = await query<any>(
      `SELECT e.*, c.company_name as client_name, u.name as created_by_name
       FROM estimates e
       LEFT JOIN clients c ON e.client_id = c.id
       LEFT JOIN users u ON e.created_by = u.id
       ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      success: true,
      data: estimates.map((e: any) => ({
        id: e.id,
        estimateNumber: e.estimate_number,
        clientId: e.client_id,
        clientName: e.client_name,
        projectId: e.project_id,
        title: e.title,
        status: e.status,
        subtotal: parseFloat(e.subtotal),
        taxRate: e.tax_rate ? parseFloat(e.tax_rate) : null,
        taxAmount: parseFloat(e.tax_amount),
        total: parseFloat(e.total),
        validUntil: e.valid_until,
        createdBy: e.created_by,
        createdByName: e.created_by_name,
        createdAt: e.created_at,
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

// Get single estimate
router.get(
  '/:id',
  authenticate,
  requirePermission('estimating:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;

    const estimates = await query<any>(
      `SELECT e.*, c.company_name as client_name, c.email as client_email,
              p.name as project_name, u.name as created_by_name
       FROM estimates e
       LEFT JOIN clients c ON e.client_id = c.id
       LEFT JOIN projects p ON e.project_id = p.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = $1`,
      [id]
    );

    if (estimates.length === 0) {
      throw errors.notFound('Estimate');
    }

    const estimate = estimates[0];

    // Get line items
    const lineItems = await query<any>(
      'SELECT * FROM estimate_line_items WHERE estimate_id = $1 ORDER BY sort_order',
      [id]
    );

    res.json({
      success: true,
      data: {
        id: estimate.id,
        estimateNumber: estimate.estimate_number,
        clientId: estimate.client_id,
        clientName: estimate.client_name,
        clientEmail: estimate.client_email,
        projectId: estimate.project_id,
        projectName: estimate.project_name,
        title: estimate.title,
        description: estimate.description,
        status: estimate.status,
        subtotal: parseFloat(estimate.subtotal),
        taxRate: estimate.tax_rate ? parseFloat(estimate.tax_rate) : null,
        taxAmount: parseFloat(estimate.tax_amount),
        total: parseFloat(estimate.total),
        validUntil: estimate.valid_until,
        createdBy: estimate.created_by,
        createdByName: estimate.created_by_name,
        createdAt: estimate.created_at,
        updatedAt: estimate.updated_at,
        lineItems: lineItems.map((li: any) => ({
          id: li.id,
          description: li.description,
          quantity: parseFloat(li.quantity),
          unitPrice: parseFloat(li.unit_price),
          total: parseFloat(li.total),
        })),
      },
    });
  })
);

// Create estimate
router.post(
  '/',
  authenticate,
  requirePermission('estimating:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const data = createEstimateSchema.parse(req.body);
    const estimateNumber = await generateEstimateNumber();
    const { subtotal, taxAmount, total } = calculateTotals(data.lineItems, data.taxRate);

    // Create estimate
    const estimates = await query<DBEstimate>(
      `INSERT INTO estimates (estimate_number, client_id, project_id, title, description, status, subtotal, tax_rate, tax_amount, total, valid_until, created_by)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        estimateNumber,
        data.clientId,
        data.projectId,
        data.title,
        data.description,
        subtotal,
        data.taxRate,
        taxAmount,
        total,
        data.validUntil,
        req.user!.sub,
      ]
    );

    const estimate = estimates[0];

    // Create line items
    for (let i = 0; i < data.lineItems.length; i++) {
      const item = data.lineItems[i];
      await query(
        `INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, total, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [estimate.id, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice, i]
      );
    }

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'estimate', $2, 'created', $3)`,
      [req.user!.sub, estimate.id, `Created estimate: ${estimateNumber}`]
    );

    res.status(201).json({
      success: true,
      data: {
        id: estimate.id,
        estimateNumber: estimate.estimate_number,
        clientId: estimate.client_id,
        title: estimate.title,
        status: estimate.status,
        subtotal: parseFloat(String(estimate.subtotal)),
        taxAmount: parseFloat(String(estimate.tax_amount)),
        total: parseFloat(String(estimate.total)),
        createdAt: estimate.created_at,
      },
    });
  })
);

// Update estimate
router.patch(
  '/:id',
  authenticate,
  requirePermission('estimating:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;
    const data = updateEstimateSchema.parse(req.body);

    // Check if estimate exists
    const existing = await query<DBEstimate>(
      'SELECT * FROM estimates WHERE id = $1',
      [id]
    );

    if (existing.length === 0) {
      throw errors.notFound('Estimate');
    }

    // Only allow editing draft/sent estimates
    if (!['draft', 'sent'].includes(existing[0].status) && !data.status) {
      throw errors.badRequest('Cannot edit approved/rejected estimates');
    }

    // Update line items if provided
    if (data.lineItems) {
      // Delete existing line items
      await query('DELETE FROM estimate_line_items WHERE estimate_id = $1', [id]);

      // Insert new line items
      for (let i = 0; i < data.lineItems.length; i++) {
        const item = data.lineItems[i];
        await query(
          `INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, total, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice, i]
        );
      }

      // Recalculate totals
      const taxRate = data.taxRate ?? (existing[0].tax_rate ? parseFloat(String(existing[0].tax_rate)) : undefined);
      const { subtotal, taxAmount, total } = calculateTotals(data.lineItems, taxRate);

      await query(
        `UPDATE estimates SET subtotal = $2, tax_rate = $3, tax_amount = $4, total = $5 WHERE id = $1`,
        [id, subtotal, taxRate, taxAmount, total]
      );
    }

    // Update estimate fields
    const estimates = await query<DBEstimate>(
      `UPDATE estimates SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         status = COALESCE($4, status),
         tax_rate = COALESCE($5, tax_rate),
         valid_until = COALESCE($6, valid_until)
       WHERE id = $1
       RETURNING *`,
      [id, data.title, data.description, data.status, data.taxRate, data.validUntil]
    );

    const estimate = estimates[0];

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'estimate', $2, 'updated', $3)`,
      [req.user!.sub, id, `Updated estimate: ${estimate.estimate_number}`]
    );

    res.json({
      success: true,
      data: {
        id: estimate.id,
        estimateNumber: estimate.estimate_number,
        title: estimate.title,
        status: estimate.status,
        subtotal: parseFloat(String(estimate.subtotal)),
        taxAmount: parseFloat(String(estimate.tax_amount)),
        total: parseFloat(String(estimate.total)),
        updatedAt: estimate.updated_at,
      },
    });
  })
);

// Delete estimate
router.delete(
  '/:id',
  authenticate,
  requirePermission('estimating:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;

    const estimates = await query<DBEstimate>(
      'DELETE FROM estimates WHERE id = $1 RETURNING estimate_number',
      [id]
    );

    if (estimates.length === 0) {
      throw errors.notFound('Estimate');
    }

    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'estimate', $2, 'deleted', $3)`,
      [req.user!.sub, id, `Deleted estimate: ${estimates[0].estimate_number}`]
    );

    res.json({
      success: true,
      data: { message: 'Estimate deleted successfully' },
    });
  })
);

// Convert estimate to invoice
router.post(
  '/:id/convert-to-invoice',
  authenticate,
  requirePermission('estimating:edit', 'accounting:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;

    const estimates = await query<any>(
      'SELECT * FROM estimates WHERE id = $1',
      [id]
    );

    if (estimates.length === 0) {
      throw errors.notFound('Estimate');
    }

    const estimate = estimates[0];

    if (estimate.status !== 'approved') {
      throw errors.badRequest('Only approved estimates can be converted to invoices');
    }

    // Generate invoice number
    const invoiceNumResult = await query<{ nextval: string }>(
      "SELECT nextval('invoice_number_seq')"
    );
    const invoiceNumber = `INV-${invoiceNumResult[0].nextval}`;

    // Create invoice
    const invoices = await query<any>(
      `INSERT INTO invoices (invoice_number, client_id, project_id, estimate_id, status, due_date, subtotal, tax_rate, tax_amount, total, created_by)
       VALUES ($1, $2, $3, $4, 'draft', CURRENT_DATE + INTERVAL '30 days', $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        invoiceNumber,
        estimate.client_id,
        estimate.project_id,
        estimate.id,
        estimate.subtotal,
        estimate.tax_rate,
        estimate.tax_amount,
        estimate.total,
        req.user!.sub,
      ]
    );

    const invoice = invoices[0];

    // Copy line items
    const lineItems = await query<any>(
      'SELECT * FROM estimate_line_items WHERE estimate_id = $1',
      [id]
    );

    for (const item of lineItems) {
      await query(
        `INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoice.id, item.description, item.quantity, item.unit_price, item.total, item.sort_order]
      );
    }

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'invoice', $2, 'created', $3)`,
      [req.user!.sub, invoice.id, `Created invoice ${invoiceNumber} from estimate ${estimate.estimate_number}`]
    );

    res.status(201).json({
      success: true,
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        message: 'Estimate converted to invoice successfully',
      },
    });
  })
);

export default router;
