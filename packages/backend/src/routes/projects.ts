import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { asyncHandler, errors } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, DBProject, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  clientId: z.string().uuid().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).default('planning'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().positive().optional(),
  managerId: z.string().uuid().optional(),
});

const updateProjectSchema = createProjectSchema.partial();

// List all projects
router.get(
  '/',
  authenticate,
  requirePermission('projects:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { status, priority, clientId, managerId, search, page = '1', limit = '50' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      whereClause += ` AND p.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (clientId) {
      whereClause += ` AND p.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    if (managerId) {
      whereClause += ` AND p.manager_id = $${paramIndex}`;
      params.push(managerId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM projects p ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0].count);

    // Get paginated projects with joins
    const projects = await query<any>(
      `SELECT p.*, 
              c.company_name as client_name,
              u.name as manager_name,
              (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as completed_tasks
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN users u ON p.manager_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      success: true,
      data: projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        clientId: p.client_id,
        clientName: p.client_name,
        status: p.status,
        priority: p.priority,
        startDate: p.start_date,
        endDate: p.end_date,
        budget: p.budget ? parseFloat(p.budget) : null,
        spent: p.spent ? parseFloat(p.spent) : 0,
        managerId: p.manager_id,
        managerName: p.manager_name,
        taskCount: parseInt(p.task_count),
        completedTasks: parseInt(p.completed_tasks),
        createdAt: p.created_at,
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

// Get single project
router.get(
  '/:id',
  authenticate,
  requirePermission('projects:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;

    const projects = await query<any>(
      `SELECT p.*, 
              c.company_name as client_name,
              u.name as manager_name
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN users u ON p.manager_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (projects.length === 0) {
      throw errors.notFound('Project');
    }

    const project = projects[0];

    // Get tasks
    const tasks = await query<any>(
      `SELECT t.*, u.name as assignee_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.project_id = $1
       ORDER BY t.created_at DESC`,
      [id]
    );

    // Get recent activity
    const activities = await query<any>(
      `SELECT a.*, u.name as user_name
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.entity_type = 'project' AND a.entity_id = $1
       ORDER BY a.created_at DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        clientId: project.client_id,
        clientName: project.client_name,
        status: project.status,
        priority: project.priority,
        startDate: project.start_date,
        endDate: project.end_date,
        budget: project.budget ? parseFloat(project.budget) : null,
        spent: project.spent ? parseFloat(project.spent) : 0,
        managerId: project.manager_id,
        managerName: project.manager_name,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        tasks: tasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assigneeId: t.assignee_id,
          assigneeName: t.assignee_name,
          dueDate: t.due_date,
          completedAt: t.completed_at,
        })),
        recentActivity: activities.map((a: any) => ({
          id: a.id,
          userId: a.user_id,
          userName: a.user_name,
          action: a.action,
          description: a.description,
          createdAt: a.created_at,
        })),
      },
    });
  })
);

// Create project
router.post(
  '/',
  authenticate,
  requirePermission('projects:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const data = createProjectSchema.parse(req.body);

    const projects = await query<DBProject>(
      `INSERT INTO projects (name, description, client_id, status, priority, start_date, end_date, budget, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.name,
        data.description,
        data.clientId,
        data.status,
        data.priority,
        data.startDate,
        data.endDate,
        data.budget,
        data.managerId || req.user!.sub,
      ]
    );

    const project = projects[0];

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'project', $2, 'created', $3)`,
      [req.user!.sub, project.id, `Created project: ${project.name}`]
    );

    res.status(201).json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        clientId: project.client_id,
        status: project.status,
        priority: project.priority,
        startDate: project.start_date,
        endDate: project.end_date,
        budget: project.budget ? parseFloat(String(project.budget)) : null,
        managerId: project.manager_id,
        createdAt: project.created_at,
      },
    });
  })
);

// Update project
router.patch(
  '/:id',
  authenticate,
  requirePermission('projects:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;
    const data = updateProjectSchema.parse(req.body);

    const projects = await query<DBProject>(
      `UPDATE projects SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         client_id = COALESCE($4, client_id),
         status = COALESCE($5, status),
         priority = COALESCE($6, priority),
         start_date = COALESCE($7, start_date),
         end_date = COALESCE($8, end_date),
         budget = COALESCE($9, budget),
         manager_id = COALESCE($10, manager_id)
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.name,
        data.description,
        data.clientId,
        data.status,
        data.priority,
        data.startDate,
        data.endDate,
        data.budget,
        data.managerId,
      ]
    );

    if (projects.length === 0) {
      throw errors.notFound('Project');
    }

    const project = projects[0];

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description, metadata)
       VALUES ($1, 'project', $2, 'updated', $3, $4)`,
      [req.user!.sub, id, `Updated project: ${project.name}`, JSON.stringify(data)]
    );

    res.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        clientId: project.client_id,
        status: project.status,
        priority: project.priority,
        startDate: project.start_date,
        endDate: project.end_date,
        budget: project.budget ? parseFloat(String(project.budget)) : null,
        spent: project.spent ? parseFloat(String(project.spent)) : 0,
        managerId: project.manager_id,
        updatedAt: project.updated_at,
      },
    });
  })
);

// Delete project
router.delete(
  '/:id',
  authenticate,
  requirePermission('projects:edit'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;

    const projects = await query<DBProject>(
      'DELETE FROM projects WHERE id = $1 RETURNING name',
      [id]
    );

    if (projects.length === 0) {
      throw errors.notFound('Project');
    }

    // Log activity
    await query(
      `INSERT INTO activities (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'project', $2, 'deleted', $3)`,
      [req.user!.sub, id, `Deleted project: ${projects[0].name}`]
    );

    res.json({
      success: true,
      data: { message: 'Project deleted successfully' },
    });
  })
);

export default router;
