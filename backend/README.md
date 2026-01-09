# APL Dental Laboratory Backend API

Backend API para el sistema de gestión administrativa del laboratorio dental APL.

## 🚀 Tecnologías

- **Node.js** + **Express.js** + **TypeScript**
- **Prisma ORM** con **MySQL**
- **JWT Authentication**
- **bcryptjs** para encriptación
- **Zod** para validación

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
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/logout` - Cerrar sesión

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
- `PATCH /api/orders/:id/status` - Cambiar estado
- `DELETE /api/orders/:id` - Eliminar pedido

### Pagos
- `GET /api/payments` - Listar pagos
- `POST /api/payments` - Registrar pago
- `GET /api/payments/order/:orderId` - Pagos por pedido
- `GET /api/payments/balance` - Balance general

### Auditoría
- `GET /api/audit` - Logs de auditoría
- `GET /api/audit/user/:userId` - Logs por usuario
- `GET /api/audit/entity/:type/:id` - Logs por entidad

## 🔐 Autenticación

Todas las rutas (excepto `/health` y `/auth/login`) requieren autenticación JWT:

```bash
Authorization: Bearer <token>
```

## 📊 Estado del Desarrollo

- ✅ Estructura del proyecto configurada
- ⏳ Esquema de base de datos (en progreso)
- ⏳ Controladores (pendiente)
- ⏳ Servicios (pendiente)
- ⏳ Testing (pendiente)

## 🔧 Scripts Disponibles

- `npm run dev` - Desarrollo con hot reload
- `npm run build` - Compilar TypeScript
- `npm start` - Ejecutar en producción
- `npm run db:generate` - Generar cliente Prisma
- `npm run db:migrate` - Ejecutar migraciones
- `npm run db:reset` - Resetear base de datos
- `npm run db:seed` - Poblar con datos de prueba