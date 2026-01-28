-- ================================================================
-- APL - PostgreSQL
-- Script 01: Roles / Usuarios y Permisos
-- Motor: PostgreSQL 14+
--
-- Objetivo (RBD-02):
-- - Crear roles de acceso (equivalentes a los usuarios MySQL del documento)
-- - Otorgar permisos mínimos por rol sobre el esquema/tablas/secuencias
--
-- Importante (seguridad):
-- - NO hardcodear contraseñas reales en el repo.
-- - Reemplazá 'CHANGE_ME_*' por contraseñas seguras (o usa tu gestor).
--
-- Ejecución:
-- - Conectate a la base `apl_dental_lab` y ejecutá este script como superuser.
-- - Si las tablas todavía no existen (Prisma no migró), ejecutá este script
--   igual para crear roles, y al final re-ejecutalo tras `npm run db:migrate`
--   para aplicar GRANTs sobre tablas/secuencias.
-- ================================================================

-- 1) Crear roles con login (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_apl') THEN
    CREATE ROLE admin_apl LOGIN PASSWORD 'CHANGE_ME_ADMIN_APL' INHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'operador_apl') THEN
    CREATE ROLE operador_apl LOGIN PASSWORD 'CHANGE_ME_OPERADOR_APL' INHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'consultas_apl') THEN
    CREATE ROLE consultas_apl LOGIN PASSWORD 'CHANGE_ME_CONSULTAS_APL' INHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lector_apl') THEN
    CREATE ROLE lector_apl LOGIN PASSWORD 'CHANGE_ME_LECTOR_APL' INHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'editor_apl') THEN
    CREATE ROLE editor_apl LOGIN PASSWORD 'CHANGE_ME_EDITOR_APL' INHERIT;
  END IF;
END $$;

-- 2) Permisos de conexión y uso de schema
GRANT CONNECT ON DATABASE apl_dental_lab TO admin_apl, operador_apl, consultas_apl, lector_apl, editor_apl;

-- Por defecto Prisma usa schema public
GRANT USAGE ON SCHEMA public TO admin_apl, operador_apl, consultas_apl, lector_apl, editor_apl;

-- 3) Permisos sobre tablas existentes
-- Admin / Operador: equivalente a ALL PRIVILEGES (MySQL)
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public
TO admin_apl, operador_apl;

-- Editor: SELECT + INSERT + UPDATE
GRANT SELECT, INSERT, UPDATE
ON ALL TABLES IN SCHEMA public
TO editor_apl;

-- Consultas y Lector: solo lectura
GRANT SELECT
ON ALL TABLES IN SCHEMA public
TO consultas_apl, lector_apl;

-- 4) Permisos sobre secuencias (ids autoincrement)
-- Para INSERT, el rol necesita USAGE (y a veces SELECT) sobre la secuencia
GRANT USAGE, SELECT, UPDATE
ON ALL SEQUENCES IN SCHEMA public
TO admin_apl, operador_apl, editor_apl;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO consultas_apl, lector_apl;

-- 5) Default privileges (para futuras tablas/secuencias)
-- Esto evita que nuevas tablas creadas por migraciones queden sin permisos.
-- IMPORTANTE: debe ejecutarse para el ROLE que sea owner de las tablas.
-- En la mayoría de entornos locales/migraciones es `postgres`.
-- Si en tu entorno el owner es otro, reemplazá postgres por ese rol.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES
TO admin_apl, operador_apl;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT SELECT, INSERT, UPDATE ON TABLES
TO editor_apl;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT SELECT ON TABLES
TO consultas_apl, lector_apl;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES
TO admin_apl, operador_apl, editor_apl;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES
TO consultas_apl, lector_apl;
