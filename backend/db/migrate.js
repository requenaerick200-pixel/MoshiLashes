// db/migrate.js
// Migraciones automáticas e idempotentes: se ejecutan cada vez que arranca
// el servidor y solo crean lo que falta. Así no tienes que correr SQL a
// mano en Railway ni en tu compu cuando se agregan columnas/tablas nuevas.

const pool = require('./pool');

const MIGRACIONES = [
  // v2 — Inventario: categoría de producto
  `ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria VARCHAR(60)`,

  // v2 — Inventario: historial de movimientos de stock (kardex)
  `CREATE TABLE IF NOT EXISTS movimientos_stock (
     id SERIAL PRIMARY KEY,
     producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
     tipo VARCHAR(20) NOT NULL
       CHECK (tipo IN ('alta', 'entrada', 'salida', 'ajuste', 'venta', 'devolucion')),
     cantidad INTEGER NOT NULL,          -- con signo: +entra / -sale
     stock_resultante INTEGER NOT NULL,  -- stock después del movimiento
     motivo TEXT,
     creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_stock(producto_id, creado_en DESC)`,
];

async function migrar() {
  for (const sql of MIGRACIONES) {
    await pool.query(sql);
  }
  console.log('✅ Base de datos al día (migraciones aplicadas)');
}

module.exports = migrar;
