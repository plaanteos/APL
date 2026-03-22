import express from 'express';
import { authenticate } from '../middleware/auth';
import { ExpenseController } from '../controllers/expense.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/expenses - Listar gastos (con filtros opcionales)
router.get('/', asyncHandler(ExpenseController.getAll));

// GET /api/expenses/summary - Resumen por período
router.get('/summary', asyncHandler(ExpenseController.getSummary));

// POST /api/expenses - Crear gasto
router.post('/', asyncHandler(ExpenseController.create));

// DELETE /api/expenses/:id - Eliminar gasto
router.delete('/:id', asyncHandler(ExpenseController.delete));

export default router;
