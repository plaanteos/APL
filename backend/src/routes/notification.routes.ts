import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/notifications/send (requiere autenticación)
router.post('/send', authenticate, NotificationController.send);

export default router;
