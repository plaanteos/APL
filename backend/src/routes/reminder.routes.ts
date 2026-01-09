import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { ReminderController } from '../controllers/reminder.controller';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/reminders/pending - Obtener recordatorios pendientes
router.get('/pending', ReminderController.getPendingReminders);

// GET /api/reminders/today - Obtener recordatorios de hoy
router.get('/today', ReminderController.getTodayReminders);

// GET /api/reminders/stats - Estadísticas de recordatorios
router.get('/stats', ReminderController.getStatistics);

// POST /api/reminders/auto/due-pedidos - Crear recordatorios automáticos para pedidos
router.post('/auto/due-pedidos', authorize('ADMIN'), ReminderController.createAutomaticRemindersForDuePedidos);

// POST /api/reminders/auto/pending-payments - Crear recordatorios automáticos para pagos
router.post('/auto/pending-payments', authorize('ADMIN'), ReminderController.createAutomaticRemindersForPendingPayments);

// POST /api/reminders/check - Verificar recordatorios pendientes manualmente
router.post('/check', authorize('ADMIN'), ReminderController.checkPendingReminders);

// GET /api/reminders - Listar todos los recordatorios con filtros
router.get('/', ReminderController.getReminders);

// POST /api/reminders - Crear recordatorio
router.post('/', ReminderController.createReminder);

// GET /api/reminders/:id - Obtener recordatorio por ID
router.get('/:id', ReminderController.getReminderById);

// PUT /api/reminders/:id - Actualizar recordatorio
router.put('/:id', ReminderController.updateReminder);

// PATCH /api/reminders/:id/complete - Marcar como completado
router.patch('/:id/complete', ReminderController.completeReminder);

// PATCH /api/reminders/:id/cancel - Cancelar recordatorio
router.patch('/:id/cancel', ReminderController.cancelReminder);

// DELETE /api/reminders/:id - Eliminar recordatorio
router.delete('/:id', ReminderController.deleteReminder);

export default router;
