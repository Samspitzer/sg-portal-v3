import { Router, Response } from 'express';
import { query } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, ApiResponse, DashboardStats } from '../types/index.js';

const router = Router();

// Get dashboard statistics
router.get(
  '/stats',
  authenticate,
  requirePermission('dashboard:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<DashboardStats>>) => {
    // Revenue stats (from paid invoices)
    const revenueStats = await query<any>(`
      SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN paid_date >= CURRENT_DATE - INTERVAL '30 days' THEN total ELSE 0 END), 0) as this_month,
        COALESCE(SUM(CASE WHEN paid_date >= CURRENT_DATE - INTERVAL '60 days' AND paid_date < CURRENT_DATE - INTERVAL '30 days' THEN total ELSE 0 END), 0) as last_month
      FROM invoices
      WHERE status = 'paid'
    `);

    const revenue = revenueStats[0];
    const thisMonth = parseFloat(revenue.this_month);
    const lastMonth = parseFloat(revenue.last_month);
    const revenueChange = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    // Project stats
    const projectStats = await query<any>(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) as total
      FROM projects
    `);

    // Estimate stats
    const estimateStats = await query<any>(`
      SELECT 
        COUNT(*) FILTER (WHERE status IN ('draft', 'sent')) as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) as total
      FROM estimates
    `);

    const estimates = estimateStats[0];
    const conversionRate = parseInt(estimates.total) > 0 
      ? (parseInt(estimates.approved) / parseInt(estimates.total)) * 100 
      : 0;

    // Invoice stats
    const invoiceStats = await query<any>(`
      SELECT 
        COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total ELSE 0 END), 0) as outstanding,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0) as overdue,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as collected
      FROM invoices
    `);

    res.json({
      success: true,
      data: {
        revenue: {
          total: parseFloat(revenue.total_revenue),
          change: Math.round(revenueChange * 10) / 10,
          trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral',
        },
        projects: {
          active: parseInt(projectStats[0].active),
          completed: parseInt(projectStats[0].completed),
          total: parseInt(projectStats[0].total),
        },
        estimates: {
          pending: parseInt(estimates.pending),
          approved: parseInt(estimates.approved),
          conversionRate: Math.round(conversionRate * 10) / 10,
        },
        invoices: {
          outstanding: parseFloat(invoiceStats[0].outstanding),
          overdue: parseFloat(invoiceStats[0].overdue),
          collected: parseFloat(invoiceStats[0].collected),
        },
      },
    });
  })
);

// Get recent activity
router.get(
  '/activity',
  authenticate,
  requirePermission('dashboard:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { limit = '20' } = req.query;

    const activities = await query<any>(
      `SELECT a.*, u.name as user_name, u.avatar_url as user_avatar
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [parseInt(limit as string)]
    );

    res.json({
      success: true,
      data: activities.map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        userName: a.user_name,
        userAvatar: a.user_avatar,
        entityType: a.entity_type,
        entityId: a.entity_id,
        action: a.action,
        description: a.description,
        metadata: a.metadata,
        createdAt: a.created_at,
      })),
    });
  })
);

// Get upcoming tasks
router.get(
  '/tasks',
  authenticate,
  requirePermission('dashboard:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const userId = req.user!.sub;
    const { limit = '10' } = req.query;

    const tasks = await query<any>(
      `SELECT t.*, p.name as project_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.assignee_id = $1 AND t.status != 'completed'
       ORDER BY 
         CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
         t.due_date ASC,
         CASE t.priority 
           WHEN 'urgent' THEN 0 
           WHEN 'high' THEN 1 
           WHEN 'medium' THEN 2 
           ELSE 3 
         END
       LIMIT $2`,
      [userId, parseInt(limit as string)]
    );

    res.json({
      success: true,
      data: tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        projectId: t.project_id,
        projectName: t.project_name,
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
        createdAt: t.created_at,
      })),
    });
  })
);

// Get quick stats for widgets
router.get(
  '/quick-stats',
  authenticate,
  requirePermission('dashboard:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    // Client count
    const clientCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM clients WHERE is_active = true'
    );

    // Pending estimates value
    const pendingEstimates = await query<any>(
      `SELECT COALESCE(SUM(total), 0) as total 
       FROM estimates 
       WHERE status IN ('draft', 'sent')`
    );

    // Overdue invoices
    const overdueInvoices = await query<any>(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
       FROM invoices 
       WHERE status = 'overdue'`
    );

    // Tasks due this week
    const tasksDueThisWeek = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM tasks 
       WHERE status != 'completed' 
         AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`
    );

    res.json({
      success: true,
      data: {
        activeClients: parseInt(clientCount[0].count),
        pendingEstimatesValue: parseFloat(pendingEstimates[0].total),
        overdueInvoices: {
          count: parseInt(overdueInvoices[0].count),
          total: parseFloat(overdueInvoices[0].total),
        },
        tasksDueThisWeek: parseInt(tasksDueThisWeek[0].count),
      },
    });
  })
);

export default router;
