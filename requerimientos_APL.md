# Requerimientos del Proyecto APL

## Requerimientos Funcionales

### RF-01: Login
**Actor:** Usuario Administrador  
**Descripción:**  
El sistema debe permitir al usuario administrador ingresar a la plataforma de Administración APL mediante usuario y contraseña para gestionar los pedidos de los diferentes clientes.

---

### RF-02: Dashboard Inicial
**Actor:** Usuario Administrador  
**Descripción:**  
Luego de iniciar sesión, el sistema debe mostrar un dashboard inicial que permita visualizar:
- Total de pedidos  
- Total de ingresos  
- Total de clientes  
- Total de pedidos pendientes  
- Calendario para visualizar o solicitar pedidos  
- Acción de logout  
- Barra de navegación hacia las demás bandejas  

---

### RF-03: Bandeja de Pedidos
**Actor:** Usuario Administrador  
**Descripción:**  
El sistema debe permitir acceder a una bandeja de pedidos para:
- Consultar el estado de los pedidos  
- Cargar nuevos pedidos  
- Seleccionar pedidos y acceder a su balance correspondiente  

---

### RF-04: Bandeja de Clientes
**Actor:** Usuario Administrador  
**Descripción:**  
El sistema debe permitir acceder a una bandeja de clientes para:
- Consultar información de clientes  
- Cargar nuevos clientes  
- Acceder al balance de cada cliente  
- Enviar mensajes al cliente mediante email o WhatsApp desde un modal  

---

### RF-05: Bandeja de Balance
**Actor:** Usuario Administrador  
**Descripción:**  
El sistema debe permitir acceder a una bandeja de balance para:
- Gestionar pagos de pedidos  
- Visualizar el balance total  
- Consultar balances por cliente  
- Agregar pedidos y pagos  
- Marcar pedidos como entregados  
- Enviar el balance al cliente por WhatsApp o email  
- Descargar el balance del cliente en formato Excel  

---

## Requerimientos de Base de Datos

### RBD-01: Normalización
La base de datos debe contemplar tres niveles de normalización:
- **Normalización 1:** Administrador, Cliente, Pedidos  
- **Normalización 2:** Detalle_Pedido, Pago  
- **Normalización 3:** Auditoría  

---

### RBD-02: Implementación Técnica
La base de datos debe incluir:
- Creación de la base de datos en MySQL  
- Creación de tablas  
- Creación de usuarios y permisos  
- Creación de índices  
- Creación de triggers  
- Scripts de inserción de datos  
- Consultas para validación de datos y pruebas de triggers  

---

## Requerimientos No Funcionales

### RNF-01: Plataforma Web
El sistema debe contar con una aplicación web accesible desde diferentes direcciones IP.

---

### RNF-02: Plataforma Mobile
El sistema debe contar con una aplicación mobile compatible con Android e iOS.

---

### RNF-03: Seguridad
El sistema debe permitir la autenticación mediante credenciales y la gestión de cambio de contraseña desde la aplicación web o mobile.

---

### RNF-04: Escalabilidad y Robustez
El backend y la base de datos deben estar preparados para manejar grandes volúmenes de datos y consultas constantes.

