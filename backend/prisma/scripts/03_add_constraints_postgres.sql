-- ================================================================
-- APL - PostgreSQL
-- Script 03: Constraints adicionales (CHECK) - opcional
-- Motor: PostgreSQL 14+
--
-- Objetivo:
-- - Implementar validaciones a nivel de BD (sin triggers) para datos críticos.
-- - Se crean como NOT VALID para no fallar si existen datos legacy.
--   Para validar datos existentes, ejecutá luego: VALIDATE CONSTRAINT.
-- ================================================================

-- Producto: precio debe ser positivo
ALTER TABLE producto
  ADD CONSTRAINT ck_producto_precio_positive
  CHECK (precio > 0) NOT VALID;

-- Detalle pedidos: cantidad y precio_unitario positivos
ALTER TABLE detalle_pedidos
  ADD CONSTRAINT ck_detalle_pedidos_cantidad_positive
  CHECK (cantidad > 0) NOT VALID;

ALTER TABLE detalle_pedidos
  ADD CONSTRAINT ck_detalle_pedidos_precio_unitario_positive
  CHECK (precio_unitario > 0) NOT VALID;

-- Pago / Detalle pago: valor positivo
ALTER TABLE pago
  ADD CONSTRAINT ck_pago_valor_positive
  CHECK (valor > 0) NOT VALID;

ALTER TABLE detalle_pago
  ADD CONSTRAINT ck_detalle_pago_valor_positive
  CHECK (valor > 0) NOT VALID;

-- Pedidos: fecha_entrega debe ser >= fecha_pedido (cuando ambas existan)
ALTER TABLE pedidos
  ADD CONSTRAINT ck_pedidos_fechas_logicas
  CHECK (fecha_entrega >= fecha_pedido) NOT VALID;

-- Para validar constraints (si estás seguro de que los datos existentes cumplen):
-- ALTER TABLE producto VALIDATE CONSTRAINT ck_producto_precio_positive;
-- ALTER TABLE detalle_pedidos VALIDATE CONSTRAINT ck_detalle_pedidos_cantidad_positive;
-- ALTER TABLE detalle_pedidos VALIDATE CONSTRAINT ck_detalle_pedidos_precio_unitario_positive;
-- ALTER TABLE pago VALIDATE CONSTRAINT ck_pago_valor_positive;
-- ALTER TABLE detalle_pago VALIDATE CONSTRAINT ck_detalle_pago_valor_positive;
-- ALTER TABLE pedidos VALIDATE CONSTRAINT ck_pedidos_fechas_logicas;
