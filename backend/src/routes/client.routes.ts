import express from 'express';
import { authenticate } from '../middleware/auth';
import { ClientController } from '../controllers/client.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/clients/stats
router.get('/stats', asyncHandler(ClientController.getClientsStats));

// GET /api/clients
router.get('/', asyncHandler(ClientController.getClients));

// POST /api/clients
router.post('/', asyncHandler(ClientController.createClient));

// GET /api/clients/:id
router.get('/:id', asyncHandler(ClientController.getClientById));

// GET /api/clients/:id/balance - Balance del cliente
router.get('/:id/balance', asyncHandler(ClientController.getClientBalance));

// GET /api/clients/:id/balance/export - Exportar balance a Excel
router.get('/:id/balance/export', asyncHandler(ClientController.exportBalanceToExcel));

// PUT /api/clients/:id
router.put('/:id', asyncHandler(ClientController.updateClient));

// DELETE /api/clients/:id
router.delete('/:id', asyncHandler(ClientController.deleteClient));

export default router;