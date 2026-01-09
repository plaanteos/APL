# 📚 API Documentation - APL Backend

## 🔗 Base URL
```
http://localhost:3001/api
```

## 🔐 Autenticación
Todas las rutas (excepto login/register) requieren token JWT en el header:
```
Authorization: Bearer <token>
```

---

## 🔑 Autenticación

### POST /auth/login
Iniciar sesión
```json
{
  "email": "admin@apl-dental.com",
  "password": "AdminAnto17$"
}
```

### POST /auth/register
Registrar usuario
```json
{
  "email": "nuevo@email.com",
  "username": "usuario",
  "password": "contraseña123",
  "nombres": "Nombre",
  "apellidos": "Apellido",
  "telefono": "+598999999999",
  "rol": "ADMIN"
}
```

### GET /auth/me
Obtener usuario actual

### POST /auth/logout
Cerrar sesión

### PUT /auth/change-password
Cambiar contraseña
```json
{
  "currentPassword": "actual",
  "newPassword": "nueva123"
}
```

---

## 👥 Clientes

### GET /clients
Listar clientes
**Query params:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)
- `search`: Búsqueda por nombre, email, teléfono
- `tipo`: CLINICA | ODONTOLOGO
- `activo`: true | false

### POST /clients
Crear cliente
```json
{
  "nombre": "Clínica Dental Nueva",
  "email": "contacto@clinica.com",
  "telefono": "+598991234567",
  "whatsapp": "+598991234567",
  "tipo": "CLINICA",
  "direccion": "Dirección 123",
  "ciudad": "Montevideo",
  "codigoPostal": "11200",
  "observaciones": "Observaciones opcionales"
}
```

### GET /clients/:id
Obtener cliente por ID

### PUT /clients/:id
Actualizar cliente

### DELETE /clients/:id
Eliminar cliente (marca como inactivo)

### GET /clients/stats
Estadísticas de clientes

---

## 📋 Pedidos

### GET /orders
Listar pedidos
**Query params:**
- `page`, `limit`: Paginación
- `search`: Búsqueda general
- `clienteId`: Filtrar por cliente
- `estado`: PENDIENTE | EN_PROCESO | ENTREGADO | PAGADO | CANCELADO
- `prioridad`: BAJA | NORMAL | ALTA | URGENTE
- `dateFrom`, `dateTo`: Rango de fechas

### POST /orders
Crear pedido
```json
{
  "clienteId": "cliente_id",
  "nombrePaciente": "Juan Pérez",
  "fechaVencimiento": "2026-01-15",
  "descripcion": "Corona de porcelana",
  "tipoPedido": "Corona",
  "cantidad": 1,
  "precioUnitario": 15000,
  "prioridad": "NORMAL",
  "observaciones": "Color A2",
  "detalles": [
    {
      "descripcion": "Corona de porcelana",
      "tipoTrabajo": "Prótesis",
      "material": "Porcelana",
      "cantidad": 1,
      "precioUnitario": 15000,
      "observaciones": "Especificaciones del detalle"
    }
  ]
}
```

### GET /orders/:id
Obtener pedido por ID

### PUT /orders/:id
Actualizar pedido

### PATCH /orders/:id/status
Cambiar estado del pedido
```json
{
  "estado": "EN_PROCESO"
}
```

### DELETE /orders/:id
Eliminar pedido

### GET /orders/stats
Estadísticas de pedidos

---

## 💰 Pagos

### GET /payments
Listar pagos
**Query params:**
- `page`, `limit`: Paginación
- `search`: Búsqueda general
- `pedidoId`: Filtrar por pedido
- `clienteId`: Filtrar por cliente
- `metodoPago`: EFECTIVO | TRANSFERENCIA | TARJETA_CREDITO | TARJETA_DEBITO | CHEQUE
- `fechaDesde`, `fechaHasta`: Rango de fechas
- `procesadoPor`: Usuario que procesó

### POST /payments
Registrar pago
```json
{
  "pedidoId": "pedido_id",
  "monto": 7500,
  "metodoPago": "TRANSFERENCIA",
  "fechaPago": "2026-01-07",
  "numeroRecibo": "REC-001",
  "numeroTransf": "TRANS123456",
  "observaciones": "Pago parcial del 50%"
}
```

### GET /payments/:id
Obtener pago por ID

### PUT /payments/:id
Actualizar pago

### DELETE /payments/:id
Eliminar pago (solo admin)

### GET /payments/order/:orderId
Obtener pagos de un pedido específico

### GET /payments/balance
Obtener balance y estadísticas financieras
**Query params:**
- `fechaDesde`, `fechaHasta`: Rango de fechas
- `clienteId`: Balance de cliente específico
- `metodoPago`: Filtrar por método de pago

### GET /payments/stats
Estadísticas rápidas de pagos

---

## 🔍 Auditoría

### GET /audit
Listar logs de auditoría (admin)
**Query params:**
- `page`, `limit`: Paginación
- `administradorId`: Por usuario
- `accion`: CREAR | ACTUALIZAR | ELIMINAR | LOGIN | LOGOUT | CAMBIO_ESTADO
- `tipoEntidad`: cliente | pedido | pago | administrador | auth
- `entidadId`: ID de la entidad
- `fechaDesde`, `fechaHasta`: Rango de fechas
- `direccionIP`: Por IP
- `search`: Búsqueda general

### GET /audit/:id
Detalle de log específico (admin)

### GET /audit/user/:userId
Logs por usuario (admin o propio)

### GET /audit/entity/:entityType/:entityId
Logs por entidad específica (admin)

### GET /audit/stats
Estadísticas de auditoría

### GET /audit/export
Exportar logs (admin)
**Query params:**
- `formato`: json | csv
- Mismos filtros que GET /audit

### DELETE /audit/cleanup
Limpiar logs antiguos (admin)
**Query params:**
- `dias`: Días de retención (default: 90)

---

## ✅ Health Check

### GET /health
Estado del servidor
```json
{
  "status": "OK",
  "message": "APL Dental Lab API is running",
  "timestamp": "2026-01-07T10:00:00.000Z"
}
```

---

## 📊 Respuestas de la API

### Formato de respuesta exitosa:
```json
{
  "success": true,
  "data": { /* datos */ },
  "message": "Mensaje opcional"
}
```

### Formato de respuesta con paginación:
```json
{
  "success": true,
  "data": [ /* array de datos */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Formato de respuesta de error:
```json
{
  "success": false,
  "error": "Mensaje de error",
  "details": [ /* detalles opcionales */ ]
}
```

---

## 🔒 Códigos de Estado HTTP

- `200` - OK
- `201` - Creado
- `400` - Petición inválida
- `401` - No autenticado
- `403` - Sin permisos
- `404` - No encontrado
- `500` - Error del servidor

---

## 🚀 Ejemplos de Uso

### 1. Flujo de autenticación:
```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@apl-dental.com","password":"AdminAnto17$"}'

# 2. Usar token en siguientes requests
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/clients
```

### 2. Crear cliente y pedido:
```bash
# 1. Crear cliente
curl -X POST http://localhost:3001/api/clients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Clínica Test","email":"test@test.com","telefono":"+598999999999","tipo":"CLINICA"}'

# 2. Crear pedido
curl -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"clienteId":"<cliente_id>","nombrePaciente":"Test Patient","fechaVencimiento":"2026-01-15","descripcion":"Test order","tipoPedido":"Test","cantidad":1,"precioUnitario":10000}'

# 3. Registrar pago
curl -X POST http://localhost:3001/api/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pedidoId":"<pedido_id>","monto":5000,"metodoPago":"EFECTIVO"}'
```

---

## 📝 Notas Importantes

1. **Fechas**: Usar formato ISO 8601 (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss.sssZ)
2. **Decimales**: Montos como números (ej: 15000.50, no "15000.50")
3. **IDs**: Todos los IDs son strings generados automáticamente
4. **Paginación**: Por defecto página 1 con límite 10
5. **Búsqueda**: Case-insensitive y busca en múltiples campos
6. **Auditoría**: Todas las operaciones se registran automáticamente