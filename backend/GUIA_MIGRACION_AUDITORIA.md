# Guía de Migración - Añadir Auditoría Automática

## Cómo agregar auditoría a las rutas existentes

### Ejemplo: Aplicar auditoría a rutas de clientes

**Antes:**
```typescript
// client.routes.ts
import { ClientController } from '../controllers/client.controller';

router.post('/', authenticate, ClientController.createClient);
router.put('/:id', authenticate, ClientController.updateClient);
router.delete('/:id', authenticate, ClientController.deleteClient);
```

**Después:**
```typescript
// client.routes.ts
import { ClientController } from '../controllers/client.controller';
import { 
  auditClientCreate, 
  auditClientUpdate, 
  auditClientDelete 
} from '../middleware/auditLogger';

// Agregar middleware de auditoría después de authenticate
router.post('/', authenticate, auditClientCreate, ClientController.createClient);
router.put('/:id', authenticate, auditClientUpdate, ClientController.updateClient);
router.delete('/:id', authenticate, auditClientDelete, ClientController.deleteClient);
```

---

### Ejemplo: Aplicar auditoría a rutas de pedidos

```typescript
// order.routes.ts
import { OrderController } from '../controllers/order.controller';
import { 
  auditOrderCreate, 
  auditOrderUpdate,
  auditOrderStatusChange,
  auditOrderDelete 
} from '../middleware/auditLogger';

router.post('/', authenticate, auditOrderCreate, OrderController.createOrder);
router.put('/:id', authenticate, auditOrderUpdate, OrderController.updateOrder);
router.patch('/:id/status', authenticate, auditOrderStatusChange, OrderController.updateStatus);
router.delete('/:id', authenticate, auditOrderDelete, OrderController.deleteOrder);
```

---

### Ejemplo: Aplicar auditoría a rutas de pagos

```typescript
// payment.routes.ts
import { PaymentController } from '../controllers/payment.controller';
import { 
  auditPaymentCreate, 
  auditPaymentUpdate,
  auditPaymentDelete 
} from '../middleware/auditLogger';

router.post('/', authenticate, auditPaymentCreate, PaymentController.createPayment);
router.put('/:id', authenticate, auditPaymentUpdate, PaymentController.updatePayment);
router.delete('/:id', authenticate, auditPaymentDelete, PaymentController.deletePayment);
```

---

## Middleware de Auditoría Personalizado

Si necesitas crear auditoría para una nueva entidad:

```typescript
import { auditLog } from '../middleware/auditLogger';

export const auditProductCreate = auditLog({
  entityType: 'producto',
  action: 'CREAR',
  description: (req) => `Producto creado: ${req.body.nombre}`,
});

export const auditProductUpdate = auditLog({
  entityType: 'producto',
  action: 'ACTUALIZAR',
  getEntityId: (req) => req.params.id,
  getOldData: async (req) => {
    // Obtener datos anteriores de la base de datos
    const producto = await prisma.producto.findUnique({
      where: { id: req.params.id }
    });
    return producto;
  },
  description: (req) => `Producto actualizado: ${req.params.id}`,
});
```

---

## Auditoría Manual en Controladores

Si prefieres llamar a la auditoría manualmente en los controladores:

```typescript
import { AuditService } from '../services/audit.service';

export class ClientController {
  static async createClient(req: Request, res: Response) {
    try {
      const clientData = req.body;
      const newClient = await prisma.cliente.create({ data: clientData });

      // Registrar en auditoría manualmente
      await AuditService.logCreate(
        req,
        'cliente',
        newClient.id,
        newClient,
        `Cliente creado: ${newClient.nombre}`
      );

      res.status(201).json({
        success: true,
        data: newClient,
      });
    } catch (error) {
      // ...
    }
  }
}
```

---

## Métodos de Auditoría Disponibles

### AuditService

```typescript
// Crear
await AuditService.logCreate(req, 'cliente', entityId, newData, description);

// Actualizar
await AuditService.logUpdate(req, 'pedido', entityId, oldData, newData, description);

// Eliminar
await AuditService.logDelete(req, 'pago', entityId, deletedData, description);

// Cambio de estado
await AuditService.logStatusChange(req, 'pedido', entityId, oldStatus, newStatus, description);

// Login
await AuditService.logLogin(req, userId, email);

// Logout
await AuditService.logLogout(req, userId, email);
```

---

## Configuración Recomendada

### Habilitar auditoría en todas las rutas críticas

**✅ Auditar:**
- Creación de registros (POST)
- Actualización de registros (PUT/PATCH)
- Eliminación de registros (DELETE)
- Cambios de estado importantes
- Login/Logout

**❌ No auditar:**
- Consultas de lectura (GET)
- Endpoints de salud (health checks)
- Búsquedas simples

---

## Verificar que funciona

1. Realizar una operación (crear cliente, actualizar pedido, etc.)
2. Verificar en la base de datos:

```sql
SELECT * FROM auditoria 
ORDER BY timestamp DESC 
LIMIT 10;
```

3. O usar el endpoint:

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/audit?page=1&limit=10
```

---

## Notas Importantes

- La auditoría NO interfiere con la operación principal
- Si falla el registro de auditoría, la operación continúa
- Los logs se registran automáticamente al finalizar la respuesta
- Solo se auditan operaciones exitosas (status 2xx)
- Requiere usuario autenticado (usa `req.user.id`)
