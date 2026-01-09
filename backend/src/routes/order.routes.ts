import express from 'express';
import { authenticate } from '../middleware/auth';
import { OrderController } from '../controllers/order.controller';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/orders/stats
router.get('/stats', OrderController.getOrdersStats);

// GET /api/orders
router.get('/', OrderController.getOrders);

// POST /api/orders
router.post('/', OrderController.createOrder);

// GET /api/orders/:id
router.get('/:id', OrderController.getOrderById);

// PUT /api/orders/:id
router.put('/:id', OrderController.updateOrder);

// PATCH /api/orders/:id/status
router.patch('/:id/status', OrderController.updateOrderStatus);

// DELETE /api/orders/:id
router.delete('/:id', OrderController.deleteOrder);

export default router;