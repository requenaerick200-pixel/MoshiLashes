// routes/productos.js
// Endpoints relacionados al Módulo 1 - Catálogo de Productos

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/productos
// Lista todos los productos, ordenados por nombre
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM productos WHERE activo = true ORDER BY nombre ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/productos/:id
// Obtiene un producto específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM productos WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// POST /api/productos
// Crea un nuevo producto (alta de catálogo)
router.post('/', async (req, res) => {
  try {
    const { nombre, precio, stock_actual, stock_minimo, imagen_url } = req.body;

    if (!nombre || precio === undefined) {
      return res.status(400).json({ error: 'nombre y precio son obligatorios' });
    }

    const result = await pool.query(
      `INSERT INTO productos (nombre, precio, stock_actual, stock_minimo, imagen_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre, precio, stock_actual || 0, stock_minimo || null, imagen_url || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

// PUT /api/productos/:id/reabastecer
// Suma "cantidad_recibida" al stock_actual (botón "+" del catálogo)
router.put('/:id/reabastecer', async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad_recibida } = req.body;

    if (!cantidad_recibida || cantidad_recibida <= 0) {
      return res.status(400).json({ error: 'cantidad_recibida debe ser mayor a 0' });
    }

    const result = await pool.query(
      `UPDATE productos
       SET stock_actual = stock_actual + $1
       WHERE id = $2
       RETURNING *`,
      [cantidad_recibida, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al reabastecer stock' });
  }
});

// PUT /api/productos/:id
// Edita datos del producto (nombre, stock_minimo, imagen, etc.)
// Nota: el precio se puede actualizar aquí, pero NO desde el módulo de Ventas.
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio, stock_actual, stock_minimo, imagen_url } = req.body;

    const result = await pool.query(
      `UPDATE productos
       SET nombre = COALESCE($1, nombre),
           precio = COALESCE($2, precio),
           stock_actual = COALESCE($3, stock_actual),
           stock_minimo = COALESCE($4, stock_minimo),
           imagen_url = COALESCE($5, imagen_url)
       WHERE id = $6
       RETURNING *`,
      [nombre, precio, stock_actual, stock_minimo, imagen_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
});

// DELETE /api/productos/:id
// Elimina un producto del catálogo. Si el producto ya tiene ventas
// registradas, no se puede borrar de verdad sin perder ese historial —
// en ese caso lo "archivamos" (activo = false) en vez de borrarlo, y deja
// de aparecer en el catálogo pero sus ventas pasadas siguen intactas.
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM productos WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ mensaje: 'Producto eliminado', producto: result.rows[0], archivado: false });
  } catch (err) {
    // Si el producto ya tiene ventas asociadas, la FK con ON DELETE RESTRICT
    // impide el borrado (código 23001). En ese caso lo archivamos en vez
    // de fallar, para no perder el historial de ventas.
    if (err.code === '23001' || err.code === '23503') {
      try {
        const archivado = await pool.query(
          'UPDATE productos SET activo = false WHERE id = $1 RETURNING *',
          [req.params.id]
        );
        if (archivado.rows.length === 0) {
          return res.status(404).json({ error: 'Producto no encontrado' });
        }
        return res.json({
          mensaje: 'Este producto ya tiene ventas registradas, así que se archivó en vez de eliminarse (para no perder tu historial de ventas)',
          producto: archivado.rows[0],
          archivado: true,
        });
      } catch (err2) {
        console.error(err2);
        return res.status(500).json({ error: 'Error al archivar el producto' });
      }
    }
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

module.exports = router;