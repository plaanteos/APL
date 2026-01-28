CREATE DATABASE IF NOT EXISTS administracionAPL;

USE administracionAPL;

SELECT * FROM information_schema.user_privileges;

CREATE USER 'admin_apl'@'%' IDENTIFIED BY 'AdminAPL123!';
CREATE USER 'operador_apl'@'%' IDENTIFIED BY 'OperAPL123!';
CREATE USER 'consultas_apl'@'%' IDENTIFIED BY 'ConsAPL123!';
CREATE USER 'lector_apl'@'%' IDENTIFIED BY 'LectorAPL123!';
CREATE USER 'editor_apl'@'%' IDENTIFIED BY 'EditorAPL123!';

GRANT ALL PRIVILEGES ON administracionAPL.* TO 'admin_apl'@'%';
GRANT ALL PRIVILEGES ON administracionAPL.* TO 'operador_apl'@'%';
GRANT SELECT ON administracionAPL.* TO 'consultas_apl'@'%';
GRANT SELECT ON administracionAPL.* TO 'lector_apl'@'%';
GRANT SELECT, INSERT, UPDATE ON administracionAPL.* TO 'editor_apl'@'%';

SHOW GRANTS FOR 'admin_apl'@'%';
SHOW GRANTS FOR 'operador_apl'@'%';
SHOW GRANTS FOR 'consultas_apl'@'%';
SHOW GRANTS FOR 'editor_apl'@'%';


-- ADMINISTRADOR

CREATE TABLE administrador (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    usuario VARCHAR(50) NOT NULL,
    super_usuario TINYINT(1) DEFAULT 0
);

-- CLIENTE
CREATE TABLE cliente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    celular VARCHAR(20),
    email VARCHAR(100),
    id_administrador INT,
    CONSTRAINT fk_cliente_admin
        FOREIGN KEY (id_administrador) REFERENCES administrador(id)
);

-- PRODUCTO
CREATE TABLE producto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    id_administrador INT,
    CONSTRAINT fk_producto_admin
        FOREIGN KEY (id_administrador) REFERENCES administrador(id)
);

-- PEDIDOS
CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    fecha_entrega DATE,
    fecha_pedido DATE NOT NULL,
    fecha_delete DATE,
    id_administrador INT,
    CONSTRAINT fk_pedido_cliente
        FOREIGN KEY (id_cliente) REFERENCES cliente(id),
    CONSTRAINT fk_pedido_admin
        FOREIGN KEY (id_administrador) REFERENCES administrador(id)
);

-- ESTADO
CREATE TABLE estado (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(50) NOT NULL,
    fecha_insert DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_delete DATETIME
);

-- DETALLE_PEDIDOS
CREATE TABLE detalle_pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    paciente VARCHAR(100),
    id_estado INT,
    CONSTRAINT fk_det_pedido
        FOREIGN KEY (id_pedido) REFERENCES pedidos(id),
    CONSTRAINT fk_det_producto
        FOREIGN KEY (id_producto) REFERENCES producto(id),
    CONSTRAINT fk_det_estado
        FOREIGN KEY (id_estado) REFERENCES estado(id)
);

-- PAGO
CREATE TABLE pago (
    id INT AUTO_INCREMENT PRIMARY KEY,
    valor DECIMAL(10,2) NOT NULL,
    id_administrador INT,
    CONSTRAINT fk_pago_admin
        FOREIGN KEY (id_administrador) REFERENCES administrador(id)
);

-- DETALLE_PAGO
CREATE TABLE detalle_pago (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pago INT NOT NULL,
    id_pedido INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    fecha_pago DATE NOT NULL,
    CONSTRAINT fk_det_pago
        FOREIGN KEY (id_pago) REFERENCES pago(id),
    CONSTRAINT fk_det_pago_pedido
        FOREIGN KEY (id_pedido) REFERENCES pedidos(id)
);

-- AUDITORIA
CREATE TABLE auditoria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL,
    fecha_accion DATETIME DEFAULT CURRENT_TIMESTAMP,
    accion VARCHAR(255) NOT NULL
);

-- CREACIÓN DE INDICES
CREATE INDEX idx_cliente ON cliente (id);
CREATE INDEX idx_producto ON producto (id);
CREATE INDEX idx_pedidos ON pedidos (id);
CREATE INDEX idx_detalle_pedidos ON detalle_pedidos (id);
CREATE INDEX idx_pago ON pago (id);
CREATE INDEX idx_detalle_pago ON detalle_pago (id);
CREATE INDEX idx_estado ON estado (id);