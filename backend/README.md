# APL Dental Laboratory Backend API

Backend API para el sistema de gestión administrativa del laboratorio dental APL.

## 🚀 Tecnologías

- **Node.js** + **Express.js** + **TypeScript**
- **Prisma ORM** con **PostgreSQL**
- **JWT Authentication**
- **bcryptjs** para encriptación
- **Zod** para validación
- (Opcional) **BullMQ + Redis** para cola de trabajos (envíos asíncronos)

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── controllers/          # Controladores de API
│   ├── routes/              # Definición de rutas
│   ├── middleware/          # Middleware personalizado
│   ├── services/            # Lógica de negocio
│   ├── types/               # Tipos TypeScript
│   ├── utils/               # Utilidades
│   └── index.ts             # Punto de entrada
├── prisma/
│   ├── schema.prisma        # Esquema de base de datos
│   └── seed.ts              # Datos de prueba
├── .env.example             # Variables de entorno ejemplo
├── package.json
└── README.md
```

## ⚡ Inicio Rápido

### 1. Instalar dependencias
```bash
cd backend
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

Tip (local): también tenés un ejemplo listo en `backend/.env.local.example`.

### 3. Configurar base de datos
```bash
# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# Opcional: Poblar con datos de prueba
npm run db:seed
```

### 4. Ejecutar en desarrollo
```bash
npm run dev
```

### 5. Construir para producción
```bash
npm run build
npm start
```

## 🔗 Endpoints API

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/refresh` - Renovar access token
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener usuario actual
- `PUT /api/auth/change-password` - Cambiar contraseña
- `POST /api/auth/forgot-password` - Solicitar código de recuperación (OTP)
- `POST /api/auth/reset-password` - Resetear contraseña (OTP; token opcional por compatibilidad)

#### 2FA (cuentas administrativas)
- `POST /api/auth/2fa/setup` - Iniciar setup (otpauthUrl)
- `POST /api/auth/2fa/enable` - Habilitar (requiere OTP)
- `POST /api/auth/2fa/disable` - Deshabilitar (requiere password + OTP o backup)

### Clientes
- `GET /api/clients` - Listar clientes
- `POST /api/clients` - Crear cliente
- `GET /api/clients/:id` - Obtener cliente
- `PUT /api/clients/:id` - Actualizar cliente
- `DELETE /api/clients/:id` - Eliminar cliente

### Pedidos
- `GET /api/orders` - Listar pedidos
- `POST /api/orders` - Crear pedido
- `GET /api/orders/:id` - Obtener pedido
- `PUT /api/orders/:id` - Actualizar pedido
- `PATCH /api/orders/:id/status` - Cambiar estado (detalle)
- `PATCH /api/orders/:id/deliver` - Marcar como entregado
- `DELETE /api/orders/:id` - Eliminar pedido

### Pagos
- `GET /api/payments` - Listar pagos
- `POST /api/payments` - Registrar pago
- `GET /api/payments/order/:orderId` - Pagos por pedido (si aplica)

### Auditoría
- `GET /api/audit` - Logs de auditoría
- `GET /api/audit/stats` - Estadísticas de auditoría

## 🔐 Autenticación

Todas las rutas (excepto `/health` y `/auth/login`) requieren autenticación JWT:

```bash
Authorization: Bearer <token>
```

## 📊 Estado del Desarrollo

- ✅ Estructura del proyecto configurada
- ✅ Esquema de base de datos modelado en Prisma
- ✅ Controladores y servicios implementados
- ✅ Scripts de soporte (seed, utilidades, evidencia)
- ✅ Testing base (unit tests de utilidades)

## 🧪 Testing

Ejecutar tests unitarios:

```bash
npm test
```

Modo watch:

```bash
npm run test:watch
```

## 🗄️ Evidencia / Verificación de BD (RBD-02)

Para obtener un reporte reproducible del estado de la BD (tablas, índices, triggers, constraints, columnas 2FA), ejecutar:

```bash
npm run db:evidence
```

El script genera un archivo en `backend/logs/` con el resultado.

## 🔧 Scripts Disponibles

- `npm run dev` - Desarrollo con hot reload
- `npm run build` - Compilar TypeScript
- `npm start` - Ejecutar en producción
- `npm run db:generate` - Generar cliente Prisma
- `npm run db:migrate` - Ejecutar migraciones
- `npm run db:reset` - Resetear base de datos
- `npm run db:seed` - Poblar con datos de prueba
- `npm run db:evidence` - Reporte de evidencia de BD (tablas/índices/triggers/constraints)
- `npm test` - Ejecutar tests unitarios