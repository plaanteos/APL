import express from 'express';
import { authenticate } from '../middleware/auth';
import { SearchController } from '../controllers/search.controller';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/search/global - Búsqueda global en todas las entidades
router.get('/global', SearchController.globalSearch);

// GET /api/search/clientes - Búsqueda avanzada de clientes
router.get('/clientes', SearchController.searchClientes);

// GET /api/search/pedidos - Búsqueda avanzada de pedidos
router.get('/pedidos', SearchController.searchPedidos);

// GET /api/search/pagos - Búsqueda avanzada de pagos
router.get('/pagos', SearchController.searchPagos);

// GET /api/search/pedidos-with-stats - Búsqueda de pedidos con estadísticas
router.get('/pedidos-with-stats', SearchController.searchPedidosWithStats);

// GET /api/search/pedidos-proximos-vencer - Pedidos próximos a vencer
router.get('/pedidos-proximos-vencer', SearchController.getPedidosProximosVencer);

// GET /api/search/clientes-con-deuda - Clientes con deuda pendiente
router.get('/clientes-con-deuda', SearchController.getClientesConDeuda);

export default router;
