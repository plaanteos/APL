# ✅ CHECKLIST DE MEJORAS - SISTEMA APL
## Priorización: Backend → Frontend-Backend → Validaciones → BD

---

## 🔴 FASE 1: BACKEND (2-3 semanas)

### Seguridad y Autenticación
- [x] **Implementar rate limiting en /api/auth/login** ✅
  - Instalar: `npm install express-rate-limit`
  - Configurar: 5 intentos cada 15 minutos
  - Archivo: `backend/src/index.ts`

- [x] **Agregar endpoint de cambio de contraseña** ✅ (Ya estaba implementado)
  - Crear: `POST /api/auth/change-password`
  - Validar contraseña antigua
  - Hash nueva contraseña con bcryptjs
  - Registrar en auditoría
  - Archivo: `backend/src/controllers/auth.controller.ts`

- [x] **Implementar refresh tokens** ✅
  - Crear tabla `RefreshToken` en schema
  - Endpoint: `POST /api/auth/refresh`
  - Expiración: Access token 1h, Refresh token 7d

- [x] **Registrar intentos de login fallidos en auditoría** ✅
  - Modificar `auth.controller.ts` línea ~70
  - Llamar a `AuditService.log()` en catch del login

### Paginación y Optimización
- [x] **Implementar paginación en GET /api/orders** ✅ (Ya estaba implementado)
  - Parámetros: `?page=1&limit=20`
  - Response con metadata: `{ items: [], pagination: {...} }`
  - Archivo: `backend/src/controllers/order.controller.ts`

- [x] **Implementar paginación en GET /api/clients** ✅ (Ya estaba implementado)
  - Mismos parámetros que orders
  - Archivo: `backend/src/controllers/client.controller.ts`

- [x] **Implementar paginación en GET /api/payments** ✅ (Ya estaba implementado)
  - Archivo: `backend/src/controllers/payment.controller.ts`

- [x] **Implementar paginación en GET /api/audit** ✅ (Ya estaba implementado)
  - Archivo: `backend/src/controllers/audit.controller.ts`

### Validaciones de Negocio
- [x] **Validar monto de pago no exceda deuda pendiente** ✅ (Ya estaba implementado)
  - Archivo: `backend/src/controllers/payment.controller.ts`
  - En `createPayment()` antes de `prisma.pago.create()`

- [x] **Validar fecha de vencimiento > fecha de pedido** ✅
  - Archivo: `backend/src/controllers/order.controller.ts`
  - En validación Zod con refine()

- [x] **Prevenir eliminación de clientes con pedidos pendientes** ✅ (Ya estaba implementado)
  - Archivo: `backend/src/controllers/client.controller.ts`
  - En `deleteClient()`

- [x] **Validar cantidad y precio positivos en pedidos** ✅
  - Agregado a schema Zod en `order.controller.ts`:
  ```typescript
  cantidad: z.number().positive(),
  precioUnitario: z.number().positive(),
  ```

### Endpoints Faltantes
- [x] **Crear endpoint PATCH /api/orders/:id/deliver** ✅
  - Marcar pedido como ENTREGADO
  - Registrar en auditoría
  - Archivo: `backend/src/controllers/order.controller.ts`
  - Route: `backend/src/routes/order.routes.ts`

- [x] **Crear endpoint GET /api/orders/:id/balance** ✅
  - Devolver balance de un pedido específico
  - Incluir pagos relacionados

- [x] **Crear endpoint GET /api/clients/:id/balance** ✅
  - Balance completo del cliente
  - Total pedidos, pagado, pendiente
  - Archivo: `backend/src/controllers/client.controller.ts`

### Logging y Monitoreo
- [x] **Implementar logging estructurado con Winston** ✅
  - Instalar: `npm install winston`
  - Configurar: `backend/src/utils/logger.ts`
  - Niveles: error, warn, info, debug
  - Archivos: `error.log`, `combined.log`

- [x] **Agregar middleware de logging de requests** ✅
  - Log de todas las peticiones HTTP
  - Incluir: método, ruta, status, tiempo de respuesta
  - Archivo: `backend/src/middleware/logger.ts`

- [x] **Logging de errores no controlados** ✅
  - Process handlers para uncaughtException y unhandledRejection
  - Archivo: `backend/src/index.ts`

### Manejo de Errores
- [x] **Crear middleware global de manejo de errores mejorado** ✅
  - Distinguir errores operacionales vs programáticos
  - Response estructurado con códigos de error
  - No exponer stack traces en producción
  - Archivo: `backend/src/middleware/errorHandler.ts`

- [x] **Agregar validación de variables de entorno** ✅
  - Archivo: `backend/src/utils/validateEnv.ts`
  - Validar: DATABASE_URL, JWT_SECRET, PORT, etc.
  - Ejecutar al iniciar: `backend/src/index.ts`

---

## 🟡 FASE 2: INTEGRACIÓN FRONTEND-BACKEND (2 semanas)

### Eliminación de Mock Data
- [ ] **Eliminar imports de mockData en Balance.tsx**
  - Línea 11: `import { mockClients, mockOrders } from "../data/mockData"`
  - Reemplazar con llamadas a API
  - Archivo: `figma/src/app/components/Balance.tsx`

- [ ] **Eliminar imports de mockData en Clients.tsx**
  - Línea 5: `import { mockClients } from "../data/mockData"`
  - Usar `clientService.getAllClients()`
  - Archivo: `figma/src/app/components/Clients.tsx`

- [ ] **Eliminar imports de mockData en Orders.tsx**
  - Línea 5: `import { mockOrders } from "../data/mockData"`
  - Usar `orderService.getAllOrders()`
  - Archivo: `figma/src/app/components/Orders.tsx`

- [ ] **Actualizar Dashboard.tsx para usar datos reales**
  - Calcular totales desde API, no mock
  - Archivo: `figma/src/app/components/Dashboard.tsx`

### Servicios Frontend (Paginación)
- [ ] **Actualizar orderService para soportar paginación**
  ```typescript
  getAllOrders(page = 1, limit = 20) {
    return apiClient.get(`/orders?page=${page}&limit=${limit}`);
  }
  ```
  - Archivo: `figma/src/services/order.service.ts`

- [ ] **Actualizar clientService para soportar paginación**
  - Archivo: `figma/src/services/client.service.ts`

- [ ] **Actualizar paymentService para soportar paginación**
  - Archivo: `figma/src/services/payment.service.ts`

### Componentes Frontend (Paginación UI)
- [ ] **Agregar paginación a Orders.tsx**
  - Botones Previous/Next
  - Indicador de página actual
  - Total de páginas

- [ ] **Agregar paginación a Clients.tsx**
  - Misma UI que Orders

- [ ] **Agregar paginación a Balance.tsx**
  - Para lista de pedidos del cliente

### Estado de Carga
- [ ] **Agregar spinners en Balance.tsx**
  - Usar `<Loader2 className="animate-spin" />` de lucide-react
  - Mostrar mientras `isLoading === true`

- [ ] **Agregar spinners en Orders.tsx**
  - Durante fetch inicial y paginación

- [ ] **Agregar spinners en Clients.tsx**
  - Durante fetch inicial

- [ ] **Agregar spinners en Dashboard.tsx**
  - Mientras cargan métricas

### Nuevos Endpoints Frontend
- [ ] **Implementar orderService.markAsDelivered()**
  ```typescript
  markAsDelivered(orderId: string) {
    return apiClient.patch(`/orders/${orderId}/deliver`);
  }
  ```
  - Archivo: `figma/src/services/order.service.ts`

- [ ] **Implementar clientService.getBalance()**
  ```typescript
  getBalance(clientId: string) {
    return apiClient.get(`/clients/${clientId}/balance`);
  }
  ```
  - Archivo: `figma/src/services/client.service.ts`

### Botón "Marcar como Entregado"
- [ ] **Agregar botón en Balance.tsx**
  - Solo visible si pedido no está entregado
  - Confirmar con AlertDialog antes de marcar
  - Refrescar datos después de marcar
  - Archivo: `figma/src/app/components/Balance.tsx` (línea ~300)

---

## 🟢 FASE 3: VALIDACIONES FRONTEND (1 semana)

### Validación de Formularios
- [ ] **Instalar Zod en frontend**
  ```bash
  cd figma && npm install zod
  ```

- [ ] **Validar formulario NewClientDialog**
  - Email válido
  - Teléfono formato correcto
  - Campos requeridos
  - Archivo: `figma/src/app/components/NewClientDialog.tsx`

- [ ] **Validar formulario NewOrderDialog**
  - Fecha vencimiento > hoy
  - Cantidad > 0
  - Precio > 0
  - Archivo: `figma/src/app/components/NewOrderDialog.tsx`

- [ ] **Validar formulario PaymentDialog**
  - Monto > 0
  - Monto <= deuda pendiente (validar en frontend también)
  - Archivo: `figma/src/app/components/PaymentDialog.tsx`

- [ ] **Validar formulario Login**
  - Email formato válido
  - Contraseña mínimo 6 caracteres
  - Archivo: `figma/src/app/components/Login.tsx`

### Feedback de Errores
- [ ] **Mostrar errores específicos de validación backend**
  - En lugar de genérico "Error al crear"
  - Parsear `error.response.data.error` del backend
  - Mostrar con toast.error() detallado

- [ ] **Agregar mensajes de confirmación**
  - Al crear cliente: "Cliente [nombre] creado exitosamente"
  - Al crear pedido: "Pedido [numero] creado"
  - Al marcar entregado: "Pedido marcado como entregado"

### UX Improvements
- [ ] **Deshabilitar botones durante operaciones async**
  - Prevenir doble click
  - Botones de envío en formularios

- [ ] **Agregar indicadores de campos requeridos**
  - Asterisco (*) en labels
  - Mensaje "Campo requerido" si está vacío

- [ ] **Implementar debounce en búsquedas**
  - Si se agrega funcionalidad de búsqueda
  - Esperar 300ms antes de hacer request

### Credenciales de Prueba
- [ ] **Eliminar credenciales hardcodeadas del código**
  - Login.tsx líneas 12-13
  - Remover valores default de useState
  - Mantener solo en sección "Credenciales de prueba" visual

---

## 🔵 FASE 4: BASE DE DATOS (En desarrollo por otro sector)

### Triggers (PostgreSQL)
- [ ] **Trigger: Actualizar montoPagado automáticamente**
  - Archivo: `backend/prisma/migrations/XXX_add_triggers.sql`
  ```sql
  CREATE OR REPLACE FUNCTION actualizar_monto_pedido()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE pedidos SET 
      montoPagado = (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE pedidoId = NEW.pedidoId),
      montoPendiente = montoTotal - montoPagado,
      estado = CASE 
        WHEN montoPendiente <= 0 THEN 'PAGADO'::estadopedido
        ELSE estado 
      END
    WHERE id = NEW.pedidoId;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  
  CREATE TRIGGER trg_actualizar_monto_pedido
  AFTER INSERT OR UPDATE OR DELETE ON pagos
  FOR EACH ROW EXECUTE FUNCTION actualizar_monto_pedido();
  ```

- [ ] **Trigger: Auditoría automática en UPDATE de clientes**
- [ ] **Trigger: Auditoría automática en UPDATE de pedidos**
- [ ] **Trigger: Validar fechas antes de INSERT/UPDATE**

### Índices
- [ ] **Crear índices críticos**
  ```sql
  CREATE INDEX CONCURRENTLY idx_pedidos_cliente_estado ON pedidos(clienteId, estado);
  CREATE INDEX CONCURRENTLY idx_pedidos_fecha_venc ON pedidos(fechaVencimiento);
  CREATE INDEX CONCURRENTLY idx_pagos_pedido ON pagos(pedidoId);
  CREATE INDEX CONCURRENTLY idx_auditoria_timestamp ON auditoria(timestamp DESC);
  CREATE INDEX CONCURRENTLY idx_clientes_email ON clientes(email);
  CREATE INDEX CONCURRENTLY idx_clientes_activo ON clientes(activo) WHERE activo = true;
  ```

### Constraints
- [ ] **Agregar CHECK constraints**
  ```sql
  ALTER TABLE pedidos ADD CONSTRAINT chk_monto_positivo CHECK (montoTotal > 0);
  ALTER TABLE pedidos ADD CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0);
  ALTER TABLE pagos ADD CONSTRAINT chk_monto_pago_positivo CHECK (monto > 0);
  ```

### Normalización
- [ ] **Eliminar campos calculados redundantes**
  - Remover `montoPagado` de schema Pedido
  - Remover `montoPendiente` de schema Pedido
  - Calcular dinámicamente en queries
  - **NOTA:** Esto romperá código existente, refactorizar controllers primero

---

## 🟣 FASE 5: PRODUCCIÓN (1 semana)

### Configuración de Producción
- [ ] **Actualizar Build Command en Render**
  ```bash
  npm ci --include=dev && npx prisma generate && npx prisma db push && npm run create-admin && npm run db:seed
  ```

- [ ] **Configurar variable VITE_API_URL en Netlify**
  - Valor: `https://apl-dy4z.onrender.com/api`

- [ ] **Aumentar timeout de axios a 90 segundos**
  - Ya implementado en `figma/src/services/api.ts`
  - ✅ Verificar que esté en producción

- [ ] **Verificar variables de entorno en Render**
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CORS_ORIGIN=https://administracionapl.netlify.app`
  - `NODE_ENV=production`

### Testing Básico
- [ ] **Tests E2E críticos**
  - Login exitoso
  - Crear cliente
  - Crear pedido
  - Registrar pago
  - Ver balance

- [ ] **Tests de carga**
  - Verificar rendimiento con 1000+ registros

### Monitoreo
- [ ] **Configurar Sentry para error tracking**
  - Frontend: `npm install @sentry/react`
  - Backend: `npm install @sentry/node`

- [ ] **Configurar health checks en Render**
  - Endpoint: `/health`
  - Frecuencia: cada 5 minutos

---

## 📊 MÉTRICAS DE PROGRESO

### Fase 1: Backend
- **Total tareas:** 21
- **Completadas:** 21 ✅
- **Progreso:** 100% 🎉

### Fase 2: Frontend-Backend
- **Total tareas:** 17
- **Completadas:** 0
- **Progreso:** 0%

### Fase 3: Validaciones
- **Total tareas:** 13
- **Completadas:** 0
- **Progreso:** 0%

### Fase 4: Base de Datos
- **Total tareas:** 8
- **Completadas:** 0
- **Progreso:** 0%

### Fase 5: Producción
- **Total tareas:** 8
- **Completadas:** 0
- **Progreso:** 0%

---

## 🎯 PROGRESO TOTAL: 21/67 (31%)

---

## 📝 NOTAS

- Actualizar este checklist a medida que se completan tareas
- Hacer commit después de cada tarea completada
- Probar localmente antes de desplegar a producción
- Documentar cualquier decisión técnica importante
- Si una tarea bloquea otra, marcar dependencia

---

**Última actualización:** 13 de enero de 2026
