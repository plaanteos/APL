import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { PaymentController } from '../controllers/payment.controller';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/payments/stats
router.get('/stats', PaymentController.getPaymentStats);

// GET /api/payments/balance
router.get('/balance', PaymentController.getBalance);

// GET /api/payments/order/:orderId
router.get('/order/:orderId', PaymentController.getPaymentsByOrder);

// GET /api/payments
router.get('/', PaymentController.getPayments);

// POST /api/payments
router.post('/', PaymentController.createPayment);

// GET /api/payments/:id
router.get('/:id', PaymentController.getPaymentById);

// PUT /api/payments/:id
router.put('/:id', PaymentController.updatePayment);

// DELETE /api/payments/:id (only admins)
router.delete('/:id', authorize('ADMIN'), PaymentController.deletePayment);

export default router;