# Documento Tecnico del Proyecto APL

Fecha: 23 de abril de 2026

## 1. Objetivo del documento

Este documento resume la arquitectura tecnica actual del sistema APL a partir del estado real del repositorio. Su objetivo es servir como material de presentacion, relevamiento y base para conversaciones tecnicas, operativas y de evolucion del producto.

APL es una plataforma web orientada a la gestion administrativa de un laboratorio dental. El sistema cubre autenticacion, gestion de clientes, pedidos, pagos, balance, catalogos, auditoria, notificaciones y conexion de WhatsApp por usuario.

## 2. Resumen ejecutivo

El proyecto esta organizado como un monorepo liviano con dos aplicaciones principales:

- Backend API en Node.js, Express y TypeScript.
- Frontend web en React y Vite.

La persistencia se resuelve con PostgreSQL y Prisma ORM. La aplicacion expone una API REST autenticada con JWT y contempla integraciones para email, WhatsApp y procesamiento asincrono de notificaciones con Redis y BullMQ cuando la infraestructura lo permite.

Adicionalmente, el proyecto incluye artefactos SQL, scripts de evidencia, configuraciones de despliegue y documentacion operativa que facilitan instalacion, auditoria y mantenimiento.

## 3. Estructura general del proyecto

La solucion esta compuesta por los siguientes bloques principales:

- backend/: API, logica de negocio, acceso a datos, scripts y pruebas.
- figma/: aplicacion frontend construida con React + Vite.
- BD/: documentacion y artefactos de base de datos de apoyo.
- render.yaml: configuracion de despliegue del backend en Render.
- netlify.toml: configuracion de despliegue del frontend en Netlify.

## 4. Stack tecnologico

### Backend

- Node.js 18+.
- Express.js como framework HTTP.
- TypeScript como lenguaje principal.
- Prisma ORM para acceso a datos.
- PostgreSQL como motor de base de datos.
- Zod para validacion de entrada.
- JWT para autenticacion y renovacion de sesion.
- bcryptjs para hashing de contrasenas.
- Helmet, CORS y express-rate-limit para endurecimiento basico de seguridad.
- BullMQ + Redis para procesamiento asincrono opcional.
- Nodemailer para correo SMTP.
- Integraciones HTTP con Resend y SendGrid para correo saliente.
- Baileys para sesiones multiusuario de WhatsApp Web.
- ExcelJS para exportaciones de balance.
- Vitest para testing.

### Frontend

- React 18.
- Vite 6.
- TypeScript.
- Axios para consumo de API.
- Tailwind CSS 4.
- Radix UI y componentes utilitarios de interfaz.
- Lucide React y MUI Icons para iconografia.
- Zod para validacion de formularios.
- Sonner para feedback visual.

### Infraestructura y despliegue

- Render para backend.
- Netlify para frontend.
- PostgreSQL externo para ambientes productivos o staging.
- Redis opcional para cola de notificaciones.

## 5. Arquitectura de alto nivel

La arquitectura sigue un esquema web clasico de tres capas:

1. Capa de presentacion: frontend React ejecutado en navegador.
2. Capa de servicios: API REST en Express que centraliza autenticacion, reglas de negocio e integraciones.
3. Capa de datos: PostgreSQL accedido principalmente a traves de Prisma y, en algunos casos, consultas SQL directas para agregaciones y reportes.

Flujo general:

- El usuario accede al frontend.
- El frontend autentica contra la API.
- La API emite access token y refresh token.
- El frontend consume endpoints autenticados para operar clientes, pedidos, pagos, balance y catalogos.
- La API persiste la informacion en PostgreSQL.
- Las notificaciones pueden enviarse en forma directa o mediante cola asincrona.
- La mensajeria de WhatsApp se apoya en sesiones multiusuario asociadas al administrador autenticado.

## 6. Composicion del backend

El backend esta organizado por capas y responsabilidades:

### 6.1 Punto de entrada y configuracion

El entrypoint principal inicializa Express, valida variables de entorno, configura seguridad, CORS, rate limiting, logs, parsing de body, rutas y manejo de errores. Tambien prepara la conexion a base de datos y puede iniciar el worker de notificaciones y la carga de sesiones de WhatsApp.

### 6.2 Estructura interna

- src/controllers/: controla la entrada HTTP y transforma requests/responses.
- src/routes/: define endpoints y vincula middlewares con controladores.
- src/services/: concentra logica reusable e integraciones externas.
- src/middleware/: autenticacion, errores, logging y filtros transversales.
- src/utils/: helpers, cliente Prisma, validaciones, templates y utilidades de soporte.
- src/queues/: cola de notificaciones con BullMQ.
- src/scripts/: automatizacion operativa y evidencia tecnica.
- prisma/: esquema de datos, seed y scripts SQL.

### 6.3 Modulos funcionales principales

El backend expone los siguientes dominios funcionales:

- Auth: login, registro, refresh, logout, usuario actual, cambio de contrasena, recuperacion de acceso y 2FA.
- Clientes: CRUD, busqueda, metricas y balance por cliente.
- Pedidos: CRUD, detalles del pedido, filtros, stats y entrega.
- Pagos: CRUD, stats y aplicacion de pagos a pedidos.
- Productos: catalogo de productos.
- Estados: catalogo de estados del flujo de trabajo.
- Auditoria: logs y estadisticas operativas.
- Notificaciones: envio por email o WhatsApp.
- Gastos: gestion de otros gastos operativos.
- WhatsApp: conexion, estado y administracion de sesiones por usuario.

### 6.4 Patron de funcionamiento

En terminos generales, cada request sigue esta secuencia:

- Route recibe el endpoint.
- Middleware valida autenticacion o reglas transversales.
- Controller valida el payload con Zod y coordina la operacion.
- Service ejecuta la logica de negocio o la integracion externa.
- Prisma o SQL resuelven la persistencia.
- Se devuelve una respuesta JSON uniforme al frontend.

### 6.5 Seguridad implementada en backend

- JWT con access token de corta vida y refresh token persistido en base.
- Hash de contrasenas con bcrypt.
- 2FA para cuentas administrativas mediante TOTP y backup codes.
- Rate limiting sobre login para mitigar fuerza bruta.
- Helmet para headers de seguridad.
- CORS controlado con origenes permitidos y soporte para previews de Netlify.
- Aislamiento por administrador autenticado en los modulos multiusuario.
- Auditoria de eventos relevantes y de intentos fallidos de acceso.

## 7. Integraciones del backend

### 7.1 Correo electronico

El sistema soporta varios caminos para envio de email:

- SMTP clasico mediante Nodemailer.
- Resend por API HTTP.
- SendGrid por API HTTP.
- Google Apps Script como alternativa cuando SMTP no es viable en hosting.

Estas integraciones se usan tanto para comunicaciones manuales como para recuperacion de contrasena y envio de informacion a clientes.

### 7.2 WhatsApp

La integracion principal activa en el codigo esta basada en Baileys y sesiones multiusuario. Esto permite que cada administrador gestione su propia conexion de WhatsApp, incluyendo persistencia cifrada de la sesion y reconexion automatica.

El backend tambien conserva trazas documentales de una integracion con Cloud API de Meta, pero el servicio operativo actual actua como proxy del gestor de sesiones con Baileys.

### 7.3 Cola de trabajos

Cuando existe REDIS_URL y la cola esta habilitada, las notificaciones se encolan con BullMQ para desacoplar el request HTTP del envio real. Esto aporta:

- reintentos,
- mejor resiliencia,
- menor tiempo de respuesta al usuario,
- posibilidad de escalar procesamiento asincrono.

Si Redis no esta disponible, el sistema hace fallback a envio directo.

### 7.4 Exportacion de balances

El backend genera archivos Excel para balances de clientes mediante ExcelJS, con posibilidad de adjuntar esos archivos en email o WhatsApp.

## 8. Composicion del frontend

El frontend es una SPA desarrollada con React y Vite, pensada para uso administrativo. La aplicacion trabaja con autenticacion persistente, navegacion interna por vistas y consumo de la API REST del backend.

### 8.1 Vistas principales

Las vistas activas del frontend son:

- Login.
- Dashboard.
- Pedidos.
- Clientes.
- Balance.
- Configuracion de WhatsApp.

### 8.2 Navegacion y experiencia de uso

La aplicacion utiliza una navegacion interna simple orientada a flujo operativo:

- barra superior con usuario y cierre de sesion,
- navegacion inferior para acceso rapido a modulos principales,
- historial de navegacion para volver atras,
- feedback visual para cargas y errores.

### 8.3 Consumo de servicios

El frontend se comunica con la API mediante Axios y centraliza su acceso en servicios por modulo:

- auth.service
- client.service
- order.service
- payment.service
- producto.service
- estado.service
- expense.service
- notification.service
- whatsapp.service

El cliente HTTP agrega automaticamente el Bearer token, maneja refresh de sesion y reintenta requests cuando corresponde.

### 8.4 Autenticacion en frontend

El frontend contempla:

- login con remember me,
- almacenamiento de sesion en localStorage o sessionStorage,
- recuperacion de contrasena por codigo,
- soporte visual para 2FA,
- persistencia del usuario autenticado,
- recuperacion automatica de sesion cuando el token aun es valido.

### 8.5 Modo demo

Existe un modo demo activable por variables de entorno del frontend. En ese modo, la aplicacion puede operar con datos simulados sin depender del backend. Esto es util para:

- demos comerciales,
- pruebas visuales,
- presentaciones sin conectividad.

## 9. Base de datos

### 9.1 Motor y acceso

- Motor: PostgreSQL.
- ORM principal: Prisma.
- Cliente generado: Prisma Client.

### 9.2 Modelo de datos

El modelo de datos principal incluye al menos las siguientes entidades:

- Administrador.
- Cliente.
- tipo_cliente.
- Pedido.
- DetallePedido.
- Producto.
- Estado.
- Pago.
- DetallePago.
- Auditoria.
- OtroGasto.
- WhatsAppSession.
- Message.

Esto muestra que la base actual no solo cubre el nucleo administrativo inicial, sino tambien extensiones para gastos, mensajeria y sesiones persistentes de WhatsApp.

### 9.3 Relaciones relevantes

- Un administrador gestiona clientes, pedidos, pagos, productos, gastos y su sesion de WhatsApp.
- Un cliente pertenece a un administrador y puede tener multiples pedidos.
- Un pedido pertenece a un cliente y contiene multiples detalles.
- Cada detalle de pedido referencia producto y estado.
- Un pago puede distribuirse en varios pedidos por medio de detalle_pago.
- La auditoria conserva trazabilidad de acciones.

### 9.4 Criterios funcionales del modelo

El diseno privilegia normalizacion, integridad referencial y calculo dinamico de montos. Por ejemplo:

- el total del pedido surge de detalle_pedidos,
- el monto pagado surge de detalle_pago,
- el saldo pendiente se calcula a nivel de consulta o servicio.

Esto reduce redundancia y mejora consistencia, aunque demanda consultas agregadas algo mas complejas.

### 9.5 Scripts y artefactos de base de datos

El repositorio incluye artefactos utiles para auditoria y operacion:

- creacion de base de datos,
- roles y permisos,
- queries de validacion,
- constraints adicionales,
- triggers,
- soporte para 2FA en tabla administrador,
- DDL de tablas,
- pruebas de triggers,
- reporte de evidencia reproducible.

Tambien existe un script de evidencia en Node/Prisma que genera JSON bajo backend/logs, lo cual resulta util para respaldo tecnico o auditorias.

## 10. Despliegue y configuracion operativa

### 10.1 Backend

El backend esta preparado para Render con:

- build de TypeScript,
- generacion de Prisma Client,
- health check,
- variables de entorno para JWT, CORS, frontend y correo.

El archivo de despliegue aclara una decision importante: no ejecutar acciones que dependan de la base durante el build para evitar fallas cuando la base externa esta suspendida o no disponible.

### 10.2 Frontend

El frontend esta preparado para Netlify con:

- build en carpeta figma,
- publicacion de dist,
- redirect a index.html para SPA,
- version de Node fijada para el build.

### 10.3 Variables de entorno y dependencias externas

El proyecto depende fuertemente de variables de entorno para operar correctamente. Las mas relevantes cubren:

- DATABASE_URL,
- JWT_SECRET,
- CORS_ORIGIN,
- FRONTEND_URL,
- SMTP_*,
- RESEND_API_KEY,
- SENDGRID_API_KEY,
- EMAIL_FROM,
- REDIS_URL,
- configuracion asociada a modo demo y servicios del frontend.

## 11. Testing, soporte y mantenibilidad

### 11.1 Testing actual

El backend incluye Vitest como framework de pruebas. La base de testing hoy es util, pero acotada. No se observa una cobertura integral de pruebas E2E ni una bateria amplia de integracion frontend-backend.

### 11.2 Soporte operativo

El proyecto ya incorpora varios elementos que facilitan el mantenimiento:

- scripts para seed e inicializacion,
- script para creacion o actualizacion de administrador,
- evidencia reproducible de base,
- documentacion de instalacion,
- despliegues parametrizados,
- logs y auditoria.

## 12. Fortalezas tecnicas del proyecto

- Separacion clara entre frontend y backend.
- Uso de TypeScript en ambos lados del sistema.
- Modelo de datos consistente con reglas administrativas del negocio.
- Seguridad por JWT, hashing de contrasenas y 2FA.
- Integraciones de comunicacion ya contempladas.
- Capacidad de operar con modo demo.
- Cola asincrona opcional para notificaciones.
- Artefactos SQL y evidencia util para presentaciones tecnicas o auditorias.
- Preparacion concreta para despliegue cloud.

## 13. Riesgos y puntos a revisar

Desde una mirada tecnica y de presentacion, conviene mencionar estos puntos con transparencia:

- Parte de la documentacion historica del repositorio parece mezclar estado actual con funcionalidades legacy. Para presentaciones formales conviene usar este documento y el codigo como fuente primaria.
- La estrategia de WhatsApp hoy depende de Baileys y sesiones persistidas, lo cual es potente, pero operativamente mas sensible que una API oficial administrada por proveedor.
- La cobertura automatizada de pruebas todavia puede crecer, especialmente en integracion y frontend.
- El uso de queries agregadas y adjuntos por canales externos requiere monitoreo en ambientes reales para controlar performance y errores transitorios.

## 14. Recomendaciones para sumar al documento o a la presentacion

Si queres elevar este material a nivel de presentacion ejecutiva o tecnica-formal, recomiendo agregar:

### 14.1 Recomendaciones de contenido

- Un diagrama visual de arquitectura con frontend, backend, DB, Redis y servicios externos.
- Un mapa de modulos con responsables funcionales: clientes, pedidos, pagos, balance, auditoria, notificaciones.
- Un cuadro de ambientes: local, testing, staging y produccion.
- Un cuadro de variables criticas por ambiente.
- Un apartado de seguridad y cumplimiento con JWT, 2FA, auditoria y gestion de accesos.
- Un roadmap corto con proximos hitos tecnicos.

### 14.2 Recomendaciones de evolucion tecnica

- Incorporar tests de integracion para auth, clients, orders y payments.
- Agregar pruebas E2E del frontend para login, alta de cliente, alta de pedido y registro de pago.
- Definir observabilidad minima: metricas, alertas y trazabilidad centralizada.
- Evaluar si WhatsApp debe mantenerse via Baileys o migrar a una estrategia oficial administrada segun costo, riesgo y volumen.
- Versionar mas claramente la documentacion funcional versus documentacion historica.
- Formalizar backups, restore test y politica de recuperacion ante incidentes.

## 15. Conclusion

APL presenta una base tecnica solida para una plataforma administrativa web orientada a laboratorio dental. La solucion ya cuenta con un backend desacoplado, frontend operativo, persistencia estructurada, autenticacion robusta, integraciones utiles y despliegue cloud previsto.

Desde una perspectiva de presentacion, el proyecto muestra madurez suficiente para exponer:

- arquitectura modular,
- tecnologias modernas y mantenibles,
- foco en seguridad,
- base de datos relacional bien estructurada,
- integraciones de valor para la operacion diaria.

El siguiente salto de calidad recomendando no pasa tanto por rehacer arquitectura, sino por fortalecer pruebas, observabilidad, documentacion viva y estandarizacion operativa por ambiente.