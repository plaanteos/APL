import { Router } from 'express';
import { EstadoController } from '../controllers/estado.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Todas las rutas de estados requieren autenticación
router.use(authMiddleware);

// GET /api/estados - Listar estados activos (catálogo)
router.get('/', EstadoController.getEstados);

// GET /api/estados/stats - Estadísticas de estados
router.get('/stats', EstadoController.getEstadosStats);

// GET /api/estados/:id - Obtener estado por ID
router.get('/:id', EstadoController.getEstadoById);

// POST /api/estados - Crear nuevo estado (admin)
router.post('/', EstadoController.createEstado);

// PUT /api/estados/:id - Actualizar estado
router.put('/:id', EstadoController.updateEstado);

// DELETE /api/estados/:id - Eliminar estado (soft delete)
router.delete('/:id', EstadoController.deleteEstado);

export default router;
