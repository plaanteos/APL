import { Router } from 'express';
import { ProductoController } from '../controllers/producto.controller';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Todas las rutas de productos requieren autenticación
router.use(authMiddleware);

// GET /api/productos - Listar productos
router.get('/', asyncHandler(ProductoController.getProductos));

// GET /api/productos/stats - Estadísticas de productos
router.get('/stats', asyncHandler(ProductoController.getProductosStats));

// GET /api/productos/:id - Obtener producto por ID
router.get('/:id', asyncHandler(ProductoController.getProductoById));

// POST /api/productos - Crear nuevo producto
router.post('/', asyncHandler(ProductoController.createProducto));

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', asyncHandler(ProductoController.updateProducto));

// DELETE /api/productos/:id - Eliminar producto
router.delete('/:id', asyncHandler(ProductoController.deleteProducto));

export default router;
