import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// POST /api/auth/login
router.post('/login', AuthController.login);

// POST /api/auth/register
router.post('/register', AuthController.register);

// POST /api/auth/logout (requiere autenticación)
router.post('/logout', authenticate, AuthController.logout);

// GET /api/auth/me (requiere autenticación)
router.get('/me', authenticate, AuthController.me);

// PUT /api/auth/change-password (requiere autenticación)
router.put('/change-password', authenticate, AuthController.changePassword);

export default router;