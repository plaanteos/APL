# 📦 Guía de Instalación - APL Backend

## ⚠️ Requisitos Previos

### 1. Instalar Node.js
Descarga e instala Node.js desde: https://nodejs.org/
- Versión recomendada: **Node.js 18.x LTS** o superior
- Esto incluye npm automáticamente

### 2. Instalar PostgreSQL
Descarga e instala PostgreSQL desde: https://www.postgresql.org/download/
- Versión recomendada: **PostgreSQL 14** o superior
- Anota las credenciales (usuario: postgres, contraseña)
- Instala pgAdmin 4 para gestión visual (opcional pero recomendado)

## 🚀 Pasos de Instalación

### 1. Verificar instalaciones
```bash
node --version    # Debe mostrar v18.x.x o superior
npm --version     # Debe mostrar 9.x.x o superior
psql --version    # Debe mostrar 14.x o superior
```

### 2. Instalar dependencias del backend
```bash
cd backend
npm install
```

### 3. Configurar base de datos
```bash
# Editar archivo .env con tus credenciales de PostgreSQL
# Cambiar la línea:
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/apl_dental_lab?schema=public"
```

### 3.1 Configurar Gmail (SMTP) y URL del frontend (recuperar contraseña)

En tu `.env` agrega (ejemplo):

```bash
# URL del frontend para armar el link de recuperación
FRONTEND_URL="http://localhost:5173"

# Gmail/SMTP (recomendado: App Password, no tu password normal)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-cuenta@gmail.com"
SMTP_PASS="TU_APP_PASSWORD"
```

### 3.2 Configurar WhatsApp (Cloud API de Meta)

Opcional. En tu `.env` agrega:

```bash
WHATSAPP_TOKEN="EAAG..."
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
WHATSAPP_API_VERSION="v19.0"

# (Opcional) también enviar link de recuperación por WhatsApp
PASSWORD_RESET_SEND_WHATSAPP="false"
```

### 3.3 Configurar cola de trabajos (BullMQ + Redis) - opcional

Recomendado si querés que el envío de **Email/WhatsApp** se procese en segundo plano (reintentos, sin bloquear requests).

En tu `.env` agrega:

```bash
# Redis (Upstash/Redis Cloud/local) para la cola de trabajos
REDIS_URL="redis://localhost:6379"

# Opcional: forzar habilitar/deshabilitar la cola de notificaciones
# Si NO está en "false" y existe REDIS_URL, la cola se usa automáticamente.
NOTIFICATION_QUEUE_ENABLED="true"
```

### 4. Crear base de datos
```bash
# Conectarse a PostgreSQL y crear la base de datos
psql -U postgres
CREATE DATABASE apl_dental_lab;
\q
```

**Alternativa con pgAdmin:**
1. Abrir pgAdmin 4
2. Conectarse al servidor PostgreSQL
3. Click derecho en "Databases" → "Create" → "Database"
4. Nombre: `apl_dental_lab`
5. Owner: `postgres`
6. Click "Save"

### 5. Ejecutar migraciones
```bash
npm run db:generate   # Generar cliente Prisma
npm run db:migrate    # Crear tablas
npm run db:seed       # Poblar con datos de prueba
```

### 6. Ejecutar servidor
```bash
npm run dev          # Modo desarrollo
# o
npm run build && npm start  # Modo producción
```

## ✅ Verificación

Si todo está correcto, deberías ver:
```
🚀 APL Backend API server running on port 3001
✅ Connected to PostgreSQL database
📋 Environment: development
🔗 Health check: http://localhost:3001/health
```

## 🔧 Troubleshooting

### Error de conexión a PostgreSQL
- Verificar que PostgreSQL esté corriendo:
  - Windows: Servicios → PostgreSQL
  - Linux/Mac: `sudo systemctl status postgresql`
- Verificar credenciales en .env
- Verificar que existe la base de datos: `psql -U postgres -l`
- Verificar puerto 5432 no esté bloqueado

### Error de npm install
- Verificar que Node.js esté instalado correctamente
- Limpiar caché: `npm cache clean --force`
- Eliminar node_modules y volver a instalar

### Error "relation does not exist"
- Asegurarse de haber ejecutado las migraciones: `npm run db:migrate`
- Si persiste, resetear: `npm run db:reset` (⚠️ Elimina todos los datos)

## 📞 Credenciales por defecto

**Usuario administrador:**
- Email: admin@apl-dental.com
- Usuario: AdminAnto  
- Contraseña: AdminAnto17$

## 🔑 Comandos PostgreSQL útiles

```bash
# Conectarse a la base de datos
psql -U postgres -d apl_dental_lab

# Listar bases de datos
\l

# Listar tablas
\dt

# Ver estructura de una tabla
\d nombre_tabla

# Salir
\q
```