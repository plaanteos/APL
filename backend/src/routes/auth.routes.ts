import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// POST /api/auth/login
router.post('/login', AuthController.login);

// POST /api/auth/register
router.post('/register', AuthController.register);

// POST /api/auth/refresh - Renovar access token
router.post('/refresh', AuthController.refresh);

// POST /api/auth/logout (requiere autenticación)
router.post('/logout', authenticate, AuthController.logout);

// GET /api/auth/me (requiere autenticación)
router.get('/me', authenticate, AuthController.me);

// PUT /api/auth/change-password (requiere autenticación)
router.put('/change-password', authenticate, AuthController.changePassword);

// POST /api/auth/forgot-password
router.post('/forgot-password', AuthController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', AuthController.resetPassword);

// 2FA (requiere autenticación)
router.post('/2fa/setup', authenticate, AuthController.setupTwoFactor);
router.post('/2fa/enable', authenticate, AuthController.enableTwoFactor);
router.post('/2fa/disable', authenticate, AuthController.disableTwoFactor);

export default router;