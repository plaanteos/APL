-- Índices recomendados (PostgreSQL) para mejorar performance de filtros frecuentes.
-- Nota: este proyecto usa Prisma; estos índices también están declarados en schema.prisma.
-- Si no usas migraciones Prisma, puedes aplicar este script manualmente.
-- Nota: Para evitar falsos errores del validador SQL en VS Code, este script no usa IF NOT EXISTS.
-- Ejecútalo UNA sola vez (si el índice ya existe, la creación fallará).

-- Cliente
CREATE INDEX idx_cliente_id_administrador ON cliente(id_administrador);
CREATE INDEX idx_cliente_nombre ON cliente(nombre);
CREATE INDEX idx_cliente_telefono ON cliente(telefono);

-- Pedidos
CREATE INDEX idx_pedidos_id_cliente ON pedidos(id_cliente);
CREATE INDEX idx_pedidos_id_administrador ON pedidos(id_administrador);
CREATE INDEX idx_pedidos_fecha_pedido ON pedidos(fecha_pedido);
CREATE INDEX idx_pedidos_fecha_entrega ON pedidos(fecha_entrega);
CREATE INDEX idx_pedidos_fecha_delete ON pedidos(fecha_delete);

-- Producto
CREATE INDEX idx_producto_id_administrador ON producto(id_administrador);
CREATE INDEX idx_producto_tipo ON producto(tipo);

-- Detalle pedidos
CREATE INDEX idx_detalle_pedidos_id_pedido ON detalle_pedidos(id_pedido);
CREATE INDEX idx_detalle_pedidos_id_producto ON detalle_pedidos(id_producto);
CREATE INDEX idx_detalle_pedidos_id_estado ON detalle_pedidos(id_estado);

-- Estado
CREATE INDEX idx_estado_fecha_delete ON estado(fecha_delete);

-- Pago
CREATE INDEX idx_pago_id_administrador ON pago(id_administrador);

-- Detalle pago
CREATE INDEX idx_detalle_pago_id_pedido ON detalle_pago(id_pedido);
CREATE INDEX idx_detalle_pago_id_pago ON detalle_pago(id_pago);
CREATE INDEX idx_detalle_pago_fecha_pago ON detalle_pago(fecha_pago);

-- Auditoria
CREATE INDEX idx_auditoria_fecha_accion ON auditoria(fecha_accion);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario);
