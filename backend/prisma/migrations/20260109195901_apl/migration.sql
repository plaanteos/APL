-- CreateTable
CREATE TABLE `recordatorios` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `tipo` ENUM('VENCIMIENTO_PEDIDO', 'SEGUIMIENTO_CLIENTE', 'PAGO_PENDIENTE', 'REUNION', 'LLAMADA', 'OTRO') NOT NULL,
    `tipoEntidad` VARCHAR(191) NOT NULL,
    `entidadId` VARCHAR(191) NOT NULL,
    `fechaRecordatorio` DATETIME(3) NOT NULL,
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` ENUM('PENDIENTE', 'COMPLETADO', 'CANCELADO', 'VENCIDO') NOT NULL DEFAULT 'PENDIENTE',
    `prioridad` ENUM('BAJA', 'NORMAL', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'NORMAL',
    `notificado` BOOLEAN NOT NULL DEFAULT false,
    `fechaNotificacion` DATETIME(3) NULL,
    `administradorId` VARCHAR(191) NULL,
    `repetir` BOOLEAN NOT NULL DEFAULT false,
    `frecuencia` VARCHAR(191) NULL,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `recordatorios_fechaRecordatorio_idx`(`fechaRecordatorio`),
    INDEX `recordatorios_estado_idx`(`estado`),
    INDEX `recordatorios_tipoEntidad_entidadId_idx`(`tipoEntidad`, `entidadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
