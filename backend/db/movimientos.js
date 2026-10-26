// db/movimientos.js
// Helper para registrar un movimiento en el historial de stock (kardex).
// Recibe "db" que puede ser el pool o un client dentro de una transacción.

async function registrarMovimiento(db, { producto_id, tipo, cantidad, stock_resultante, motivo = null }) {
  await db.query(
    `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_resultante, motivo)
     VALUES ($1, $2, $3, $4, $5)`,
    [producto_id, tipo, cantidad, stock_resultante, motivo]
  );
}

module.exports = { registrarMovimiento };
