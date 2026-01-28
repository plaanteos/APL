-- ================================================================
-- APL - PostgreSQL
-- Script 00: Creación de base de datos
-- Motor: PostgreSQL 14+
--
-- Nota:
-- - Ejecutar como superusuario (por ej. postgres).
-- - Este script SOLO crea la base de datos.
-- - Luego ejecutá migraciones Prisma para crear tablas:
--   `npm run db:migrate`
-- ================================================================

-- Si la DB ya existe, este comando fallará. En ese caso, omitilo.
CREATE DATABASE apl_dental_lab;

-- Recomendación: owner explícito (si querés)
-- ALTER DATABASE apl_dental_lab OWNER TO postgres;
