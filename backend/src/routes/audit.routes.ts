import express from 'express';
import { authMiddleware, requireSuperUser } from '../middleware/auth';
import { AuditController } from '../controllers/audit.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Autenticación requerida en todas las rutas
router.use(authMiddleware);

// GET /api/audit/stats - Estadísticas de auditoría (todos)
router.get('/stats', asyncHandler(AuditController.getAuditStats));

// GET /api/audit - Obtener logs de auditoría (todos)
router.get('/', asyncHandler(AuditController.getAuditLogs));

// DELETE /api/audit/cleanup - Limpiar logs antiguos (solo super usuarios)
router.delete('/cleanup', requireSuperUser(), asyncHandler(AuditController.cleanupOldLogs));

export default router;
