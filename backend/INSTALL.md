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