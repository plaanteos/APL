# Descripción de la Base de Datos APL

## 📊 Análisis del Modelo Relacional (MR)

### ¿Cuántas tablas aparecen?
En el Modelo Relacional se identifican **9 tablas**.

### ¿Cuáles son los nombres de las tablas?
Las tablas presentes son:
- administrador
- cliente
- pedidos
- producto
- detalle_pedidos
- estado
- pago
- detalle_pago
- auditoria

### ¿Se observan las relaciones principales entre tablas?
Sí. El modelo presenta relaciones claras mediante claves foráneas, representadas por líneas entre las tablas:

- **administrador** se relaciona con cliente, pedidos, producto y pago.
- **cliente** se relaciona con pedidos.
- **pedidos** se relaciona con detalle_pedidos y detalle_pago.
- **producto** se relaciona con detalle_pedidos.
- **estado** se relaciona con detalle_pedidos para indicar el estado.
- **pago** se relaciona con detalle_pago.

Estas relaciones aseguran integridad referencial y trazabilidad administrativa.

---

## 📋 Análisis del Diccionario de Datos

### Tabla CLIENTE
Campos y tipos:
- **id** (INT, PK): identificador único del cliente.
- **nombre** (VARCHAR(100)): nombre del cliente.
- **telefono** (VARCHAR(20)): teléfono de contacto.
- **email** (VARCHAR(100)): correo electrónico.
- **id_administrador** (INT, FK): administrador responsable del cliente.

---

### Tabla PEDIDOS
Campos y tipos:
- **id** (INT, PK): identificador único del pedido.
- **id_cliente** (INT, FK): cliente que realiza el pedido.
- **fecha_pedido** (DATE): fecha de realización del pedido.
- **fecha_entrega** (DATE): fecha estimada o real de entrega.
- **fecha_delete** (DATE): baja lógica del pedido.
- **id_administrador** (INT, FK): administrador que registró el pedido.

**¿Tiene montoPagado y montoPendiente?**  
No existen campos explícitos para `montoPagado` ni `montoPendiente`.

Estos valores se **calculan dinámicamente** a partir de:
- **detalle_pedidos** → valor total del pedido.
- **detalle_pago** → suma de los pagos realizados.

---

### Enums / Catálogos

#### EstadoPedido
Se gestiona mediante la tabla **estado**, que funciona como catálogo:
- id (PK)
- descripcion (ej.: pendiente, en_proceso, entregado, cancelado)
- fecha_insert
- fecha_delete

#### TipoCliente
No existe un enum o catálogo para **TipoCliente**.  
Todos los clientes comparten la misma estructura y no se diferencian por tipo.

---

## 🧠 Observación General
El diseño prioriza la normalización, el cálculo dinámico de montos y el uso de catálogos para estados, lo que reduce redundancia y mejora la integridad de los datos, a costa de consultas más complejas para reportes y balances.
