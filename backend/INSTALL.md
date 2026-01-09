# 📦 Guía de Instalación - APL Backend

## ⚠️ Requisitos Previos

### 1. Instalar Node.js
Descarga e instala Node.js desde: https://nodejs.org/
- Versión recomendada: **Node.js 18.x LTS** o superior
- Esto incluye npm automáticamente

### 2. Instalar MySQL
Descarga e instala MySQL desde: https://dev.mysql.com/downloads/mysql/
- Versión recomendada: **MySQL 8.0** o superior
- Anota las credenciales (usuario: root, contraseña)

## 🚀 Pasos de Instalación

### 1. Verificar instalaciones
```bash
node --version    # Debe mostrar v18.x.x o superior
npm --version     # Debe mostrar 9.x.x o superior
mysql --version   # Debe mostrar 8.x.x o superior
```

### 2. Instalar dependencias del backend
```bash
cd backend
npm install
```

### 3. Configurar base de datos
```bash
# Editar archivo .env con tus credenciales de MySQL
# Cambiar la línea:
DATABASE_URL="mysql://root:TU_PASSWORD@localhost:3306/apl_dental_lab"
```

### 4. Crear base de datos
```bash
# Conectarse a MySQL y crear la base de datos
mysql -u root -p
CREATE DATABASE apl_dental_lab;
exit;
```

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
✅ Connected to MySQL database
📋 Environment: development
🔗 Health check: http://localhost:3001/health
```

## 🔧 Troubleshooting

### Error de conexión a MySQL
- Verificar que MySQL esté corriendo
- Verificar credenciales en .env
- Verificar que existe la base de datos

### Error de npm install
- Verificar que Node.js esté instalado correctamente
- Limpiar caché: `npm cache clean --force`
- Eliminar node_modules y volver a instalar

## 📞 Credenciales por defecto

**Usuario administrador:**
- Email: admin@apl-dental.com
- Usuario: AdminAnto  
- Contraseña: AdminAnto17$