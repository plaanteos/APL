-- ================================================================
-- TRIGGERS POSTGRESQL - GESTIÓN APL
-- Requerimiento: RBD-02 / RNF-04
-- Descripción: Auditoría automática, validaciones de integridad y
--              actualización de balances financieros.
-- ================================================================

-- 1. AUDITORÍA AUTOMÁTICA EN CLIENTES (AFTER UPDATE)
CREATE OR REPLACE FUNCTION fn_auditoria_update_cliente()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO auditoria (usuario, accion)
    VALUES (
        current_user,
        'UPDATE en cliente ID: ' || OLD.id || 
        ' - Nombre anterior: ' || OLD.nombre || 
        ' - Nombre nuevo: ' || NEW.nombre
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_update_cliente ON cliente;
CREATE TRIGGER trg_auditoria_update_cliente
AFTER UPDATE ON cliente
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_update_cliente();


-- 2. AUDITORÍA AUTOMÁTICA EN PEDIDOS (AFTER UPDATE)
CREATE OR REPLACE FUNCTION fn_auditoria_update_pedidos()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO auditoria (usuario, accion)
    VALUES (
        current_user,
        'UPDATE en pedido ID: ' || OLD.id || 
        ' - Fecha pedido anterior: ' || OLD.fecha_pedido || 
        ' - Fecha pedido nueva: ' || NEW.fecha_pedido
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_update_pedidos ON pedidos;
CREATE TRIGGER trg_auditoria_update_pedidos
AFTER UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_update_pedidos();


-- 3. VALIDAR FECHAS EN PEDIDOS (BEFORE INSERT/UPDATE)
CREATE OR REPLACE FUNCTION fn_validar_fechas_pedidos()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar fecha_entrega
    IF NEW.fecha_entrega IS NOT NULL AND NEW.fecha_entrega < NEW.fecha_pedido THEN
        RAISE EXCEPTION 'La fecha de entrega no puede ser menor a la fecha de pedido';
    END IF;

    -- Validar fecha_delete
    IF NEW.fecha_delete IS NOT NULL AND NEW.fecha_delete < NEW.fecha_pedido THEN
        RAISE EXCEPTION 'La fecha de eliminación (soft delete) no puede ser menor a la fecha de pedido';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_fechas_pedidos ON pedidos;
CREATE TRIGGER trg_validar_fechas_pedidos
BEFORE INSERT OR UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION fn_validar_fechas_pedidos();


-- 4. ACTUALIZACIÓN AUTOMÁTICA DE MONTO EN TABLA PAGO
-- Nota: En PostgreSQL 14+, podemos manejar esto con una sola función para INSERT, UPDATE y DELETE
CREATE OR REPLACE FUNCTION fn_actualizar_monto_pago()
RETURNS TRIGGER AS $$
DECLARE
    id_pago_afectado INT;
BEGIN
    -- Determinar el ID del pago afectado
    IF (TG_OP = 'DELETE') THEN
        id_pago_afectado := OLD.id_pago;
    ELSE
        id_pago_afectado := NEW.id_pago;
    END IF;

    -- Actualizar el valor total en la tabla pago
    UPDATE pago p
    SET valor = COALESCE((
        SELECT SUM(valor)
        FROM detalle_pago
        WHERE id_pago = id_pago_afectado
    ), 0)
    WHERE p.id = id_pago_afectado;

    RETURN NULL; -- AFTER trigger puede retornar NULL
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_monto_pago ON detalle_pago;
CREATE TRIGGER trg_actualizar_monto_pago
AFTER INSERT OR UPDATE OR DELETE ON detalle_pago
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_monto_pago();
