# 🚀 PLAN DE REFACTORIZACIÓN COMPLETA - 56 HORAS

**Fecha inicio:** 14 de enero de 2026  
**Deadline:** 80 horas totales (56 horas restantes)  
**Objetivo:** Seguir AL PIE DE LA LETRA el modelo oficial del sector BD

---

## 📋 ESTRATEGIA: Refactorización en capas (de adentro hacia afuera)

**Capa 1:** Base de datos (Schema)  
**Capa 2:** Backend (API)  
**Capa 3:** Frontend (UI)  
**Capa 4:** Testing y deployment

---

## ⏱️ DISTRIBUCIÓN DE TIEMPO (56 horas)

### DÍA 1-2: BASE DE DATOS (16 horas)
- Schema Prisma (6h)
- Migraciones (4h)
- Seed data (2h)
- Testing DB (2h)
- Buffer (2h)

### DÍA 3-4: BACKEND (20 horas)
- Types/Interfaces (3h)
- Controllers (8h)
- Services (6h)
- Routes (2h)
- Testing API (1h)

### DÍA 5-6: FRONTEND (16 horas)
- Types (2h)
- Services (4h)
- Components (8h)
- Testing UI (2h)

### DÍA 7: INTEGRACIÓN + DEPLOY (4 horas)
- Testing E2E (2h)
- Deploy (1h)
- Documentación (1h)

---

## 🔴 FASE 1: SCHEMA PRISMA (6 horas)

### ✅ Cambios críticos según modelo oficial:

#### 1.1 Cambiar IDs de String/CUID → Int (30 min)
- TODAS las tablas: `@id @default(autoincrement())`
- Eliminar `@default(cuid())`

#### 1.2 Tabla ADMINISTRADOR (30 min)
```prisma
model Administrador {
  id        Int      @id @default(autoincrement())
  // Campos según diccionario oficial (por completar)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relaciones según MR
  clientes  Cliente[]
  pedidos   Pedido[]
  productos Producto[]
  pagos     Pago[]
  auditoria Auditoria[]
  
  @@map("administrador")
}
```

#### 1.3 Tabla CLIENTE (45 min)
```prisma
model Cliente {
  id                Int      @id @default(autoincrement())
  nombre            String   @db.VarChar(100)
  telefono          String   @db.VarChar(20)
  email             String   @db.VarChar(100)
  id_administrador  Int
  
  // Relaciones
  administrador     Administrador @relation(fields: [id_administrador], references: [id])
  pedidos           Pedido[]
  
  @@map("cliente")
}
```

**⚠️ ELIMINAR:**
- whatsapp, tipo (TipoCliente), direccion, ciudad, codigoPostal
- observaciones, activo, fechaRegistro
- timestamps personalizados

#### 1.4 Tabla PEDIDOS (1 hora)
```prisma
model Pedido {
  id                Int      @id @default(autoincrement())
  id_cliente        Int
  fecha_pedido      DateTime @default(now()) @db.Date
  fecha_entrega     DateTime @db.Date
  fecha_delete      DateTime? @db.Date
  id_administrador  Int
  
  // Relaciones
  cliente           Cliente @relation(fields: [id_cliente], references: [id])
  administrador     Administrador @relation(fields: [id_administrador], references: [id])
  detalles          DetallePedido[]
  detallesPago      DetallePago[]
  
  @@map("pedidos")
}
```

**⚠️ ELIMINAR:**
- numeroPedido, nombrePaciente, descripcion, tipoPedido
- cantidad, precioUnitario, montoTotal
- **montoPagado, montoPendiente** (se calcularán dinámicamente)
- estado (usar FK a tabla estado), prioridad, observaciones
- fechaVencimiento (se llama fecha_entrega)

#### 1.5 Tabla PRODUCTO - NUEVA (45 min)
```prisma
model Producto {
  id                Int      @id @default(autoincrement())
  // Campos según diccionario (por completar con info oficial)
  id_administrador  Int
  
  // Relaciones
  administrador     Administrador @relation(fields: [id_administrador], references: [id])
  detalles          DetallePedido[]
  
  @@map("producto")
}
```

#### 1.6 Tabla DETALLE_PEDIDOS (45 min)
```prisma
model DetallePedido {
  id             Int      @id @default(autoincrement())
  id_pedido      Int
  id_producto    Int
  id_estado      Int
  // Más campos según diccionario oficial
  
  // Relaciones
  pedido         Pedido   @relation(fields: [id_pedido], references: [id])
  producto       Producto @relation(fields: [id_producto], references: [id])
  estado         Estado   @relation(fields: [id_estado], references: [id])
  
  @@map("detalle_pedidos")
}
```

#### 1.7 Tabla ESTADO - NUEVA (Catálogo) (30 min)
```prisma
model Estado {
  id            Int      @id @default(autoincrement())
  descripcion   String   @db.VarChar(50)
  fecha_insert  DateTime @default(now())
  fecha_delete  DateTime? @db.Date
  
  // Relaciones
  detalles      DetallePedido[]
  
  @@map("estado")
}
```

**⚠️ ELIMINAR ENUM:** EstadoPedido

#### 1.8 Tabla PAGO (30 min)
```prisma
model Pago {
  id                Int      @id @default(autoincrement())
  // Campos según diccionario oficial
  id_administrador  Int
  
  // Relaciones
  administrador     Administrador @relation(fields: [id_administrador], references: [id])
  detalles          DetallePago[]
  
  @@map("pago")
}
```

#### 1.9 Tabla DETALLE_PAGO - NUEVA (45 min)
```prisma
model DetallePago {
  id         Int      @id @default(autoincrement())
  id_pedido  Int
  id_pago    Int
  // Más campos según diccionario
  
  // Relaciones
  pedido     Pedido   @relation(fields: [id_pedido], references: [id])
  pago       Pago     @relation(fields: [id_pago], references: [id])
  
  @@map("detalle_pago")
}
```

#### 1.10 Tabla AUDITORIA (30 min)
```prisma
model Auditoria {
  id                Int      @id @default(autoincrement())
  id_administrador  Int
  // Campos según diccionario oficial
  
  // Relaciones
  administrador     Administrador @relation(fields: [id_administrador], references: [id])
  
  @@map("auditoria")
}
```

#### 1.11 ELIMINAR tabla RECORDATORIOS (5 min)
- No está en modelo oficial

#### 1.12 ELIMINAR ENUMS (10 min)
- Rol (si no está en oficial)
- TipoCliente (no existe en oficial)
- EstadoPedido (reemplazado por tabla estado)
- Prioridad (si no está en oficial)
- MetodoPago (verificar si existe en oficial)
- AccionAudit (verificar si existe en oficial)
- TipoRecordatorio (eliminar)
- EstadoRecordatorio (eliminar)

---

## 🔴 FASE 2: MIGRACIONES (4 horas)

### 2.1 Reset completo de base de datos (30 min)
```bash
cd backend
npx prisma migrate reset --force
```

### 2.2 Crear migración inicial (1 hora)
```bash
npx prisma migrate dev --name refactor_modelo_oficial
```

### 2.3 Seed inicial (2 horas)
- Seed administrador inicial
- Seed estados (pendiente, en_proceso, entregado, cancelado)
- Seed productos iniciales (si aplicable)

### 2.4 Testing DB (30 min)
- Verificar todas las relaciones
- Verificar constraints

---

## 🟡 FASE 3: BACKEND TYPES (3 horas)

### 3.1 Actualizar types/index.ts (1 hora)
- Cambiar todos los IDs: `string` → `number`
- Actualizar interfaces de Cliente, Pedido, etc.
- Eliminar interfaces de tipos no existentes

### 3.2 Crear nuevos types (1 hora)
- ProductoType
- EstadoType
- DetallePagoType

### 3.3 Actualizar DTOs (1 hora)
- CreateClienteDto, UpdateClienteDto
- CreatePedidoDto, UpdatePedidoDto
- CreatePagoDto

---

## 🟡 FASE 4: BACKEND CONTROLLERS (8 horas)

### 4.1 auth.controller.ts (1 hora)
- Actualizar IDs en responses
- Mantener JWT logic

### 4.2 client.controller.ts (1.5 horas)
- Eliminar validaciones de campos no existentes
- Agregar id_administrador en create
- Simplificar getClientBalance (sin campos calculados)

### 4.3 order.controller.ts (2 horas)
- **CAMBIO MAYOR**: Simplificar pedidos
- Crear lógica para detalle_pedidos
- **ELIMINAR:** Cálculo de montoPagado/montoPendiente (mover a service)

### 4.4 payment.controller.ts (1.5 horas)
- Refactorizar para usar detalle_pago
- Agregar id_administrador

### 4.5 producto.controller.ts - NUEVO (1 hora)
- CRUD completo de productos

### 4.6 estado.controller.ts - NUEVO (30 min)
- GET estados (catálogo)

### 4.7 audit.controller.ts (30 min)
- Actualizar IDs

---

## 🟡 FASE 5: BACKEND SERVICES (6 horas)

### 5.1 Crear cálculos dinámicos (2 horas)
```typescript
// services/calculation.service.ts
export const calcularTotalPedido = async (pedidoId: number) => {
  // JOIN detalle_pedidos
}

export const calcularMontoPagado = async (pedidoId: number) => {
  // JOIN detalle_pago
}

export const calcularSaldoPendiente = async (pedidoId: number) => {
  // total - pagado
}
```

### 5.2 order.service.ts (2 horas)
- Refactorizar queries con JOINs
- Integrar cálculos dinámicos

### 5.3 client.service.ts (1 hora)
- Refactorizar getClientBalance con JOINs

### 5.4 producto.service.ts - NUEVO (1 hora)
- Lógica de negocio de productos

---

## 🟡 FASE 6: BACKEND ROUTES (2 horas)

### 6.1 Actualizar rutas existentes (1 hora)
- Validar nuevos DTOs
- Eliminar rutas de recordatorios

### 6.2 Agregar rutas nuevas (1 hora)
- /api/productos
- /api/estados

---

## 🟢 FASE 7: FRONTEND TYPES (2 horas)

### 7.1 Actualizar figma/src/app/types/index.ts (1 hora)
- IDs: `string` → `number`
- Actualizar Client, Order, Payment
- Eliminar tipos no existentes

### 7.2 Crear nuevos types (1 hora)
- Producto, Estado, DetallePago

---

## 🟢 FASE 8: FRONTEND SERVICES (4 horas)

### 8.1 client.service.ts (1 hora)
- Actualizar endpoints
- Actualizar tipos

### 8.2 order.service.ts (1.5 horas)
- Refactorizar para nuevo modelo
- Eliminar campos no existentes

### 8.3 payment.service.ts (1 hora)
- Refactorizar para detalle_pago

### 8.4 producto.service.ts - NUEVO (30 min)
- CRUD de productos

---

## 🟢 FASE 9: FRONTEND COMPONENTS (8 horas)

### 9.1 NewClientDialog.tsx (1 hora)
- Eliminar campos: whatsapp, tipo, direccion, etc.
- Actualizar validación Zod

### 9.2 Clients.tsx (1 hora)
- Simplificar vista
- Actualizar campos mostrados

### 9.3 NewOrderDialog.tsx (2 horas)
- **CAMBIO MAYOR**: Simplificar formulario
- Agregar selector de productos
- Eliminar campos calculados

### 9.4 Orders.tsx (1 hora)
- Actualizar columnas
- Integrar cálculos dinámicos del backend

### 9.5 Balance.tsx (2 horas)
- **CAMBIO MAYOR**: Recalcular con datos del backend
- Eliminar lógica de cálculo local

### 9.6 PaymentDialog.tsx (1 hora)
- Refactorizar para nuevo modelo

---

## 🟣 FASE 10: TESTING E INTEGRACIÓN (4 horas)

### 10.1 Testing backend (1 hora)
- Probar todos los endpoints
- Verificar cálculos dinámicos

### 10.2 Testing frontend (1 hora)
- Flujo completo: crear cliente, pedido, pago

### 10.3 Testing E2E (1 hora)
- Login → Crear cliente → Crear pedido → Registrar pago → Ver balance

### 10.4 Deploy (1 hora)
- Push a Render (backend)
- Push a Netlify (frontend)

---

## ⚠️ PUNTOS CRÍTICOS A RESOLVER

### Información faltante del Diccionario oficial:
- [ ] Campos exactos de ADMINISTRADOR
- [ ] Campos exactos de PRODUCTO
- [ ] Campos exactos de PAGO
- [ ] Campos exactos de DETALLE_PAGO
- [ ] Campos exactos de AUDITORIA
- [ ] ¿Existe enum/catálogo de MetodoPago?
- [ ] ¿Existe enum/catálogo de Rol?

**ACCIÓN:** Necesito que revises el Diccionario Excel y me pases:
1. Todos los campos de la tabla **producto**
2. Todos los campos de la tabla **pago**
3. Todos los campos de la tabla **detalle_pago**
4. Todos los campos de la tabla **auditoria**
5. Campos completos de **administrador**

---

## 📊 PRIORIZACIÓN (CRÍTICO → MENOS CRÍTICO)

### 🔴 CRÍTICO (No funciona sin esto):
1. Schema Prisma completo
2. Migraciones
3. Controllers básicos (auth, client, order, payment)
4. Services de cálculo dinámico
5. Frontend services
6. Componentes core (NewClient, NewOrder, Balance)

### 🟡 IMPORTANTE (Funcionalidad limitada):
7. Producto (tabla + CRUD)
8. Estado (catálogo)
9. Detalle_pago (relación N:M)

### 🟢 DESEABLE (Nice to have):
10. Auditoría completa
11. Testing exhaustivo
12. Documentación

---

## 🚀 PRÓXIMO PASO INMEDIATO

**ANTES DE TOCAR CÓDIGO:**
1. Necesito los campos faltantes del Diccionario Excel
2. Crear backup de código actual
3. Crear rama git: `refactor/modelo-oficial`

**¿Podés pasarme los campos faltantes del Excel?** 📋
