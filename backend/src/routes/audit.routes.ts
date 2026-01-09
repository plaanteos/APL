import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AuditController } from '../controllers/audit.controller';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/audit/dashboard - Dashboard con todas las métricas
router.get('/dashboard', authorize('ADMIN'), AuditController.getDashboard);

// GET /api/audit/suspicious - Detectar actividad sospechosa
router.get('/suspicious', authorize('ADMIN'), AuditController.getSuspiciousActivity);

// GET /api/audit/timeline - Timeline de actividad
router.get('/timeline', authorize('ADMIN'), AuditController.getActivityTimeline);

// GET /api/audit/entity-history/:type/:id - Historial de una entidad específica
router.get('/entity-history/:type/:id', authorize('ADMIN'), AuditController.getEntityHistory);

// GET /api/audit/stats (accessible to all authenticated users)
router.get('/stats', AuditController.getAuditStats);

// GET /api/audit/export (admin only)
router.get('/export', authorize('ADMIN'), AuditController.exportAuditLogs);

// DELETE /api/audit/cleanup (admin only)
router.delete('/cleanup', authorize('ADMIN'), AuditController.cleanupOldLogs);

// GET /api/audit (admin only for full access, users can see their own)
router.get('/', authorize('ADMIN'), AuditController.getAuditLogs);

// GET /api/audit/:id (admin only)
router.get('/:id', authorize('ADMIN'), AuditController.getAuditLogById);

// GET /api/audit/user/:userId (admin can see any user, users can only see themselves)
router.get('/user/:userId', (req, res, next) => {
  const currentUserId = (req as any).user?.id;
  const requestedUserId = req.params.userId;
  const userRole = (req as any).user?.role;

  // Admins can see any user, users can only see themselves
  if (userRole === 'ADMIN' || currentUserId === requestedUserId) {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'No tienes permisos para ver los logs de este usuario',
    });
  }
}, AuditController.getAuditLogsByUser);

// GET /api/audit/entity/:entityType/:entityId (admin only)
router.get('/entity/:entityType/:entityId', authorize('ADMIN'), AuditController.getAuditLogsByEntity);

export default router;