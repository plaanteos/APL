import { Router } from 'express';
import { ProductoController } from '../controllers/producto.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Todas las rutas de productos requieren autenticación
router.use(authMiddleware);

// GET /api/productos - Listar productos
router.get('/', ProductoController.getProductos);

// GET /api/productos/stats - Estadísticas de productos
router.get('/stats', ProductoController.getProductosStats);

// GET /api/productos/:id - Obtener producto por ID
router.get('/:id', ProductoController.getProductoById);

// POST /api/productos - Crear nuevo producto
router.post('/', ProductoController.createProducto);

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', ProductoController.updateProducto);

// DELETE /api/productos/:id - Eliminar producto
router.delete('/:id', ProductoController.deleteProducto);

export default router;
