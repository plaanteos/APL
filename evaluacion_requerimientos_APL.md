# 📋 AUDITORÍA TÉCNICA - SISTEMA APL (LABORATORIO DENTAL)
## Evaluación Integral de Arquitectura, Base de Datos y Cumplimiento de Requerimientos

**Auditor:** Arquitecto de Software Senior / Analista de Sistemas  
**Fecha:** 13 de enero de 2026  
**Tipo de Evaluación:** Auditoría Técnica Exhaustiva Pre-Producción

---

## 1. ANÁLISIS DE CUMPLIMIENTO DE REQUERIMIENTOS

### 1.1 REQUERIMIENTOS FUNCIONALES

#### ✅ **RF-01: Login** - **CUMPLIDO**
**Evidencia:**
- Implementación completa en `backend/src/controllers/auth.controller.ts`
- Validación con Zod de credenciales
- Autenticación con JWT (token válido por 7 días)
- Hash seguro de contraseñas con bcryptjs (factor 12)
- Componente Login funcional en frontend

**Observación Técnica:** Implementación sólida con buenas prácticas de seguridad.

---

#### ✅ **RF-02: Dashboard Inicial** - **CUMPLIDO**
**Evidencia:**
- Componente `Dashboard.tsx` implementado con todas las métricas solicitadas
- Visualización de: Total pedidos, ingresos, clientes, pendientes
- Calendario integrado (`CalendarWidget.tsx`)
- Logout funcional
- Barra de navegación presente

**Observación Técnica:** Dashboard completo y funcional. Sin embargo, los datos mostrados localmente son mock data.

---

#### ⚠️ **RF-03: Bandeja de Pedidos** - **PARCIALMENTE CUMPLIDO**
**Evidencia:**
- Componente `Orders.tsx` implementado
- Filtrado por estado funcional
- Creación de nuevos pedidos mediante `NewOrderDialog`
- Navegación al balance del pedido

**Deficiencias Identificadas:**
- **CRÍTICO:** En producción (Netlify), la bandeja aparece vacía porque la base de datos no tiene datos seeded
- No se visualiza correctamente la integración real con API
- Falta endpoint explícito para acceder al balance de un pedido específico

**Estado:** 70% cumplido

---

#### ✅ **RF-04: Bandeja de Clientes** - **CUMPLIDO**
**Evidencia:**
- Componente `Clients.tsx` implementado
- Creación de nuevos clientes funcional
- Navegación al balance de cliente
- Modal `SendMessageDialog` para envío de mensajes por email/WhatsApp

**Observación Técnica:** Funcionalidad completa. Envío de mensajes implementado mediante toast (simulación), pero no hay integración real con servicios de correo/WhatsApp.

---

#### ⚠️ **RF-05: Bandeja de Balance** - **PARCIALMENTE CUMPLIDO**
**Evidencia:**
- Componente `Balance.tsx` implementado
- Visualización de balance total y por cliente
- Diálogos para agregar pagos (`PaymentDialog`) y pedidos
- Descarga de Excel con XLSX library
- Botones para enviar por email/WhatsApp

**Deficiencias Críticas:**
1. **NO HAY** integración real con servicios de email
2. **NO HAY** integración real con API de WhatsApp
3. **NO EXISTE** funcionalidad para marcar pedidos como "entregados" desde el Balance
4. El envío de balance es simulado (solo toast notifications)
5. En producción, los balances están vacíos porque faltan datos

**Estado:** 60% cumplido

---

### 1.2 REQUERIMIENTOS DE BASE DE DATOS

#### ⚠️ **RBD-01: Normalización** - **PARCIALMENTE CUMPLIDO**

**1FN (Primera Forma Normal):** ✅ **CUMPLIDO**
- Tablas: `Administrador`, `Cliente`, `Pedido`
- Campos atómicos correctos
- Claves primarias definidas (CUID)

**2FN (Segunda Forma Normal):** ✅ **CUMPLIDO**
- Tablas: `DetallePedido`, `Pago`
- Dependencias funcionales correctas
- Claves foráneas bien definidas

**3FN (Tercera Forma Normal):** ✅ **CUMPLIDO**  
- Tabla: `Auditoria`
- Elimina dependencias transitivas
- Tabla adicional `Recordatorio` (más allá del requerimiento)

**PROBLEMA DETECTADO EN EL MODELO:**
```prisma
model Pedido {
  montoPagado    Decimal @db.Decimal(10,2) @default(0.00)
  montoPendiente Decimal @db.Decimal(10,2)
}
```
❌ **VIOLACIÓN DE NORMALIZACIÓN:** Los campos `montoPagado` y `montoPendiente` son **campos calculados** que deben derivarse de la suma de pagos, no almacenarse redundantemente. Esto genera:
- Riesgo de inconsistencia de datos
- Violación de 3FN (dependencia transitiva)

**Estado:** 75% cumplido con FALLA CRÍTICA de diseño

---

#### ❌ **RBD-02: Implementación Técnica** - **NO CUMPLIDO**

Evaluación por sub-requerimiento:

| Requerimiento | Estado | Evidencia |
|--------------|--------|-----------|
| **Creación de BD en MySQL** | ❌ NO | BD está en PostgreSQL, no MySQL como especifica el requerimiento |
| **Creación de tablas** | ✅ SÍ | Schema Prisma completo |
| **Creación de usuarios y permisos** | ❌ NO | No hay scripts SQL de creación de usuarios de BD |
| **Creación de índices** | ⚠️ PARCIAL | Solo 3 índices en tabla `Recordatorio`. Faltan índices críticos |
| **Creación de triggers** | ❌ NO | No existen triggers en ninguna parte del sistema |
| **Scripts de inserción** | ⚠️ PARCIAL | Existe `seed.ts` pero NO se ejecuta en producción |
| **Consultas de validación** | ❌ NO | No existen scripts de validación SQL |
| **Pruebas de triggers** | ❌ NO | No aplicable (no hay triggers) |

**ANÁLISIS DETALLADO:**

**a) Índices Faltantes (CRÍTICO):**
```sql
-- ÍNDICES OBLIGATORIOS QUE NO EXISTEN:
CREATE INDEX idx_pedidos_cliente ON pedidos(clienteId);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha_venc ON pedidos(fechaVencimiento);
CREATE INDEX idx_pagos_pedido ON pagos(pedidoId);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_auditoria_admin ON auditoria(administradorId);
CREATE INDEX idx_auditoria_entidad ON auditoria(tipoEntidad, entidadId);
```

**b) Triggers Inexistentes (CRÍTICO):**
```sql
-- TRIGGERS REQUERIDOS QUE NO EXISTEN:

-- 1. Trigger para actualizar montoPagado automáticamente
CREATE TRIGGER trg_actualizar_monto_pagado
AFTER INSERT ON pagos
FOR EACH ROW
BEGIN
  UPDATE pedidos SET montoPagado = (
    SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE pedidoId = NEW.pedidoId
  ),
  montoPendiente = montoTotal - montoPagado
  WHERE id = NEW.pedidoId;
END;

-- 2. Trigger de auditoría automática
CREATE TRIGGER trg_auditoria_cliente_update
AFTER UPDATE ON clientes
FOR EACH ROW
BEGIN
  INSERT INTO auditoria (...) VALUES (...);
END;

-- 3. Trigger para validar fechas
CREATE TRIGGER trg_validar_fecha_vencimiento
BEFORE INSERT ON pedidos
FOR EACH ROW
BEGIN
  IF NEW.fechaVencimiento < NEW.fechaPedido THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fecha de vencimiento inválida';
  END IF;
END;
```

**c) Ausencia de Scripts SQL:**
- No hay carpeta `scripts/` con archivos `.sql`
- Todo está gestionado por Prisma (ORM)
- No hay documentación SQL tradicional

**Estado:** 25% cumplido con FALLOS CRÍTICOS

---

### 1.3 REQUERIMIENTOS NO FUNCIONALES

#### ✅ **RNF-01: Plataforma Web** - **CUMPLIDO**
**Evidencia:**
- Aplicación web desplegada en Netlify
- Accesible desde múltiples IPs
- Backend en Render accesible vía HTTPS

---

#### ❌ **RNF-02: Plataforma Mobile** - **NO CUMPLIDO**
**Evidencia:** No existe aplicación mobile. Búsqueda en todo el repositorio confirma ausencia de:
- Carpeta `/mobile`
- Proyecto React Native
- Proyecto Flutter
- Configuración Expo
- APK o IPA

**Estado:** 0% cumplido - **REQUERIMIENTO CRÍTICO NO IMPLEMENTADO**

---

#### ⚠️ **RNF-03: Seguridad** - **PARCIALMENTE CUMPLIDO**

**Autenticación:** ✅ Implementada con JWT  
**Cambio de contraseña:** ❌ **NO IMPLEMENTADO** - No existe endpoint ni UI

**Problemas de Seguridad Detectados:**

1. **Exposición de credenciales en código:**
```tsx
// Login.tsx línea 12-13
const [email, setEmail] = useState("admin@apl-dental.com");
const [password, setPassword] = useState("AdminAnto17$");
```
❌ Credenciales hardcodeadas en el código fuente

2. **JWT_SECRET potencialmente débil:**
No hay validación de fortaleza del secret en variables de entorno

3. **Sin rate limiting:**
No hay protección contra ataques de fuerza bruta en `/api/auth/login`

4. **Sin HTTPS forzado:**
No hay redirección automática HTTP → HTTPS

**Estado:** 50% cumplido

---

#### ⚠️ **RNF-04: Escalabilidad y Robustez** - **PARCIALMENTE CUMPLIDO**

**Análisis:**

**Fortalezas:**
- Uso de PostgreSQL (escalable)
- Arquitectura de microservicios (frontend/backend separados)
- Prisma ORM con connection pooling

**Debilidades Críticas:**
1. **Sin caché:** No hay Redis ni caching
2. **Sin paginación:** Endpoints devuelven todos los registros
3. **Sin índices suficientes:** Queries lentas a gran escala
4. **Sin CDN:** Assets no optimizados
5. **Sin manejo de concurrencia:** Posibles race conditions en pagos
6. **Sin retry logic:** Fallos en requests no se reintentan
7. **Sin monitoreo:** No hay logging estructurado ni métricas

**Código Problemático:**
```typescript
// order.service.ts
static async getAllOrders(): Promise<Order[]> {
  const response = await apiClient.get('/orders');
  return response.data.data; // ❌ Sin paginación
}
```

**Estado:** 40% cumplido

---

## 2. DETECCIÓN DE FALLAS DEL SISTEMA

### 2.1 FALLAS FUNCIONALES CRÍTICAS

#### 🔴 **F-01: Base de datos vacía en producción**
**Severidad:** CRÍTICA  
**Descripción:** La aplicación en Netlify no muestra datos porque el seed no se ejecutó en Render.  
**Impacto:** El calendario no muestra pedidos con colores, las bandejas aparecen vacías.  
**Solución:** Modificar Build Command en Render para incluir `npm run db:seed`

#### 🔴 **F-02: Timeout de 30 segundos en cold starts**
**Severidad:** CRÍTICA  
**Descripción:** Render Free Tier duerme el servicio. Primera petición tarda >30s y falla por timeout.  
**Impacto:** Usuarios ven error "ECONNABORTED" al hacer login después de inactividad.  
**Solución:** Aumentar timeout a 90 segundos o upgrade a plan pagado de Render.

#### 🔴 **F-03: Sin funcionalidad de "marcar como entregado"**
**Severidad:** ALTA  
**Descripción:** RF-05 requiere marcar pedidos como entregados desde Balance, pero no está implementado.  
**Impacto:** Flujo de trabajo incompleto.  
**Solución:** Agregar botón y endpoint `PATCH /api/orders/:id/deliver`

#### 🔴 **F-04: Envío de mensajes simulado**
**Severidad:** ALTA  
**Descripción:** Email y WhatsApp solo muestran toasts, no envían mensajes reales.  
**Impacto:** RF-04 y RF-05 no cumplen su propósito real.  
**Solución:** Integrar SendGrid/Nodemailer y Twilio/WhatsApp Business API

---

### 2.2 FALLAS DE DISEÑO (UX/UI)

#### 🟡 **D-01: Credenciales expuestas en UI**
```tsx
<p>Email: <strong>admin@apl-dental.com</strong></p>
<p>Contraseña: <strong>AdminAnto17$</strong></p>
```
**Problema:** Mala práctica de seguridad y UX confusa (¿es demo o producción?).

#### 🟡 **D-02: Sin feedback de carga**
No hay spinners/skeletons mientras se cargan datos. Experiencia pobre.

#### 🟡 **D-03: Modales sin validación de campos**
Formularios permiten envío con campos vacíos.

---

### 2.3 FALLAS DE ARQUITECTURA

#### 🔴 **A-01: Mock data mezclado con datos reales**
```tsx
import { mockClients, mockOrders } from "../data/mockData";
```
**Problema:** Componentes usan datos mock en lugar de API calls.  
**Riesgo:** Código no funcional en producción.

#### 🔴 **A-02: Sin manejo de errores de red**
```typescript
const fetchOrders = async () => {
  try {
    const fetchedOrders = await orderService.getAllOrders();
    setOrders(validOrders);
  } catch (error) {
    console.error("Error fetching orders:", error); // ❌ Solo console.error
    toast.error("Error al cargar pedidos"); // Sin retry ni detalle
  }
};
```

#### 🟡 **A-03: Sin separación de entornos**
No hay `.env.development` vs `.env.production` claros.

---

### 2.4 FALLAS DE BASE DE DATOS

#### 🔴 **BD-01: Campos calculados almacenados (Violación 3FN)**
```prisma
montoPagado    Decimal @default(0.00) // ❌ Debe calcularse
montoPendiente Decimal                // ❌ Debe calcularse
```
**Solución:** Eliminar estos campos y calcular en queries:
```typescript
const pedido = await prisma.pedido.findUnique({
  where: { id },
  include: {
    pagos: { select: { monto: true } }
  }
});
const montoPagado = pedido.pagos.reduce((sum, p) => sum + p.monto, 0);
```

#### 🔴 **BD-02: Sin triggers para integridad**
No hay triggers que:
- Actualicen `estado` automáticamente cuando `montoPendiente = 0`
- Prevengan eliminación de clientes con pedidos pendientes
- Auditen cambios críticos

#### 🔴 **BD-03: Sin constraints adicionales**
Faltan:
```sql
ALTER TABLE pedidos ADD CONSTRAINT chk_monto_positivo 
  CHECK (montoTotal > 0);
ALTER TABLE pagos ADD CONSTRAINT chk_pago_no_excede 
  CHECK (monto <= (SELECT montoTotal FROM pedidos WHERE id = pedidoId));
```

#### 🔴 **BD-04: PostgreSQL vs MySQL**
**Requerimiento:** MySQL  
**Implementado:** PostgreSQL  
**Impacto:** Incumplimiento directo de RBD-02

---

### 2.5 PROBLEMAS DE SEGURIDAD

#### 🔴 **S-01: Sin rate limiting**
Endpoint `/api/auth/login` vulnerable a ataques de fuerza bruta.

#### 🔴 **S-02: Sin validación de email en registro**
No hay verificación de email real (podría registrarse con cualquier correo).

#### 🟡 **S-03: JWT sin refresh tokens**
Tokens de 7 días sin capacidad de renovar = UX pobre o riesgo de seguridad.

#### 🟡 **S-04: Sin logging de intentos fallidos**
No se registran intentos de login fallidos en auditoría.

---

### 2.6 RIESGOS DE ESCALABILIDAD

#### 🔴 **E-01: Sin paginación en endpoints**
```typescript
// Devuelve TODOS los pedidos
async getAllOrders(req: Request, res: Response) {
  const pedidos = await prisma.pedido.findMany(); // ❌
}
```
**Riesgo:** Con 10,000+ pedidos, la API colapsará.

#### 🔴 **E-02: Queries N+1**
```typescript
const clientes = await prisma.cliente.findMany();
for (const cliente of clientes) {
  const pedidos = await prisma.pedido.findMany({ where: { clienteId: cliente.id } }); // ❌ N+1
}
```

#### 🟡 **E-03: Sin índices en joins frecuentes**
Falta `INDEX` en `pedidos.clienteId`, `pagos.pedidoId`.

---

## 3. EVALUACIÓN TÉCNICA POR CAPAS

### 3.1 BASE DE DATOS: 60/100

| Aspecto | Puntaje | Observación |
|---------|---------|-------------|
| Normalización | 7/10 | Bien hecha pero con campos redundantes |
| DER vs Implementación | 8/10 | Coherente pero sin documentación visual |
| Claves PK/FK | 9/10 | Correctas con CUID y CASCADE |
| Triggers | 0/10 | **No existen** |
| Auditoría | 7/10 | Tabla existe pero sin triggers automáticos |
| Índices | 2/10 | Solo 3 índices, faltan >10 críticos |
| Constraints | 3/10 | Solo PKs y FKs, sin CHECKs ni reglas |
| Rendimiento | 4/10 | Sin optimizaciones, riesgo de lentitud |

**Conclusión:** Base de datos funcional pero insuficiente para producción. Faltan elementos críticos de RBD-02.

---

### 3.2 BACKEND: 72/100

| Aspecto | Puntaje | Observación |
|---------|---------|-------------|
| Arquitectura | 8/10 | MVC bien estructurado con controllers/services |
| Separación de responsabilidades | 8/10 | Correcta con middleware, controllers, services |
| Validaciones | 7/10 | Zod implementado pero faltan validaciones de negocio |
| Manejo de errores | 6/10 | Básico con try/catch, sin middleware global robusto |
| Seguridad | 6/10 | JWT implementado, faltan rate limiting y validaciones |
| API RESTful | 8/10 | Endpoints bien diseñados y semánticos |
| Documentación | 4/10 | API_DOCS.md existe pero incompleto |
| Testing | 0/10 | **No hay tests** |
| Escalabilidad | 5/10 | Sin paginación, caché ni optimizaciones |

**Código Ejemplar:**
```typescript
// audit.service.ts - Excelente diseño de servicio de auditoría
static async logUpdate(req: Request, tipoEntidad: EntityType, ...) {
  const { ip, userAgent, userId } = this.extractRequestInfo(req);
  await this.log({...});
}
```

**Código Problemático:**
```typescript
// payment.controller.ts - Sin validación de monto vs deuda
const pago = await prisma.pago.create({ data: { monto } });
// ❌ Debería validar: monto <= montoPendiente del pedido
```

**Conclusión:** Backend sólido pero no production-ready. Falta testing, optimizaciones y validaciones de negocio complejas.

---

### 3.3 FRONTEND WEB: 68/100

| Aspecto | Puntaje | Observación |
|---------|---------|-------------|
| Cumplimiento de requerimientos | 7/10 | Todas las bandejas implementadas |
| Usabilidad | 7/10 | Interfaz limpia pero sin feedback de carga |
| Flujo de navegación | 8/10 | Navegación entre bandejas fluida |
| Componentes reutilizables | 8/10 | Buen uso de shadcn/ui |
| Manejo de estado | 6/10 | useState local, sin Context API complejo |
| Integración con API | 5/10 | Mezclado con mock data |
| Responsive | 7/10 | Se adapta pero no optimizado para mobile |
| Accesibilidad | 4/10 | Sin atributos ARIA ni navegación por teclado |
| Validaciones de formularios | 5/10 | Básicas con HTML5, sin Zod/Yup |

**Código Ejemplar:**
```tsx
// CalendarWidget.tsx - Componente complejo bien estructurado
const fetchOrders = async () => {
  const fetchedOrders = await orderService.getAllOrders();
  const validOrders = fetchedOrders.filter(order => 
    order && order.fechaVencimiento && order.tipoPedido
  );
  setOrders(validOrders);
};
```

**Código Problemático:**
```tsx
// Balance.tsx - Mock data en producción
const selectedClient = mockClients.find((c) => c.id === currentClientId); // ❌
const clientOrders = orders.filter((o) => o.clientId === currentClientId);
```

**Conclusión:** Frontend funcional con buen diseño UI/UX pero con deuda técnica en integración real con backend.

---

### 3.4 APLICACIÓN MOBILE: 0/100

**Estado:** NO EXISTE  
**Impacto:** Incumplimiento total de RNF-02  
**Recomendación:** Desarrollar con React Native o convertir web app a PWA como solución intermedia.

---

## 4. PROPUESTA DE MEJORAS OBLIGATORIA

### 4.1 MEJORAS CRÍTICAS (Imprescindibles antes de producción)

#### ✅ **MC-01: Implementar triggers en base de datos**
**Problema:** Sin triggers, la integridad de datos depende 100% de código backend (frágil).  
**Solución:**
```sql
-- Trigger para actualizar montoPagado automáticamente
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
**Riesgo sin implementar:** Inconsistencias entre `montoPagado` y suma real de pagos.

---

#### ✅ **MC-02: Agregar índices críticos**
**Problema:** Queries lentas a medida que crece la base de datos.  
**Solución:**
```sql
CREATE INDEX CONCURRENTLY idx_pedidos_cliente_estado ON pedidos(clienteId, estado);
CREATE INDEX CONCURRENTLY idx_pedidos_fecha_venc ON pedidos(fechaVencimiento) WHERE estado != 'ENTREGADO';
CREATE INDEX CONCURRENTLY idx_pagos_pedido ON pagos(pedidoId);
CREATE INDEX CONCURRENTLY idx_auditoria_timestamp ON auditoria(timestamp DESC);
CREATE INDEX CONCURRENTLY idx_clientes_activo ON clientes(activo) WHERE activo = true;
```
**Riesgo sin implementar:** Caída de rendimiento con >1000 registros.

---

#### ✅ **MC-03: Eliminar campos calculados redundantes**
**Problema:** Violación de normalización y riesgo de inconsistencia.  
**Solución:**
```prisma
model Pedido {
  // ELIMINAR:
  // montoPagado    Decimal
  // montoPendiente Decimal
  
  // CALCULAR en queries:
  _count: {
    pagos: true
  }
}
```
```typescript
// En controllers:
const pedido = await prisma.pedido.findUnique({
  where: { id },
  include: {
    pagos: { select: { monto: true } }
  }
});
const montoPagado = pedido.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
const montoPendiente = Number(pedido.montoTotal) - montoPagado;
```
**Riesgo sin implementar:** Datos corruptos, bugs difíciles de rastrear.

---

#### ✅ **MC-04: Implementar paginación en todos los endpoints**
**Problema:** Endpoints devuelven todos los registros sin límite.  
**Solución:**
```typescript
// Agregar a todos los GET /api/*
interface PaginationQuery {
  page?: number;
  limit?: number;
}

static async getAllOrders(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  
  const [pedidos, total] = await Promise.all([
    prisma.pedido.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.pedido.count()
  ]);
  
  res.json({
    success: true,
    data: {
      items: pedidos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}
```
**Riesgo sin implementar:** Crash del servidor con gran volumen de datos.

---

#### ✅ **MC-05: Ejecutar seed en producción**
**Problema:** Base de datos vacía en Netlify.  
**Solución:**
```bash
# Render Build Command:
npm ci --include=dev && npx prisma generate && npx prisma db push && npm run create-admin && npm run db:seed
```
**Riesgo sin implementar:** Aplicación no funcional en producción.

---

#### ✅ **MC-06: Implementar rate limiting**
**Problema:** API vulnerable a ataques de fuerza bruta.  
**Solución:**
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: 'Demasiados intentos de login. Intenta en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', loginLimiter);
```
**Riesgo sin implementar:** Cuentas comprometidas por ataques automatizados.

---

#### ✅ **MC-07: Aumentar timeout de axios**
**Problema:** Cold starts de Render (>30s) causan errores de timeout.  
**Solución:**
```typescript
// api.ts
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90 segundos
  withCredentials: true,
});
```
**Riesgo sin implementar:** Usuarios no pueden hacer login después de inactividad.

---

### 4.2 MEJORAS IMPORTANTES (Recomendadas)

#### 🟡 **MI-01: Integrar servicios reales de mensajería**
**Solución:**
- **Email:** Integrar SendGrid o AWS SES
- **WhatsApp:** Integrar Twilio WhatsApp Business API
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
await sgMail.send({
  to: cliente.email,
  from: 'noreply@apl-dental.com',
  subject: 'Balance de cuenta',
  html: generateBalanceHTML(balance)
});
```

#### 🟡 **MI-02: Implementar tests unitarios y de integración**
```typescript
// __tests__/auth.controller.test.ts
describe('AuthController', () => {
  it('debe hacer login con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@apl-dental.com', password: 'AdminAnto17$' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });
});
```
**Cobertura objetivo:** Mínimo 70%

#### 🟡 **MI-03: Agregar funcionalidad de cambio de contraseña**
```typescript
// auth.routes.ts
router.patch('/change-password', authenticate, AuthController.changePassword);

// auth.controller.ts
static async changePassword(req: AuthRequest, res: Response) {
  const { oldPassword, newPassword } = req.body;
  // Validar contraseña actual
  // Hash nueva contraseña
  // Actualizar en BD
  // Registrar en auditoría
}
```

#### 🟡 **MI-04: Convertir web app a PWA como solución mobile temporal**
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'APL Dental Lab',
        short_name: 'APL',
        icons: [...],
        theme_color: '#033f63',
      }
    })
  ]
});
```

#### 🟡 **MI-05: Implementar logging estructurado**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

### 4.3 MEJORAS DESEABLES (Opcionales)

- **MD-01:** Implementar caché con Redis para queries frecuentes
- **MD-02:** Agregar CDN para assets estáticos (Cloudflare/AWS CloudFront)
- **MD-03:** Implementar refresh tokens para mejor UX
- **MD-04:** Agregar modo oscuro en UI
- **MD-05:** Implementar exportación de reportes en PDF
- **MD-06:** Agregar gráficos y dashboards avanzados con Chart.js
- **MD-07:** Implementar notificaciones push con Firebase
- **MD-08:** Agregar búsqueda full-text con Elasticsearch

---

## 5. EVALUACIÓN GLOBAL DEL PROYECTO

### 5.1 NIVEL DE MADUREZ DEL SISTEMA

**Calificación:** **MEDIO-BAJO (55/100)**

**Desglose:**
- **Funcionalidad:** 65/100 - Requerimientos funcionales mayormente cumplidos
- **Base de Datos:** 60/100 - Modelo correcto pero sin triggers ni índices suficientes
- **Backend:** 72/100 - Arquitectura sólida pero sin optimizaciones
- **Frontend:** 68/100 - UI funcional pero con deuda técnica
- **Mobile:** 0/100 - No existe
- **Seguridad:** 50/100 - Básica, vulnerabilidades presentes
- **Escalabilidad:** 40/100 - No preparado para carga real
- **Testing:** 0/100 - Ausencia total de tests

**Clasificación:** **PROTOTIPO AVANZADO / MVP NO PRODUCTION-READY**

---

### 5.2 APROBACIÓN COMO MVP FUNCIONAL

**Dictamen:** ⚠️ **APROBADO CON CONDICIONES CRÍTICAS**

**Justificación:**
- ✅ El sistema cumple requerimientos funcionales básicos (RF-01 a RF-05)
- ✅ La arquitectura es correcta y escalable con mejoras
- ⚠️ Falta requerimiento crítico: Aplicación Mobile (RNF-02)
- ❌ Faltan elementos de RBD-02: triggers, índices, validaciones SQL
- ❌ Sin tests automatizados
- ❌ Problemas de rendimiento y seguridad

**Puede aprobarse como MVP si se entiende que:**
1. Es un PROTOTIPO FUNCIONAL, no sistema en producción
2. Requiere las mejoras críticas (MC-01 a MC-07) antes de uso real
3. La aplicación mobile debe desarrollarse para cumplir RNF-02

---

### 5.3 DEFENDIBILIDAD EN EVALUACIÓN ACADÉMICA

**Dictamen:** ✅ **SÍ ES DEFENDIBLE CON MATICES**

**Argumentos a favor:**
- Arquitectura MVC bien implementada
- Base de datos normalizada correctamente (3FN)
- Backend con buenas prácticas (controllers/services/middleware)
- Frontend con UI/UX profesional
- Sistema de auditoría implementado
- Documentación técnica presente (API_DOCS, INSTALL, README)

**Argumentos en contra:**
- Aplicación mobile inexistente (incumplimiento de RNF-02)
- Triggers no implementados (incumplimiento de RBD-02)
- Base de datos PostgreSQL en lugar de MySQL (incumplimiento de RBD-02)
- Sin tests automatizados
- Funcionalidades simuladas (email/WhatsApp)

**Estrategia de defensa recomendada:**
1. Destacar arquitectura y normalización correcta
2. Explicar que triggers y mobile están en roadmap
3. Presentar plan de migración de mock data a producción
4. Demostrar conocimientos técnicos en decisiones de diseño
5. Reconocer limitaciones y proponer mejoras (muestra madurez profesional)

**Calificación esperada:** 75-85/100 (según criterios del evaluador)

---

### 5.4 RIESGOS DE PRODUCCIÓN INMEDIATA

Si este sistema se despliega a producción HOY sin cambios:

#### 🔴 **RIESGOS CRÍTICOS (Bloquean producción):**

1. **Pérdida de dinero:** Sin validaciones, se pueden registrar pagos mayores a deudas
2. **Datos corruptos:** Campos calculados pueden desincronizarse
3. **Brechas de seguridad:** Sin rate limiting, cuentas pueden ser comprometidas
4. **Crash del sistema:** Sin paginación, con 10,000+ pedidos el servidor colapsará
5. **Experiencia pobre:** Timeouts frecuentes por cold starts
6. **Funcionalidades rotas:** Email/WhatsApp no funcionan realmente

#### 🟡 **RIESGOS IMPORTANTES:**
7. Rendimiento degradado sin índices
8. Sin recuperación ante errores (no hay retry logic)
9. Imposible auditar acciones sin logging estructurado
10. Mantenimiento difícil sin tests

#### 🟢 **RIESGOS MENORES:**
11. UX mejorable (sin feedback de carga)
12. Accesibilidad limitada

---

## 6. CONCLUSIONES Y RECOMENDACIONES FINALES

### 6.1 RESUMEN EJECUTIVO

El sistema APL es un **prototipo funcional avanzado** que demuestra buenas prácticas de arquitectura de software pero que **NO está listo para producción** sin implementar las mejoras críticas identificadas.

**Puntos fuertes:**
- Arquitectura MVC correcta y escalable
- Base de datos normalizada (3FN con observaciones)
- Frontend profesional y funcional
- Sistema de auditoría implementado
- Separación frontend/backend correcta

**Puntos débiles críticos:**
- Ausencia de aplicación mobile
- Triggers e índices de BD inexistentes
- Sin paginación ni optimizaciones
- Funcionalidades simuladas (mensajería)
- Sin tests automatizados
- Problemas de seguridad y escalabilidad

---

### 6.2 ROADMAP RECOMENDADO

#### **Fase 1: Estabilización (2-3 semanas) - CRÍTICO**
- Implementar MC-01 a MC-07 (mejoras críticas)
- Ejecutar seed en producción
- Configurar monitoring básico

#### **Fase 2: Funcionalidad completa (3-4 semanas)**
- Integrar servicios reales de mensajería
- Implementar cambio de contraseña
- Desarrollar PWA o app mobile básica
- Agregar tests unitarios (70% cobertura)

#### **Fase 3: Optimización (2-3 semanas)**
- Implementar caché con Redis
- Agregar CDN
- Optimizar queries y rendimiento
- Documentación completa de API (Swagger)

#### **Fase 4: Producción (1 semana)**
- Migración de datos reales
- Configuración de backups automáticos
- Implementar monitoreo avanzado (Sentry, Datadog)
- Plan de disaster recovery

**Tiempo total estimado:** 8-11 semanas para sistema production-ready

---

### 6.3 DICTAMEN FINAL

**Para evaluación académica:** ✅ **APROBADO**  
**Para uso en producción:** ❌ **NO APROBADO** (requiere mejoras críticas)  
**Como portfolio profesional:** ✅ **RECOMENDADO** (con disclaimer de prototipo)

**Calificación técnica global:** **68/100** (BUENO CON MEJORAS REQUERIDAS)

---

**Firma del Auditor Técnico**  
Arquitecto de Software Senior  
Fecha: 13 de enero de 2026

---

**FIN DEL INFORME DE AUDITORÍA**
