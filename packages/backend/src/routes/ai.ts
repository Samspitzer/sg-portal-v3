import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import authenticate from '../middleware/auth.js';
import { aiService, AIMessage, AIContext } from '../services/ai.js';
import { query } from '../config/database.js';
import { logger } from '../config/logger.js';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// Validation schemas
const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  context: z.object({
    type: z.enum(['client', 'project', 'estimate', 'invoice', 'general']),
    entityId: z.string().uuid().optional(),
  }),
  options: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(4000).optional(),
  }).optional(),
});

const draftEmailSchema = z.object({
  context: z.object({
    type: z.enum(['client', 'project', 'estimate', 'invoice']),
    entityId: z.string().uuid(),
  }),
  purpose: z.string().min(1),
  tone: z.enum(['formal', 'friendly', 'firm']).optional(),
});

const suggestActionsSchema = z.object({
  context: z.object({
    type: z.enum(['client', 'project', 'estimate', 'invoice']),
    entityId: z.string().uuid(),
  }),
});

const generateDescriptionSchema = z.object({
  context: z.object({
    type: z.enum(['estimate', 'invoice', 'project']),
    entityId: z.string().uuid().optional(),
  }),
  itemType: z.string(),
  details: z.string(),
});

// Helper to fetch context data
async function getContextData(type: string, entityId?: string): Promise<Record<string, unknown> | undefined> {
  if (!entityId) return undefined;

  try {
    switch (type) {
      case 'client': {
        const rows = await query(`
          SELECT c.*, 
            (SELECT COUNT(*) FROM projects WHERE client_id = c.id) as project_count,
            (SELECT COUNT(*) FROM estimates WHERE client_id = c.id) as estimate_count,
            (SELECT COUNT(*) FROM invoices WHERE client_id = c.id) as invoice_count,
            (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE client_id = c.id AND status = 'paid') as total_paid
          FROM clients c WHERE c.id = $1
        `, [entityId]);
        return rows[0];
      }
      case 'project': {
        const rows = await query(`
          SELECT p.*, c.company_name as client_name,
            (SELECT json_agg(t.*) FROM tasks t WHERE t.project_id = p.id) as tasks
          FROM projects p
          LEFT JOIN clients c ON p.client_id = c.id
          WHERE p.id = $1
        `, [entityId]);
        return rows[0];
      }
      case 'estimate': {
        const rows = await query(`
          SELECT e.*, c.company_name as client_name,
            (SELECT json_agg(li.*) FROM estimate_line_items li WHERE li.estimate_id = e.id) as line_items
          FROM estimates e
          LEFT JOIN clients c ON e.client_id = c.id
          WHERE e.id = $1
        `, [entityId]);
        return rows[0];
      }
      case 'invoice': {
        const rows = await query(`
          SELECT i.*, c.company_name as client_name, c.contact_email,
            (SELECT json_agg(li.*) FROM invoice_line_items li WHERE li.invoice_id = i.id) as line_items
          FROM invoices i
          LEFT JOIN clients c ON i.client_id = c.id
          WHERE i.id = $1
        `, [entityId]);
        return rows[0];
      }
      default:
        return undefined;
    }
  } catch (error) {
    logger.error('Error fetching context data', { error, type, entityId });
    return undefined;
  }
}

// Chat endpoint
router.post('/chat', asyncHandler(async (req, res) => {
  const { messages, context, options } = chatSchema.parse(req.body);
  
  // Fetch context data if entityId provided
  const contextData = await getContextData(context.type, context.entityId);
  
  const aiContext: AIContext = {
    type: context.type,
    data: contextData,
  };
  
  // Convert messages to AI format
  const aiMessages: AIMessage[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));
  
  const response = await aiService.chat(aiMessages, aiContext, options);
  
  res.json({ response });
}));

// Streaming chat endpoint
router.post('/chat/stream', asyncHandler(async (req, res) => {
  const { messages, context, options } = chatSchema.parse(req.body);
  
  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  // Fetch context data if entityId provided
  const contextData = await getContextData(context.type, context.entityId);
  
  const aiContext: AIContext = {
    type: context.type,
    data: contextData,
  };
  
  // Convert messages to AI format
  const aiMessages: AIMessage[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));
  
  try {
    for await (const chunk of aiService.streamChat(aiMessages, aiContext, options)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
  }
  
  res.end();
}));

// Draft email endpoint
router.post('/draft-email', asyncHandler(async (req, res) => {
  const { context, purpose, tone } = draftEmailSchema.parse(req.body);
  
  const contextData = await getContextData(context.type, context.entityId);
  
  const aiContext: AIContext = {
    type: context.type,
    data: contextData,
  };
  
  const email = await aiService.draftEmail(aiContext, purpose, tone);
  
  res.json({ email });
}));

// Suggest actions endpoint
router.post('/suggest-actions', asyncHandler(async (req, res) => {
  const { context } = suggestActionsSchema.parse(req.body);
  
  const contextData = await getContextData(context.type, context.entityId);
  
  const aiContext: AIContext = {
    type: context.type,
    data: contextData,
  };
  
  const actions = await aiService.suggestActions(aiContext);
  
  res.json({ actions });
}));

// Generate description endpoint
router.post('/generate-description', asyncHandler(async (req, res) => {
  const { context, itemType, details } = generateDescriptionSchema.parse(req.body);
  
  const contextData = await getContextData(context.type, context.entityId);
  
  const aiContext: AIContext = {
    type: context.type,
    data: contextData,
  };
  
  const description = await aiService.generateDescription(aiContext, itemType, details);
  
  res.json({ description });
}));

// Quick actions for specific contexts
router.post('/client/:id/draft-followup', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { purpose } = z.object({ purpose: z.string().optional() }).parse(req.body);
  
  const contextData = await getContextData('client', id);
  if (!contextData) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  const aiContext: AIContext = {
    type: 'client',
    data: contextData,
  };
  
  const email = await aiService.draftEmail(
    aiContext,
    purpose || 'Follow up with client to check in and discuss potential new projects',
    'friendly'
  );
  
  res.json({ email });
}));

router.post('/invoice/:id/draft-reminder', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { urgency } = z.object({ 
    urgency: z.enum(['gentle', 'firm', 'final']).optional() 
  }).parse(req.body);
  
  const contextData = await getContextData('invoice', id);
  if (!contextData) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  
  const aiContext: AIContext = {
    type: 'invoice',
    data: contextData,
  };
  
  const purposes: Record<string, string> = {
    gentle: 'Send a friendly payment reminder for the invoice',
    firm: 'Send a firm reminder about the overdue invoice',
    final: 'Send a final notice about the significantly overdue invoice before taking further action',
  };
  
  const tones: Record<string, 'friendly' | 'formal' | 'firm'> = {
    gentle: 'friendly',
    firm: 'formal',
    final: 'firm',
  };
  
  const level = urgency || 'gentle';
  const email = await aiService.draftEmail(aiContext, purposes[level], tones[level]);
  
  res.json({ email });
}));

router.post('/estimate/:id/improve', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const contextData = await getContextData('estimate', id);
  if (!contextData) {
    return res.status(404).json({ error: 'Estimate not found' });
  }
  
  const aiContext: AIContext = {
    type: 'estimate',
    data: contextData,
  };
  
  const messages: AIMessage[] = [
    {
      role: 'user',
      content: 'Review this estimate and suggest improvements. Consider: pricing competitiveness, description clarity, missing line items, and overall presentation. Provide specific, actionable suggestions.',
    },
  ];
  
  const suggestions = await aiService.chat(messages, aiContext);
  
  res.json({ suggestions });
}));

router.post('/project/:id/next-steps', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const contextData = await getContextData('project', id);
  if (!contextData) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const aiContext: AIContext = {
    type: 'project',
    data: contextData,
  };
  
  const actions = await aiService.suggestActions(aiContext);
  
  res.json({ actions });
}));

export default router;
