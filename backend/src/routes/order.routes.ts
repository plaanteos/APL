import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { OrderController } from '../controllers/order.controller';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/orders/stats - Estadísticas
router.get('/stats', OrderController.getOrdersStats);

// GET /api/orders - Listar pedidos
router.get('/', OrderController.getOrders);

// POST /api/orders - Crear pedido
router.post('/', OrderController.createOrder);

// GET /api/orders/:id - Obtener pedido por ID
router.get('/:id', OrderController.getOrderById);

// PUT /api/orders/:id - Actualizar pedido
router.put('/:id', OrderController.updateOrder);

// DELETE /api/orders/:id - Eliminar pedido (soft delete)
router.delete('/:id', OrderController.deleteOrder);

// POST /api/orders/:id/detalles - Agregar detalle a pedido
router.post('/:id/detalles', OrderController.addDetalle);

// PUT /api/orders/:id/detalles/:detalleId - Actualizar detalle
router.put('/:id/detalles/:detalleId', OrderController.updateDetalle);

// DELETE /api/orders/:id/detalles/:detalleId - Eliminar detalle
router.delete('/:id/detalles/:detalleId', OrderController.deleteDetalle);

export default router;