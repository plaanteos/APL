import { Router } from 'express';
import { EstadoController } from '../controllers/estado.controller';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Todas las rutas de estados requieren autenticación
router.use(authMiddleware);

// GET /api/estados - Listar estados activos (catálogo)
router.get('/', asyncHandler(EstadoController.getEstados));

// GET /api/estados/stats - Estadísticas de estados
router.get('/stats', asyncHandler(EstadoController.getEstadosStats));

// GET /api/estados/:id - Obtener estado por ID
router.get('/:id', asyncHandler(EstadoController.getEstadoById));

// POST /api/estados - Crear nuevo estado (admin)
router.post('/', asyncHandler(EstadoController.createEstado));

// PUT /api/estados/:id - Actualizar estado
router.put('/:id', asyncHandler(EstadoController.updateEstado));

// DELETE /api/estados/:id - Eliminar estado (soft delete)
router.delete('/:id', asyncHandler(EstadoController.deleteEstado));

export default router;
