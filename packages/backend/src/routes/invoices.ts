import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { asyncHandler, errors } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, DBInvoice, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schemas
const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0),
});

const createInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(1).optional(),
  dueDate: z.string(),
  notes: z.string().optional(),
});

const updateInvoiceSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  lineItems: z.array(lineItemSchema).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  paidDate: z.string().optional(),
});

// Generate invoice number
async function generateInvoiceNumber(): Promise<string> {
  const result = await query<{ nextval: string }>(
    "SELECT nextval('invoice_number_seq')"
  );
  return `INV-${result[0].nextval}`;
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

// List all invoices
router.get(
  '/',
  authenticate,
  requirePermission('accounting:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { status, clientId, search, page = '1', limit = '50' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (clientId) {
      whereClause += ` AND i.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (i.invoice_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM invoices i ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0].count);

    const invoices = await query<any>(
      `SELECT i.*, c.company_name as client_name, u.name as created_by_name
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN users u ON i.created_by = u.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      success: true,
      data: invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        clientId: inv.client_id,
        clientName: inv.client_name,
        projectId: inv.project_id,
        status: inv.status,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        paidDate: inv.paid_date,
        subtotal: parseFloat(inv.subtotal),
        taxRate: inv.tax_rate ? parseFloat(inv.tax_rate) : null,
        taxAmount: parseFloat(inv.tax_amount),
        total: parseFloat(inv.total),
        createdBy: inv.created_by,
        createdByName: inv.created_by_name,
        createdAt: inv.created_at,
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

// Get single invoice
router.get(
  '/:id',
  authenticate,
  requirePermission('accounting:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;

    const invoices = await query<any>(
      `SELECT i.*, c.company_name as client_name, c.email as client_email,
              c.address as client_address, c.city as client_city, 
              c.state as client_state, c.zip as client_zip,
              p.name as project_name, u.name as created_by_name
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN projects p ON i.project_id = p.id
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (invoices.length === 0) {
      throw errors.notFound('Invoice');
    }

    const invoice = invoices[0];

    // Get line items
    const lineItems = await query<any>(
      'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY sort_order',
      [id]
    );

    res.json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        clientId: invoice.client_id,
        clientName: invoice.client_name,
        clientEmail: invoice.client_email,
        clientAddress: invoice.client_address,
        clientCity: invoice.client_city,
        clientState: invoice.client_state,
        clientZip: invoice.client_zip,
        projectId: invoice.project_id,
        projectName: invoice.project_name,
        estimateId: invoice.estimate_id,
        status: invoice.status,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        paidDate: invoice.paid_date,
        subtotal: parseFloat(invoice.subtotal),
        taxRate: invoice.tax_rate ? parseFloat(invoice.tax_rate) : null,
        taxAmount: parseFloat(invoice.tax_amount),
        total: parseFloat(invoice.total),
        notes: invoice.notes,
        createdBy: invoice.created_by,
        createdByName: invoice.created_by_name,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
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

// Create invoice
router.post(
  '/',
  authenticate,
  requirePermission('accounting:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const data = createInvoiceSchema.parse(req.body);
    const invoiceNumber = await generateInvoiceNumber();
    const { subtotal, taxAmount, total } = calculateTotals(data.lineItems, data.taxRate);

    const invoices = await query<DBInvoice>(
      `INSERT INTO invoices (invoice_number, client_id, project_id, status, due_date, subtotal, tax_rate, tax_amount, total, notes, created_by)
       VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        invoiceNumber,
        data.clientId,
        data.projectId,
        data.dueDate,
        subtotal,
        data.taxRate,
        taxAmount,
        total,
        data.notes,
        req.user!.sub,
      ]
    );

    const invoice = invoices[0];

    // Create line items
    for (let i = 0; i < data.lineItems.length; i++) {
      const item = data.lineItems[i];
      await query(
        `INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoice.id, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice, i]
      );
    }

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'invoice', $2, 'created', $3)`,
      [req.user!.sub, invoice.id, `Created invoice: ${invoiceNumber}`]
    );

    res.status(201).json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        clientId: invoice.client_id,
        status: invoice.status,
        subtotal: parseFloat(String(invoice.subtotal)),
        taxAmount: parseFloat(String(invoice.tax_amount)),
        total: parseFloat(String(invoice.total)),
        createdAt: invoice.created_at,
      },
    });
  })
);

// Update invoice
router.patch(
  '/:id',
  authenticate,
  requirePermission('accounting:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;
    const data = updateInvoiceSchema.parse(req.body);

    const existing = await query<DBInvoice>(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );

    if (existing.length === 0) {
      throw errors.notFound('Invoice');
    }

    // Only allow editing draft/sent invoices (unless just changing status)
    if (!['draft', 'sent'].includes(existing[0].status) && !data.status && !data.paidDate) {
      throw errors.badRequest('Cannot edit paid/cancelled invoices');
    }

    // Update line items if provided
    if (data.lineItems) {
      await query('DELETE FROM invoice_line_items WHERE invoice_id = $1', [id]);

      for (let i = 0; i < data.lineItems.length; i++) {
        const item = data.lineItems[i];
        await query(
          `INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice, i]
        );
      }

      const taxRate = data.taxRate ?? (existing[0].tax_rate ? parseFloat(String(existing[0].tax_rate)) : undefined);
      const { subtotal, taxAmount, total } = calculateTotals(data.lineItems, taxRate);

      await query(
        `UPDATE invoices SET subtotal = $2, tax_rate = $3, tax_amount = $4, total = $5 WHERE id = $1`,
        [id, subtotal, taxRate, taxAmount, total]
      );
    }

    // Handle status change to paid
    let paidDate = data.paidDate;
    if (data.status === 'paid' && !paidDate) {
      paidDate = new Date().toISOString().split('T')[0];
    }

    const invoices = await query<DBInvoice>(
      `UPDATE invoices SET
         status = COALESCE($2, status),
         tax_rate = COALESCE($3, tax_rate),
         due_date = COALESCE($4, due_date),
         notes = COALESCE($5, notes),
         paid_date = COALESCE($6, paid_date)
       WHERE id = $1
       RETURNING *`,
      [id, data.status, data.taxRate, data.dueDate, data.notes, paidDate]
    );

    const invoice = invoices[0];

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'invoice', $2, 'updated', $3)`,
      [req.user!.sub, id, `Updated invoice: ${invoice.invoice_number}`]
    );

    res.json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        subtotal: parseFloat(String(invoice.subtotal)),
        taxAmount: parseFloat(String(invoice.tax_amount)),
        total: parseFloat(String(invoice.total)),
        paidDate: invoice.paid_date,
        updatedAt: invoice.updated_at,
      },
    });
  })
);

// Mark invoice as paid
router.post(
  '/:id/mark-paid',
  authenticate,
  requirePermission('accounting:approve'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;
    const { paidDate } = req.body;

    const invoices = await query<DBInvoice>(
      `UPDATE invoices 
       SET status = 'paid', paid_date = COALESCE($2, CURRENT_DATE)
       WHERE id = $1 AND status IN ('sent', 'overdue')
       RETURNING *`,
      [id, paidDate]
    );

    if (invoices.length === 0) {
      throw errors.badRequest('Invoice cannot be marked as paid');
    }

    const invoice = invoices[0];

    // Update project spent if linked
    if (invoice.project_id) {
      await query(
        `UPDATE projects 
         SET spent = spent + $2
         WHERE id = $1`,
        [invoice.project_id, invoice.total]
      );
    }

    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'invoice', $2, 'paid', $3)`,
      [req.user!.sub, id, `Marked invoice ${invoice.invoice_number} as paid`]
    );

    res.json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        paidDate: invoice.paid_date,
        message: 'Invoice marked as paid',
      },
    });
  })
);

// Delete invoice
router.delete(
  '/:id',
  authenticate,
  requirePermission('accounting:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;

    const invoices = await query<DBInvoice>(
      'DELETE FROM invoices WHERE id = $1 AND status = \'draft\' RETURNING invoice_number',
      [id]
    );

    if (invoices.length === 0) {
      throw errors.badRequest('Only draft invoices can be deleted');
    }

    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'invoice', $2, 'deleted', $3)`,
      [req.user!.sub, id, `Deleted invoice: ${invoices[0].invoice_number}`]
    );

    res.json({
      success: true,
      data: { message: 'Invoice deleted successfully' },
    });
  })
);

export default router;
