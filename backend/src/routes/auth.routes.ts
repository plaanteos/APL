import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// POST /api/auth/login
router.post('/login', asyncHandler(AuthController.login));

// POST /api/auth/register
router.post('/register', asyncHandler(AuthController.register));

// POST /api/auth/refresh - Renovar access token
router.post('/refresh', asyncHandler(AuthController.refresh));

// POST /api/auth/logout (requiere autenticación)
router.post('/logout', authenticate, asyncHandler(AuthController.logout));

// GET /api/auth/me (requiere autenticación)
router.get('/me', authenticate, asyncHandler(AuthController.me));

// PUT /api/auth/change-password (requiere autenticación)
router.put('/change-password', authenticate, asyncHandler(AuthController.changePassword));

// POST /api/auth/forgot-password
router.post('/forgot-password', asyncHandler(AuthController.forgotPassword));

// POST /api/auth/verify-reset-code
router.post('/verify-reset-code', asyncHandler(AuthController.verifyResetCode));

// POST /api/auth/reset-password
router.post('/reset-password', asyncHandler(AuthController.resetPassword));

// 2FA (requiere autenticación)
router.post('/2fa/setup', authenticate, asyncHandler(AuthController.setupTwoFactor));
router.post('/2fa/enable', authenticate, asyncHandler(AuthController.enableTwoFactor));
router.post('/2fa/disable', authenticate, asyncHandler(AuthController.disableTwoFactor));

export default router;