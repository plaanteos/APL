# 📋 Checklist de Tareas Pendientes - APL Dental Lab

**Estado del Proyecto:** 86% Completo  
**Backend:** 95% ✅ | **Frontend:** 75% 🟡 | **Database:** 95% ✅ | **Mobile:** 0% ❌

---

## 🔥 PRIORIDAD CRÍTICA (Completar PRIMERO)

### 1. Frontend - Actualización de Tipos (4-6 horas) ✅ COMPLETADO
- [x] Actualizar `figma/src/app/types/index.ts`
  - [x] Cambiar todos los IDs de `string` a `number`
  - [x] Actualizar interface `IClient`: remover `whatsapp`, `tipo`, `direccion`
  - [x] Actualizar interface `IOrder`: agregar `fecha_delete`, usar `id_cliente: number`
  - [x] Actualizar interface `IPayment`: nuevo modelo simplificado
  - [x] Crear interface `IDetallePedido` (id, id_pedido, id_producto, cantidad, precio_unitario, paciente, id_estado)
  - [x] Crear interface `IDetallePago` (id, id_pago, id_pedido, valor)
  - [x] Crear interface `IProducto` (id, tipo, precio, id_administrador)
  - [x] Crear interface `IEstado` (id, descripcion, fecha_delete, id_administrador)
  - [x] Agregar tipos para cálculos dinámicos: `OrderWithCalculations`, `PaymentWithDetails`

### 2. Frontend - Actualización de Servicios (6-8 horas) ✅ COMPLETADO
- [x] Actualizar `figma/src/services/api.ts`
  - [x] Ajustar tipos base (IDs number)
  - [x] Actualizar manejadores de respuesta
  
- [x] Actualizar `figma/src/services/client.service.ts`
  - [x] Remover campos obsoletos (whatsapp, tipo, direccion)
  - [x] Ajustar IDs a number
  - [x] Actualizar métodos CRUD

- [x] Refactorizar `figma/src/services/order.service.ts`
  - [x] Implementar estructura con `detalles: IDetallePedido[]`
  - [x] Agregar métodos para manejo de detalles (addDetalle, updateDetalle, deleteDetalle)
  - [x] Implementar cálculos dinámicos (montoTotal, montoPagado, montoPendiente)
  - [x] Actualizar createOrder para soportar múltiples detalles

- [x] Refactorizar `figma/src/services/payment.service.ts`
  - [x] Implementar N:M con `detalles: IDetallePago[]`
  - [x] Agregar validaciones (prevenir sobrepago)
  - [x] Actualizar createPayment para múltiples pedidos
  - [x] Implementar getPaymentsByClient, getPaymentsByOrder

- [x] Crear `figma/src/services/producto.service.ts`
  - [x] getAll, getById, create, update, delete
  - [x] getProductoStats

- [x] Crear `figma/src/services/estado.service.ts`
  - [x] getAll, getById, create, update, softDelete
  - [x] getEstadoStats

### 3. Frontend - Actualización de Componentes (8-10 horas)

#### Componentes Críticos:
- [x] `figma/src/app/components/Balance.tsx` ✅ **(OVERHAUL COMPLETO)**
  - [x] Rediseñar para nuevo modelo de pagos (N:M via detalle_pago)
  - [x] Implementar vista de detalles por pedido
  - [x] Agregar filtros por cliente/pedido
  - [x] Mostrar cálculos dinámicos (montoPagado, montoPendiente)
  - [x] Agregar exportación a Excel

- [x] `figma/src/app/components/Orders.tsx` ✅
  - [x] Actualizar para estructura de detalles
  - [x] Mostrar tabla de detalles por pedido
  - [x] Integrar productos y estados
  - [x] Implementar cálculos dinámicos en tiempo real
  - [x] Agregar filtro por fecha_delete (soft delete)

- [x] `figma/src/app/components/Clients.tsx` ✅
  - [x] Remover campos obsoletos de formularios
  - [x] Actualizar tabla de visualización
  - [x] Ajustar validaciones
  - [x] Implementar búsqueda mejorada

#### Diálogos:
- [ ] `figma/src/app/components/NewOrderDialog.tsx`
  - [ ] Soportar múltiples detalles de pedido
  - [ ] Agregar selector de productos
  - [ ] Agregar selector de estados
  - [ ] Campos por detalle: cantidad, paciente, precio_unitario
  - [ ] Cálculo de total en tiempo real

- [ ] `figma/src/app/components/PaymentDialog.tsx`
  - [ ] Soportar múltiples pedidos en un solo pago
  - [ ] Distribución de valor entre pedidos
  - [ ] Validar que suma de detalles = valor del pago
  - [ ] Prevenir sobrepago por pedido

- [x] `figma/src/app/components/NewClientDialog.tsx` ✅
  - [x] Remover campos: whatsapp, tipo, direccion
  - [x] Ajustar validaciones
  - [x] Actualizar formulario

- [x] `figma/src/app/components/Dashboard.tsx` ✅
  - [x] Verificar que stats usen nuevo modelo
  - [x] Actualizar cálculo de totalRevenue (suma de pagos)
  - [x] Integrar gráficos con nuevos datos

---

## ⚡ PRIORIDAD ALTA (Completar SEGUNDO)

### 4. Backend - Endpoints Faltantes (2-3 horas)
- [ ] Agregar endpoint `PUT /api/orders/:id/deliver`
  - [ ] Actualizar fecha_entrega
  - [ ] Validar permisos
  - [ ] Log de auditoría

- [ ] Agregar endpoint `GET /api/clients/:id/balance/excel`
  - [ ] Generar reporte Excel con pagos del cliente
  - [ ] Incluir detalles de pedidos y pagos
  - [ ] Usar librería `exceljs` o similar

- [ ] Configurar endpoints para notificaciones
  - [ ] POST /api/reminders/whatsapp (enviar recordatorio WhatsApp)
  - [ ] POST /api/reminders/email (enviar recordatorio Email)
  - [ ] GET /api/reminders/pending (obtener pendientes)

### 5. Backend - Integraciones (4-6 horas)
- [ ] Configurar WhatsApp Business API
  - [ ] Instalar SDK (Twilio/WhatsApp Business)
  - [ ] Configurar credenciales en .env
  - [ ] Crear servicio whatsapp.service.ts
  - [ ] Implementar templates de mensajes

- [ ] Configurar Email (Nodemailer)
  - [ ] Instalar nodemailer
  - [ ] Configurar SMTP en .env (Gmail/SendGrid)
  - [ ] Crear servicio email.service.ts
  - [ ] Templates para recordatorios y notificaciones

### 6. Frontend - Componentes Adicionales (2-4 horas)
- [ ] Crear `figma/src/app/components/Productos.tsx`
  - [ ] CRUD de productos
  - [ ] Tabla con tipo y precio
  - [ ] Estadísticas de uso

- [ ] Crear `figma/src/app/components/Estados.tsx`
  - [ ] CRUD de estados
  - [ ] Soft delete support
  - [ ] Estadísticas por estado

- [ ] Crear `figma/src/app/components/Audit.tsx`
  - [ ] Vista de logs de auditoría
  - [ ] Filtros por usuario, acción, fecha
  - [ ] Función de limpieza de logs antiguos

---

## 🧪 PRIORIDAD MEDIA (Testing & Quality)

### 7. Testing Backend (4-6 horas)
- [ ] Configurar Jest y Supertest
  - [ ] npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
  - [ ] Crear jest.config.js

- [ ] Tests Unitarios - Controllers
  - [ ] auth.controller.test.ts (login, register, refresh)
  - [ ] client.controller.test.ts (CRUD)
  - [ ] order.controller.test.ts (CRUD + detalles)
  - [ ] payment.controller.test.ts (N:M + validaciones)

- [ ] Tests de Integración
  - [ ] Flow completo: register → login → create order → add payment
  - [ ] Validación de cálculos dinámicos
  - [ ] Validación de soft deletes
  - [ ] Validación de transacciones

- [ ] Tests de Auditoría
  - [ ] Verificar logs se crean correctamente
  - [ ] Verificar cleanup funciona

### 8. Testing Frontend (3-4 horas)
- [ ] Configurar Vitest (ya incluido en Vite)
- [ ] Tests de Componentes Clave
  - [ ] Balance.tsx (cálculos, visualización)
  - [ ] Orders.tsx (detalles, totales)
  - [ ] PaymentDialog.tsx (validaciones)
  
- [ ] Tests de Servicios
  - [ ] api.ts (manejo de errores)
  - [ ] order.service.ts (cálculos dinámicos)
  - [ ] payment.service.ts (validaciones)

### 9. End-to-End Testing (2-3 horas)
- [ ] Configurar Playwright o Cypress
- [ ] Flujos críticos:
  - [ ] Login y autenticación
  - [ ] Crear cliente → crear pedido → agregar pago
  - [ ] Consultar balance de cliente
  - [ ] Generar reporte

---

## 📚 PRIORIDAD BAJA (Documentación)

### 10. Documentación API (2-3 horas)
- [ ] Instalar Swagger/OpenAPI
  - [ ] npm install swagger-ui-express swagger-jsdoc
  - [ ] Configurar en backend/src/index.ts

- [ ] Documentar endpoints con JSDoc:
  - [ ] Auth endpoints (6 rutas)
  - [ ] Client endpoints (7 rutas)
  - [ ] Order endpoints (10+ rutas)
  - [ ] Payment endpoints (7 rutas)
  - [ ] Producto endpoints (5 rutas)
  - [ ] Estado endpoints (5 rutas)
  - [ ] Audit endpoints (3 rutas)

- [ ] Actualizar API_DOCS.md con ejemplos de uso

### 11. Documentación General (1-2 horas)
- [ ] Actualizar README.md principal
  - [ ] Descripción del proyecto
  - [ ] Arquitectura (Backend + Frontend)
  - [ ] Instalación y configuración
  - [ ] Scripts disponibles

- [ ] Actualizar backend/README.md
  - [ ] Nuevo modelo de base de datos
  - [ ] Endpoints disponibles
  - [ ] Configuración de .env

- [ ] Crear DEPLOYMENT.md
  - [ ] Guía de despliegue a producción
  - [ ] Configuración de servidor
  - [ ] Variables de entorno requeridas
  - [ ] SSL/HTTPS setup

- [ ] Crear diagrama de base de datos
  - [ ] Usar dbdiagram.io o similar
  - [ ] Documentar relaciones
  - [ ] Incluir en docs/

---

## 🚀 FUTURO (Opcional)

### 12. Aplicación Móvil (40-60 horas)
- [ ] Decisión: PWA vs React Native
- [ ] Configurar proyecto base
- [ ] Implementar autenticación
- [ ] Vistas principales (Dashboard, Pedidos, Clientes)
- [ ] Funcionalidad offline
- [ ] Notificaciones push

### 13. Infraestructura Avanzada (6-10 horas)
- [ ] Database Triggers
  - [ ] Trigger para actualizar fecha_entrega automáticamente
  - [ ] Trigger para validaciones adicionales

- [ ] CI/CD Pipeline
  - [ ] GitHub Actions para tests automáticos
  - [ ] Deploy automático a staging
  - [ ] Deploy manual a producción

- [ ] Monitoring y Logging
  - [ ] Implementar Winston para logs estructurados
  - [ ] Configurar Prometheus + Grafana
  - [ ] Alertas por email/Slack

### 14. Mejoras de Performance (4-6 horas)
- [ ] Implementar caching (Redis)
- [ ] Optimizar queries con índices adicionales
- [ ] Implementar paginación en todas las listas
- [ ] Comprimir respuestas HTTP (gzip)

---

## 📊 Resumen de Estimaciones

| Área | Tiempo Estimado | Prioridad |
|------|-----------------|-----------|
| Frontend - Tipos | 4-6 horas | 🔥 Crítica |
| Frontend - Servicios | 6-8 horas | 🔥 Crítica |
| Frontend - Componentes | 8-10 horas | 🔥 Crítica |
| Backend - Endpoints | 2-3 horas | ⚡ Alta |
| Backend - Integraciones | 4-6 horas | ⚡ Alta |
| Testing | 9-13 horas | 🧪 Media |
| Documentación | 3-5 horas | 📚 Baja |
| **TOTAL PARA 95% COMPLETITUD** | **36-51 horas** | - |
| Futuro (Mobile + Infra) | 50-76 horas | 🚀 Opcional |

---

## 🎯 Ruta Crítica Recomendada

1. **Día 1-2:** Frontend Tipos y Servicios (10-14 horas)
2. **Día 3-4:** Frontend Componentes Críticos (8-10 horas)
3. **Día 5:** Backend Endpoints + Integraciones (6-9 horas)
4. **Día 6:** Testing Básico (6-8 horas)
5. **Día 7:** Documentación + QA Final (4-6 horas)

**Total:** 34-47 horas de desarrollo intensivo para alcanzar **95% de completitud**.

---

## ✅ Próximo Paso Inmediato

**EMPEZAR CON:** Actualización de tipos en `figma/src/app/types/index.ts`

```bash
# Abrir archivo para editar
code figma/src/app/types/index.ts
```

Este es el punto de partida crítico porque todos los demás cambios del frontend dependen de tener los tipos correctos definidos.

---

**Última actualización:** 14 de enero de 2026  
**Estado del proyecto:** Backend refactorizado (v1.0), listo para frontend
