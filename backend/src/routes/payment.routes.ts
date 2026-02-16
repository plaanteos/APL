import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { PaymentController } from '../controllers/payment.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/payments/stats - Estadísticas de pagos
router.get('/stats', asyncHandler(PaymentController.getPaymentsStats));

// GET /api/payments - Listar pagos
router.get('/', asyncHandler(PaymentController.getPayments));

// POST /api/payments - Crear pago y aplicar a pedidos
router.post('/', asyncHandler(PaymentController.createPayment));

// GET /api/payments/:id - Obtener pago por ID
router.get('/:id', asyncHandler(PaymentController.getPaymentById));

// PUT /api/payments/:id - Actualizar pago
router.put('/:id', asyncHandler(PaymentController.updatePayment));

// DELETE /api/payments/:id - Eliminar pago
router.delete('/:id', asyncHandler(PaymentController.deletePayment));

export default router;