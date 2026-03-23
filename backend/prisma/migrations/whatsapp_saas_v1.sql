-- ================================================================
-- SQL MIGRATION: WhatsApp SaaS Tables (PostgreSQL)
-- ================================================================

-- 1. Tabla: whatsapp_sessions
CREATE TABLE IF NOT EXISTS "whatsapp_sessions" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL UNIQUE,
    "session_data" JSONB NOT NULL,
    "phone_number" VARCHAR(20),
    "connected_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key vinculada a la tabla de Administradores
    CONSTRAINT "fk_whatsapp_user" FOREIGN KEY ("user_id") 
    REFERENCES "administrador" ("id") ON DELETE CASCADE
);

-- Index sobre user_id
CREATE INDEX IF NOT EXISTS "idx_whatsapp_sessions_user_id" ON "whatsapp_sessions" ("user_id");


-- 2. Tabla: messages
CREATE TABLE IF NOT EXISTS "messages" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "direction" VARCHAR(20) NOT NULL, -- 'outbound' | 'inbound'
    "status" VARCHAR(20) NOT NULL,    -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
    "whatsapp_message_id" VARCHAR(100),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints y Check de Enums
    CONSTRAINT "check_message_direction" CHECK ("direction" IN ('outbound', 'inbound')),
    CONSTRAINT "check_message_status" CHECK ("status" IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    
    -- Relaciones
    CONSTRAINT "fk_message_user" FOREIGN KEY ("user_id") 
    REFERENCES "administrador" ("id") ON DELETE CASCADE,
    
    CONSTRAINT "fk_message_client" FOREIGN KEY ("client_id") 
    REFERENCES "cliente" ("id") ON DELETE CASCADE
);

-- Indexes para optimizar consultas de historial
CREATE INDEX IF NOT EXISTS "idx_messages_user_id" ON "messages" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_messages_client_id" ON "messages" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_messages_created_at" ON "messages" ("created_at");
