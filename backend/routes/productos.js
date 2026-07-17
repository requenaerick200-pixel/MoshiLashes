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
      'SELECT * FROM productos ORDER BY nombre ASC'
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
    const { nombre, precio, stock_minimo, imagen_url } = req.body;

    const result = await pool.query(
      `UPDATE productos
       SET nombre = COALESCE($1, nombre),
           precio = COALESCE($2, precio),
           stock_minimo = COALESCE($3, stock_minimo),
           imagen_url = COALESCE($4, imagen_url)
       WHERE id = $5
       RETURNING *`,
      [nombre, precio, stock_minimo, imagen_url, id]
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
// Elimina un producto del catálogo
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
    res.json({ mensaje: 'Producto eliminado', producto: result.rows[0] });
  } catch (err) {
    console.error(err);
    // Si el producto ya tiene ventas asociadas, la FK con ON DELETE RESTRICT
    // va a impedir el borrado. Avisamos con un mensaje claro.
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar: este producto ya tiene ventas registradas',
      });
    }
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

module.exports = router;
