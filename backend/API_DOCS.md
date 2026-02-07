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
# 📚 API Documentation - APL Backend

## 🔗 Base URL
```txt
http://localhost:3001/api
```

## 🔐 Autenticación (JWT)
Todas las rutas (excepto login/register/forgot/reset/refresh) requieren token JWT:
```txt
Authorization: Bearer <token>
```

## 🧾 Tipos y convenciones
- **IDs**: numéricos (enteros). Ej: `id_cliente: 12`.
- **Fechas**: ISO 8601 (ej: `2026-02-05` o `2026-02-05T12:00:00.000Z`).
- **Respuestas**: formato `{ success, data?, message?, error?, details? }`.

---

## 🔑 Auth

### POST /auth/login
Login (si el usuario tiene 2FA habilitado, requiere `otp` o `backupCode`).
```json
{
  "email": "admin@apl-dental.com",
  "password": "tu_password",
  "otp": "123456",
  "backupCode": "ABCDE-FGHIJ"
}
```
Notas:
- Si falta 2FA cuando aplica, responde `401` con `requires2fa: true`.

### POST /auth/register
Registrar administrador.
```json
{
  "email": "nuevo@email.com",
  "usuario": "admin2",
  "password": "PasswordNoSoloNumeros1",
  "nombre": "Nombre",
  "telefono": "+598999999999",
  "super_usuario": false
}
```

### POST /auth/refresh
Renovar access token con refresh token.
```json
{ "refreshToken": "<refreshToken>" }
```

### POST /auth/logout
Requiere auth. Invalida refresh token almacenado.

### GET /auth/me
Requiere auth. Devuelve usuario actual.

### PUT /auth/change-password
Requiere auth.
```json
{ "currentPassword": "actual", "newPassword": "NuevaPassword1" }
```

### POST /auth/forgot-password
Solicita link de recuperación (siempre responde OK por seguridad).
```json
{ "email": "admin@apl-dental.com" }
```

### POST /auth/reset-password
Restablece contraseña con token.
```json
{ "token": "<token>", "newPassword": "NuevaPassword1" }
```

### 2FA (requiere auth)
- POST `/auth/2fa/setup`
- POST `/auth/2fa/enable` body: `{ "otp": "123456" }`
- POST `/auth/2fa/disable` body: `{ "password": "tu_password", "otp": "123456", "backupCode": "ABCDE-FGHIJ" }` (otp/backup opcional según config)

---

## 👥 Clientes (requiere auth)
- GET `/clients` (query: `page`, `limit`, `search`)
- GET `/clients/stats`
- POST `/clients`
```json
{ "nombre": "Clínica Test", "email": "test@test.com", "telefono": "099123456", "id_administrador": 1 }
```
- GET `/clients/:id`
- GET `/clients/:id/balance`
- GET `/clients/:id/balance/export`
- PUT `/clients/:id`
- DELETE `/clients/:id`

---

## 📋 Pedidos (requiere auth)
- GET `/orders` (query: `page`, `limit`, `search`, `id_cliente`, `id_administrador`, `fechaDesde`, `fechaHasta`)
- GET `/orders/stats`
- POST `/orders`
```json
{
  "id_cliente": 1,
  "fecha_entrega": "2026-02-10",
  "id_administrador": 1,
  "detalles": [
    { "id_producto": 1, "cantidad": 1, "precio_unitario": 15000, "paciente": "Juan Pérez", "id_estado": 1 }
  ]
}
```
- GET `/orders/:id`
- PUT `/orders/:id`
- DELETE `/orders/:id`
- POST `/orders/:id/detalles`
- PUT `/orders/:id/detalles/:detalleId`
- DELETE `/orders/:id/detalles/:detalleId`
- PATCH `/orders/:id/deliver`

---

## 💰 Pagos (requiere auth)
- GET `/payments` (query: `page`, `limit`, `search`, `id_administrador`, `id_pedido`, `fechaDesde`, `fechaHasta`)
- GET `/payments/stats`
- POST `/payments`
```json
{
  "valor": 5000,
  "id_administrador": 1,
  "fecha_pago": "2026-02-05",
  "detalles": [{ "id_pedido": 10, "valor": 5000 }]
}
```
- GET `/payments/:id`
- PUT `/payments/:id`
- DELETE `/payments/:id`

---

## 🧾 Auditoría (requiere auth)
- GET `/audit`
- GET `/audit/stats`
- DELETE `/audit/cleanup` (solo super usuario)

---

## 📦 Productos (requiere auth)
- GET `/productos`
- GET `/productos/stats`
- GET `/productos/:id`
- POST `/productos`
- PUT `/productos/:id`
- DELETE `/productos/:id`

---

## 🏷️ Estados (requiere auth)
- GET `/estados`
- GET `/estados/stats`
- GET `/estados/:id`
- POST `/estados`
- PUT `/estados/:id`
- DELETE `/estados/:id`

---

## 🔔 Notificaciones (requiere auth)
### POST /notifications/send
Envío (directo o en cola si Redis está habilitado).

---

## ✅ Health Check
### GET /health
```json
{ "status": "OK", "message": "APL Dental Lab API is running", "timestamp": "2026-02-05T00:00:00.000Z" }
```