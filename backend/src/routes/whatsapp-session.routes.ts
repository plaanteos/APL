import express from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller';
import { authenticate } from '../middleware/auth';
import { validateWhatsAppOwnership, whatsappRateLimiter } from '../middleware/whatsapp-auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

/**
 * REST API para conectar WhatsApp multi-usuario con aislamiento estricto
 */

// GET /connect - Inicia conexión vía SSE (EventSource usa GET) con validación de dueño
router.get('/connect', authenticate, validateWhatsAppOwnership, asyncHandler(WhatsAppController.connect));

// GET /api/whatsapp/status/:userId - Consulta estado de conexión (aislamiento)
router.get('/status/:userId', authenticate, validateWhatsAppOwnership, asyncHandler(WhatsAppController.getStatus));

// DELETE /api/whatsapp/disconnect/:userId - Desconecta solo si es el dueño
router.delete('/disconnect/:userId', authenticate, validateWhatsAppOwnership, asyncHandler(WhatsAppController.disconnect));

// POST /api/whatsapp/send - Envío con Rate Limit y validación de dueño
router.post('/send', authenticate, validateWhatsAppOwnership, whatsappRateLimiter, asyncHandler(WhatsAppController.send));

export default router;
