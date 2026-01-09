# 🚀 Nuevas Funcionalidades Backend - APL

## Resumen de Implementaciones

Este documento detalla las nuevas funcionalidades implementadas en el backend de APL Dental Laboratory.

---

## 1. 📊 Sistema de Auditoría Completo

### Características Implementadas

- **Servicio de Auditoría Ampliado** (`audit.service.ts`)
  - Métricas de rendimiento del sistema
  - Timeline de actividades
  - Comparación de actividad por usuarios
  - Historial de cambios por entidad
  - Detección de actividad sospechosa

- **Dashboard de Auditoría** 
  - Estadísticas en tiempo real
  - Gráficos de actividad temporal
  - Top usuarios más activos
  - Alertas de seguridad
  - Actividad reciente

### Nuevos Endpoints

```
GET /api/audit/dashboard?dias=30
GET /api/audit/suspicious
GET /api/audit/timeline?groupBy=day
GET /api/audit/entity-history/:type/:id
```

### Middleware de Auditoría Automática

El nuevo archivo `auditLogger.ts` proporciona middleware reutilizable para auditar automáticamente operaciones CRUD:

```typescript
import { auditClientCreate, auditOrderUpdate } from './middleware/auditLogger';

// En las rutas:
router.post('/clients', auditClientCreate, ClientController.create);
router.put('/orders/:id', auditOrderUpdate, OrderController.update);
```

Middlewares disponibles:
- `auditClientCreate/Update/Delete`
- `auditOrderCreate/Update/StatusChange/Delete`
- `auditPaymentCreate/Update/Delete`
- `auditAdminCreate/Update/Delete`

---

## 2. 🔍 Búsqueda Avanzada con Filtros Combinados

### Servicio de Búsqueda (`search.service.ts`)

Permite búsquedas complejas con múltiples filtros combinados:

#### Filtros Disponibles

**Generales:**
- `query`: Búsqueda de texto libre
- `fechaDesde` / `fechaHasta`: Rango de fechas
- `page` / `limit`: Paginación
- `orderBy` / `orderDirection`: Ordenamiento

**Clientes:**
- `tipoCliente`: CLINICA | ODONTOLOGO
- `clienteActivo`: true | false
- `ciudad`: Filtro por ciudad

**Pedidos:**
- `estadoPedido`: PENDIENTE | EN_PROCESO | ENTREGADO | PAGADO | CANCELADO
- `prioridad`: BAJA | NORMAL | ALTA | URGENTE
- `clienteId`: Filtrar por cliente específico
- `montoPendienteMin/Max`: Rango de monto pendiente
- `montoTotalMin/Max`: Rango de monto total

**Pagos:**
- `metodoPago`: EFECTIVO | TRANSFERENCIA | etc.
- `pedidoId`: Filtrar por pedido

### Endpoints de Búsqueda

```
GET /api/search/global?query=texto
GET /api/search/clientes?ciudad=Montevideo&tipoCliente=CLINICA
GET /api/search/pedidos?estadoPedido=PENDIENTE&prioridad=ALTA
GET /api/search/pagos?metodoPago=EFECTIVO&fechaDesde=2026-01-01
GET /api/search/pedidos-with-stats?estadoPedido=PENDIENTE
GET /api/search/pedidos-proximos-vencer?dias=7
GET /api/search/clientes-con-deuda
```

### Características Especiales

- **Búsqueda Global**: Busca en clientes, pedidos y pagos simultáneamente
- **Búsqueda con Estadísticas**: Retorna datos + métricas agregadas
- **Búsquedas Predefinidas**: Pedidos por vencer, clientes con deuda

---

## 3. 🔔 Sistema de Recordatorios Automáticos

### Modelo de Datos

Nuevo modelo `Recordatorio` en Prisma con:
- Tipos: VENCIMIENTO_PEDIDO, SEGUIMIENTO_CLIENTE, PAGO_PENDIENTE, REUNION, LLAMADA, OTRO
- Estados: PENDIENTE, COMPLETADO, CANCELADO, VENCIDO
- Recordatorios repetitivos (diario, semanal, mensual)
- Asignación a usuarios
- Prioridades

### Servicio de Recordatorios (`reminder.service.ts`)

#### Funcionalidades Automáticas

**Tareas Programadas (Cron Jobs):**

1. **Verificación de Recordatorios** (cada hora)
   - Verifica recordatorios próximos
   - Envía notificaciones

2. **Creación Automática para Pedidos** (diario a las 8am)
   - Detecta pedidos próximos a vencer (7 días)
   - Crea recordatorios automáticamente
   - Prioriza según urgencia

3. **Marcar Vencidos** (cada 6 horas)
   - Marca recordatorios pasados como vencidos

4. **Recordatorios de Pagos** (manual o programado)
   - Detecta pedidos con deuda > 30 días
   - Crea recordatorios de seguimiento

### Endpoints de Recordatorios

```
# Listar y filtrar
GET /api/reminders?estado=PENDIENTE&tipo=VENCIMIENTO_PEDIDO
GET /api/reminders/pending
GET /api/reminders/today
GET /api/reminders/stats

# CRUD
POST /api/reminders
GET /api/reminders/:id
PUT /api/reminders/:id
DELETE /api/reminders/:id

# Acciones
PATCH /api/reminders/:id/complete
PATCH /api/reminders/:id/cancel

# Automáticas (Admin only)
POST /api/reminders/auto/due-pedidos
POST /api/reminders/auto/pending-payments
POST /api/reminders/check
```

### Ejemplo de Uso

```typescript
// Crear recordatorio manual
POST /api/reminders
{
  "titulo": "Llamar a cliente",
  "descripcion": "Seguimiento del pedido #12345",
  "tipo": "LLAMADA",
  "tipoEntidad": "cliente",
  "entidadId": "cliente_id",
  "fechaRecordatorio": "2026-01-15T10:00:00Z",
  "prioridad": "ALTA",
  "repetir": true,
  "frecuencia": "semanal"
}
```

---

## 4. 🔧 Instalación y Configuración

### Instalar Dependencias

```bash
cd backend
npm install
```

Esto instalará la nueva dependencia `node-cron` necesaria para el sistema de recordatorios.

### Migración de Base de Datos

El nuevo modelo `Recordatorio` requiere una migración:

```bash
npm run db:generate
npm run db:migrate
```

Esto creará la tabla `recordatorios` con los campos necesarios.

### Variables de Entorno

No se requieren nuevas variables de entorno.

---

## 5. 📝 Documentación de API Actualizada

### Auditoría

- **Dashboard**: Vista completa con métricas, timeline y alertas
- **Actividad Sospechosa**: Detección automática de patrones inusuales
- **Timeline**: Visualización temporal de actividades
- **Historial de Entidad**: Ver todos los cambios de un registro

### Búsqueda

- **Global**: Buscar en todas las entidades a la vez
- **Filtros Combinados**: Múltiples criterios simultáneos
- **Estadísticas**: Búsquedas con métricas agregadas
- **Vistas Especiales**: Pedidos por vencer, deudas pendientes

### Recordatorios

- **Automáticos**: Sistema inteligente que crea recordatorios
- **Repetitivos**: Configurar frecuencias de repetición
- **Notificaciones**: Base para futuras notificaciones (email, SMS)
- **Dashboard**: Vista de recordatorios pendientes y de hoy

---

## 6. 🎯 Próximos Pasos Sugeridos

### Corto Plazo
- [ ] Implementar notificaciones por email para recordatorios
- [ ] Agregar webhooks para integraciones externas
- [ ] Dashboard web para visualizar auditoría y recordatorios

### Mediano Plazo
- [ ] Exportación de reportes a PDF/Excel
- [ ] Notificaciones push para aplicación móvil
- [ ] Sistema de permisos granular

### Largo Plazo
- [ ] Inteligencia artificial para predicción de demanda
- [ ] Análisis de patrones de comportamiento
- [ ] Integración con sistemas de facturación

---

## 7. 📊 Estructura de Archivos Nuevos

```
backend/
├── src/
│   ├── controllers/
│   │   ├── reminder.controller.ts (NUEVO)
│   │   ├── search.controller.ts (NUEVO)
│   │   └── audit.controller.ts (ACTUALIZADO)
│   ├── services/
│   │   ├── reminder.service.ts (NUEVO)
│   │   ├── search.service.ts (NUEVO)
│   │   └── audit.service.ts (ACTUALIZADO)
│   ├── middleware/
│   │   └── auditLogger.ts (NUEVO)
│   ├── routes/
│   │   ├── reminder.routes.ts (NUEVO)
│   │   ├── search.routes.ts (NUEVO)
│   │   └── audit.routes.ts (ACTUALIZADO)
│   └── index.ts (ACTUALIZADO)
├── prisma/
│   └── schema.prisma (ACTUALIZADO - nuevo modelo Recordatorio)
└── package.json (ACTUALIZADO - nueva dependencia node-cron)
```

---

## 8. 🧪 Testing

### Endpoints para Probar

```bash
# Auditoría Dashboard
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/audit/dashboard?dias=30

# Búsqueda Global
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/search/global?query=dental"

# Recordatorios Pendientes
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/reminders/pending

# Crear Recordatorio
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Test","tipo":"OTRO","tipoEntidad":"pedido","entidadId":"123","fechaRecordatorio":"2026-01-15T10:00:00Z"}' \
  http://localhost:3001/api/reminders
```

---

## 9. 💡 Consejos de Uso

### Auditoría
- Revisa el dashboard diariamente para detectar anomalías
- Configura alertas para actividad sospechosa
- Exporta logs regularmente para cumplimiento

### Búsqueda
- Combina múltiples filtros para búsquedas precisas
- Usa `pedidos-with-stats` para análisis de negocio
- Monitorea `pedidos-proximos-vencer` diariamente

### Recordatorios
- Deja que el sistema cree recordatorios automáticamente
- Configura recordatorios repetitivos para seguimientos
- Marca como completados cuando se resuelvan

---

## 10. 🐛 Troubleshooting

### El sistema de recordatorios no inicia
- Verifica que `node-cron` esté instalado
- Revisa los logs del servidor
- Asegúrate de tener permisos de ejecución

### Las migraciones fallan
- Ejecuta `npm run db:reset` (¡cuidado, borra datos!)
- Verifica la conexión a MySQL
- Revisa el archivo `.env`

### Búsqueda no retorna resultados
- Verifica que los filtros sean válidos
- Revisa que haya datos en la base
- Prueba sin filtros primero

---

## 📞 Soporte

Para dudas o problemas, contacta al equipo de desarrollo.

**Implementado:** Enero 2026  
**Versión Backend:** 1.0.0  
**Estado:** ✅ Producción Ready
