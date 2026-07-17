-- ============================================
-- MoshiLashes — Esquema de Base de Datos
-- PostgreSQL
-- ============================================

-- Tabla: productos
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
    stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo INTEGER,
    imagen_url TEXT,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla: ventas
CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla: venta_items
CREATE TABLE IF NOT EXISTS venta_items (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL -- precio histórico al momento de la venta
);

-- Tabla: metas
CREATE TABLE IF NOT EXISTS metas (
    id SERIAL PRIMARY KEY,
    mes DATE NOT NULL UNIQUE, -- ej: 2026-07-01
    monto_meta DECIMAL(10, 2) NOT NULL CHECK (monto_meta >= 0)
);

-- Índices útiles para las consultas más frecuentes
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_venta_items_venta_id ON venta_items(venta_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_producto_id ON venta_items(producto_id);
