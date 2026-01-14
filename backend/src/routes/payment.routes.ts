import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { PaymentController } from '../controllers/payment.controller';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/payments/stats - Estadísticas de pagos
router.get('/stats', PaymentController.getPaymentsStats);

// GET /api/payments - Listar pagos
router.get('/', PaymentController.getPayments);

// POST /api/payments - Crear pago y aplicar a pedidos
router.post('/', PaymentController.createPayment);

// GET /api/payments/:id - Obtener pago por ID
router.get('/:id', PaymentController.getPaymentById);

// PUT /api/payments/:id - Actualizar pago
router.put('/:id', PaymentController.updatePayment);

// DELETE /api/payments/:id - Eliminar pago
router.delete('/:id', PaymentController.deletePayment);

export default router;