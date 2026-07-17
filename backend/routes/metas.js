// routes/metas.js
// Endpoints para la meta mensual de ingresos

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/metas/:mes  (mes en formato YYYY-MM)
router.get('/:mes', async (req, res) => {
  try {
    const { mes } = req.params;
    const result = await pool.query(
      `SELECT * FROM metas WHERE to_char(mes, 'YYYY-MM') = $1`,
      [mes]
    );
    if (result.rows.length === 0) {
      return res.json({ mes, monto_meta: 0 }); // sin meta definida aún
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la meta' });
  }
});

// PUT /api/metas
// Crea o actualiza la meta de un mes (upsert)
// Body: { "mes": "2026-07-01", "monto_meta": 3000 }
router.put('/', async (req, res) => {
  try {
    const { mes, monto_meta } = req.body;

    if (!mes || monto_meta === undefined) {
      return res.status(400).json({ error: 'mes y monto_meta son obligatorios' });
    }

    const result = await pool.query(
      `INSERT INTO metas (mes, monto_meta)
       VALUES ($1, $2)
       ON CONFLICT (mes) DO UPDATE SET monto_meta = EXCLUDED.monto_meta
       RETURNING *`,
      [mes, monto_meta]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la meta' });
  }
});

module.exports = router;
