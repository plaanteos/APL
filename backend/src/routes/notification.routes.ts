import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// POST /api/notifications/send (requiere autenticación)
router.post('/send', authenticate, asyncHandler(NotificationController.send));

export default router;
