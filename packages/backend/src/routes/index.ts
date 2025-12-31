import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import clientRoutes from './clients.js';
import projectRoutes from './projects.js';
import estimateRoutes from './estimates.js';
import invoiceRoutes from './invoices.js';
import dashboardRoutes from './dashboard.js';
import aiRoutes from './ai.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/clients', clientRoutes);
router.use('/projects', projectRoutes);
router.use('/estimates', estimateRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    },
  });
});

export default router;
