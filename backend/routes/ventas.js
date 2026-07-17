// routes/ventas.js
// Endpoints relacionados al Módulo 2 - Ventas

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/ventas?mes=2026-07
// Lista las ventas de un mes (para pintar el calendario), con sus items
router.get('/', async (req, res) => {
  try {
    const { mes } = req.query; // formato esperado: 'YYYY-MM'

    let query = `
      SELECT v.id, v.fecha,
             json_agg(
               json_build_object(
                 'id', vi.id,
                 'producto_id', vi.producto_id,
                 'nombre', p.nombre,
                 'cantidad', vi.cantidad,
                 'precio_unitario', vi.precio_unitario
               )
             ) AS items
      FROM ventas v
      JOIN venta_items vi ON vi.venta_id = v.id
      JOIN productos p ON p.id = vi.producto_id
    `;
    const params = [];

    if (mes) {
      query += ` WHERE to_char(v.fecha, 'YYYY-MM') = $1`;
      params.push(mes);
    }

    query += ` GROUP BY v.id, v.fecha ORDER BY v.fecha ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// GET /api/ventas/resumen-mes?mes=2026-07
// Total vendido en el mes + comparación contra la meta
router.get('/resumen-mes', async (req, res) => {
  try {
    const { mes } = req.query;
    if (!mes) {
      return res.status(400).json({ error: 'El parámetro "mes" es obligatorio (formato YYYY-MM)' });
    }

    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(vi.cantidad * vi.precio_unitario), 0) AS total_vendido
       FROM ventas v
       JOIN venta_items vi ON vi.venta_id = v.id
       WHERE to_char(v.fecha, 'YYYY-MM') = $1`,
      [mes]
    );

    const metaResult = await pool.query(
      `SELECT monto_meta FROM metas WHERE to_char(mes, 'YYYY-MM') = $1`,
      [mes]
    );

    const totalVendido = parseFloat(totalResult.rows[0].total_vendido);
    const montoMeta = metaResult.rows.length > 0 ? parseFloat(metaResult.rows[0].monto_meta) : 0;
    const diferencia = totalVendido - montoMeta;

    res.json({
      mes,
      total_vendido: totalVendido,
      monto_meta: montoMeta,
      diferencia, // positivo = meta superada, negativo = falta ese monto
      meta_superada: diferencia >= 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular el resumen del mes' });
  }
});

// POST /api/ventas
// Registra una venta de uno o varios productos en una fecha.
// Body esperado:
// {
//   "fecha": "2026-07-17",
//   "items": [
//     { "producto_id": 3, "cantidad": 2 },
//     { "producto_id": 7, "cantidad": 1 }
//   ]
// }
//
// Esta ruta hace TODO dentro de una transacción:
// 1) Verifica que cada producto tenga stock suficiente
// 2) Crea la venta
// 3) Crea los venta_items con el precio histórico (tomado del catálogo)
// 4) Descuenta el stock de cada producto
// Si CUALQUIER paso falla, se revierte todo (rollback) y no queda nada a medias.
router.post('/', async (req, res) => {
  const { fecha, items } = req.body;

  if (!fecha || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'fecha e items (lista de productos) son obligatorios' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1) Verificar stock disponible de cada producto (con bloqueo de fila
    //    para evitar que dos ventas simultáneas descuenten el mismo stock
    //    dos veces — esto es "FOR UPDATE")
    const productosInfo = [];
    for (const item of items) {
      const { producto_id, cantidad } = item;

      if (!producto_id || !cantidad || cantidad <= 0) {
        throw { status: 400, message: 'Cada item necesita producto_id y cantidad > 0' };
      }

      const prodResult = await client.query(
        'SELECT id, nombre, precio, stock_actual FROM productos WHERE id = $1 FOR UPDATE',
        [producto_id]
      );

      if (prodResult.rows.length === 0) {
        throw { status: 404, message: `Producto con id ${producto_id} no existe` };
      }

      const producto = prodResult.rows[0];

      if (producto.stock_actual < cantidad) {
        throw {
          status: 409,
          message: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock_actual}, solicitado: ${cantidad}`,
        };
      }

      productosInfo.push({ ...item, precio_unitario: producto.precio });
    }

    // 2) Crear la venta (el "encabezado" del día)
    const ventaResult = await client.query(
      'INSERT INTO ventas (fecha) VALUES ($1) RETURNING id, fecha',
      [fecha]
    );
    const venta = ventaResult.rows[0];

    // 3) Crear cada venta_item y 4) descontar stock
    const itemsCreados = [];
    for (const item of productosInfo) {
      const itemResult = await client.query(
        `INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [venta.id, item.producto_id, item.cantidad, item.precio_unitario]
      );
      itemsCreados.push(itemResult.rows[0]);

      await client.query(
        'UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2',
        [item.cantidad, item.producto_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ ...venta, items: itemsCreados });
  } catch (err) {
    await client.query('ROLLBACK');

    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la venta' });
  } finally {
    client.release();
  }
});

// DELETE /api/ventas/:id
// Elimina una venta y devuelve el stock a los productos (por si se registró mal)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const itemsResult = await client.query(
      'SELECT producto_id, cantidad FROM venta_items WHERE venta_id = $1',
      [id]
    );

    if (itemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    // Devolver stock
    for (const item of itemsResult.rows) {
      await client.query(
        'UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2',
        [item.cantidad, item.producto_id]
      );
    }

    // ON DELETE CASCADE en venta_items se encarga de borrar los items
    await client.query('DELETE FROM ventas WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ mensaje: 'Venta eliminada y stock restituido' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la venta' });
  } finally {
    client.release();
  }
});

module.exports = router;
