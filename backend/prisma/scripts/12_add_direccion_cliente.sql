-- Migración: Agregar columna "direccion" a la tabla cliente
-- Fecha: 2026-04-27

ALTER TABLE cliente
  ADD COLUMN IF NOT EXISTS direccion VARCHAR(200);

-- Comentario de columna
COMMENT ON COLUMN cliente.direccion IS 'Dirección física del cliente (opcional)';
