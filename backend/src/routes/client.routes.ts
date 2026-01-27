import express from 'express';
import { authenticate } from '../middleware/auth';
import { ClientController } from '../controllers/client.controller';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/clients/stats
router.get('/stats', ClientController.getClientsStats);

// GET /api/clients
router.get('/', ClientController.getClients);

// POST /api/clients
router.post('/', ClientController.createClient);

// GET /api/clients/:id
router.get('/:id', ClientController.getClientById);

// GET /api/clients/:id/balance - Balance del cliente
router.get('/:id/balance', ClientController.getClientBalance);

// GET /api/clients/:id/balance/export - Exportar balance a Excel
router.get('/:id/balance/export', ClientController.exportBalanceToExcel);

// PUT /api/clients/:id
router.put('/:id', ClientController.updateClient);

// DELETE /api/clients/:id
router.delete('/:id', ClientController.deleteClient);

export default router;