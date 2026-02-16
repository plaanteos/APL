import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { OrderController } from '../controllers/order.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/orders/stats - Estadísticas
router.get('/stats', asyncHandler(OrderController.getOrdersStats));

// GET /api/orders - Listar pedidos
router.get('/', asyncHandler(OrderController.getOrders));

// POST /api/orders - Crear pedido
router.post('/', asyncHandler(OrderController.createOrder));

// GET /api/orders/:id - Obtener pedido por ID
router.get('/:id', asyncHandler(OrderController.getOrderById));

// PUT /api/orders/:id - Actualizar pedido
router.put('/:id', asyncHandler(OrderController.updateOrder));

// DELETE /api/orders/:id - Eliminar pedido (soft delete)
router.delete('/:id', asyncHandler(OrderController.deleteOrder));

// POST /api/orders/:id/detalles - Agregar detalle a pedido
router.post('/:id/detalles', asyncHandler(OrderController.addDetalle));

// PUT /api/orders/:id/detalles/:detalleId - Actualizar detalle
router.put('/:id/detalles/:detalleId', asyncHandler(OrderController.updateDetalle));

// DELETE /api/orders/:id/detalles/:detalleId - Eliminar detalle
router.delete('/:id/detalles/:detalleId', asyncHandler(OrderController.deleteDetalle));

// PATCH /api/orders/:id/deliver - Marcar como entregado
router.patch('/:id/deliver', asyncHandler(OrderController.markAsDelivered));

export default router;