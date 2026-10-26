// routes/productos.js
// Endpoints del Módulo 1 - Catálogo / Inventario.
//
// Todo cambio de stock queda registrado en "movimientos_stock" (kardex),
// así siempre puedes ver por qué un producto tiene el stock que tiene.

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { registrarMovimiento } = require('../db/movimientos');

// ---------- Helpers ----------

function limpiarTexto(valor, max) {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  const t = String(valor).trim();
  return t === '' ? null : t.slice(0, max);
}

function esEnteroNoNegativo(v) {
  return Number.isInteger(Number(v)) && Number(v) >= 0;
}

// Valida y normaliza los datos de un producto nuevo. Devuelve { error } o { datos }.
function validarNuevo(body) {
  const nombre = limpiarTexto(body.nombre, 150);
  const precio = Number(body.precio);
  const stock = body.stock_actual === undefined || body.stock_actual === '' ? 0 : Number(body.stock_actual);
  const minimo = body.stock_minimo === undefined || body.stock_minimo === '' || body.stock_minimo === null
    ? null
    : Number(body.stock_minimo);

  if (!nombre) return { error: 'El nombre es obligatorio' };
  if (body.precio === undefined || body.precio === '' || isNaN(precio) || precio < 0) {
    return { error: `Precio inválido para "${nombre}"` };
  }
  if (!esEnteroNoNegativo(stock)) return { error: `Stock inválido para "${nombre}"` };
  if (minimo !== null && !esEnteroNoNegativo(minimo)) return { error: `Stock mínimo inválido para "${nombre}"` };

  return {
    datos: {
      nombre,
      precio,
      stock_actual: stock,
      stock_minimo: minimo,
      imagen_url: body.imagen_url || null,
      categoria: limpiarTexto(body.categoria, 60) ?? null,
    },
  };
}

async function existeNombre(db, nombre, excluirId = null) {
  const r = await db.query(
    `SELECT id FROM productos
     WHERE activo = true AND LOWER(TRIM(nombre)) = LOWER(TRIM($1)) AND ($2::int IS NULL OR id <> $2)
     LIMIT 1`,
    [nombre, excluirId]
  );
  return r.rows.length > 0;
}

async function insertarProducto(db, d) {
  const r = await db.query(
    `INSERT INTO productos (nombre, precio, stock_actual, stock_minimo, imagen_url, categoria)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [d.nombre, d.precio, d.stock_actual, d.stock_minimo, d.imagen_url, d.categoria]
  );
  const producto = r.rows[0];
  if (producto.stock_actual > 0) {
    await registrarMovimiento(db, {
      producto_id: producto.id,
      tipo: 'alta',
      cantidad: producto.stock_actual,
      stock_resultante: producto.stock_actual,
      motivo: 'Stock inicial',
    });
  }
  return producto;
}

// Ejecuta fn dentro de una transacción y maneja errores { status, message }.
async function enTransaccion(res, fn, mensajeError) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.status) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error(err);
      res.status(500).json({ error: mensajeError });
    }
    return undefined;
  } finally {
    client.release();
  }
}

// ---------- Listados ----------

// GET /api/productos — productos activos, ordenados por nombre
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM productos WHERE activo = true ORDER BY LOWER(nombre) ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/productos/archivados — productos archivados (para restaurarlos)
router.get('/archivados', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM productos WHERE activo = false ORDER BY LOWER(nombre) ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos archivados' });
  }
});

// ---------- Alta ----------

// POST /api/productos — crea un producto
router.post('/', async (req, res) => {
  const { error, datos } = validarNuevo(req.body);
  if (error) return res.status(400).json({ error });

  const producto = await enTransaccion(res, async (db) => {
    if (await existeNombre(db, datos.nombre)) {
      throw { status: 409, message: `Ya existe un producto llamado "${datos.nombre}"` };
    }
    return insertarProducto(db, datos);
  }, 'Error al crear el producto');

  if (producto) res.status(201).json(producto);
});

// POST /api/productos/lote — crea varios productos de una sola vez
// Body: { productos: [{ nombre, precio, stock_actual, stock_minimo?, categoria? }, ...] }
// Si alguno falla, no se crea ninguno (transacción).
router.post('/lote', async (req, res) => {
  const lista = req.body?.productos;
  if (!Array.isArray(lista) || lista.length === 0) {
    return res.status(400).json({ error: 'Envía al menos un producto' });
  }
  if (lista.length > 200) {
    return res.status(400).json({ error: 'Máximo 200 productos por lote' });
  }

  const validados = [];
  const vistos = new Set();
  for (const item of lista) {
    const { error, datos } = validarNuevo(item);
    if (error) return res.status(400).json({ error });
    const clave = datos.nombre.toLowerCase();
    if (vistos.has(clave)) {
      return res.status(400).json({ error: `"${datos.nombre}" está repetido en la lista` });
    }
    vistos.add(clave);
    validados.push(datos);
  }

  const creados = await enTransaccion(res, async (db) => {
    const resultado = [];
    for (const d of validados) {
      if (await existeNombre(db, d.nombre)) {
        throw { status: 409, message: `Ya existe un producto llamado "${d.nombre}"` };
      }
      resultado.push(await insertarProducto(db, d));
    }
    return resultado;
  }, 'Error al crear los productos');

  if (creados) res.status(201).json({ creados: creados.length, productos: creados });
});

// ---------- Movimientos de stock ----------

// PUT /api/productos/:id/reabastecer — entrada de stock (botón "+")
// Body: { cantidad_recibida, motivo? }
router.put('/:id/reabastecer', async (req, res) => {
  const cantidad = Number(req.body?.cantidad_recibida);
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: 'La cantidad recibida debe ser un número entero mayor a 0' });
  }
  const motivo = limpiarTexto(req.body?.motivo, 200) || null;

  const producto = await enTransaccion(res, async (db) => {
    const r = await db.query(
      'UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2 RETURNING *',
      [cantidad, req.params.id]
    );
    if (r.rows.length === 0) throw { status: 404, message: 'Producto no encontrado' };
    const p = r.rows[0];
    await registrarMovimiento(db, {
      producto_id: p.id, tipo: 'entrada', cantidad, stock_resultante: p.stock_actual, motivo,
    });
    return p;
  }, 'Error al reabastecer stock');

  if (producto) res.json(producto);
});

// POST /api/productos/recepcion — entrada de mercadería de varios productos
// Body: { items: [{ producto_id, cantidad }], motivo? }
router.post('/recepcion', async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Agrega al menos un producto con cantidad' });
  }
  for (const it of items) {
    if (!it.producto_id || !Number.isInteger(Number(it.cantidad)) || Number(it.cantidad) <= 0) {
      return res.status(400).json({ error: 'Cada producto necesita una cantidad entera mayor a 0' });
    }
  }
  const motivo = limpiarTexto(req.body?.motivo, 200) || 'Recepción de mercadería';

  const actualizados = await enTransaccion(res, async (db) => {
    const resultado = [];
    for (const it of items) {
      const cantidad = Number(it.cantidad);
      const r = await db.query(
        'UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2 RETURNING *',
        [cantidad, it.producto_id]
      );
      if (r.rows.length === 0) throw { status: 404, message: `Producto ${it.producto_id} no encontrado` };
      const p = r.rows[0];
      await registrarMovimiento(db, {
        producto_id: p.id, tipo: 'entrada', cantidad, stock_resultante: p.stock_actual, motivo,
      });
      resultado.push(p);
    }
    return resultado;
  }, 'Error al registrar la recepción');

  if (actualizados) {
    const unidades = items.reduce((s, it) => s + Number(it.cantidad), 0);
    res.json({ productos: actualizados.length, unidades });
  }
});

// POST /api/productos/:id/salida — salida que NO es venta (dañado, regalo, uso personal…)
// Body: { cantidad, motivo }
router.post('/:id/salida', async (req, res) => {
  const cantidad = Number(req.body?.cantidad);
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un número entero mayor a 0' });
  }
  const motivo = limpiarTexto(req.body?.motivo, 200);
  if (!motivo) return res.status(400).json({ error: 'Indica el motivo de la salida' });

  const producto = await enTransaccion(res, async (db) => {
    const actual = await db.query('SELECT * FROM productos WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (actual.rows.length === 0) throw { status: 404, message: 'Producto no encontrado' };
    if (actual.rows[0].stock_actual < cantidad) {
      throw { status: 409, message: `Solo hay ${actual.rows[0].stock_actual} en stock` };
    }
    const r = await db.query(
      'UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2 RETURNING *',
      [cantidad, req.params.id]
    );
    const p = r.rows[0];
    await registrarMovimiento(db, {
      producto_id: p.id, tipo: 'salida', cantidad: -cantidad, stock_resultante: p.stock_actual, motivo,
    });
    return p;
  }, 'Error al registrar la salida');

  if (producto) res.json(producto);
});

// GET /api/productos/:id/movimientos — historial (últimos 100)
router.get('/:id/movimientos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tipo, cantidad, stock_resultante, motivo, creado_en
       FROM movimientos_stock WHERE producto_id = $1
       ORDER BY creado_en DESC, id DESC LIMIT 100`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
});

// ---------- Detalle / edición ----------

// GET /api/productos/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// PUT /api/productos/:id/restaurar — vuelve a activar un producto archivado
router.put('/:id/restaurar', async (req, res) => {
  try {
    const actual = await pool.query('SELECT nombre FROM productos WHERE id = $1', [req.params.id]);
    if (actual.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    if (await existeNombre(pool, actual.rows[0].nombre, Number(req.params.id))) {
      return res.status(409).json({ error: `Ya hay otro producto activo llamado "${actual.rows[0].nombre}". Renómbralo primero.` });
    }
    const r = await pool.query('UPDATE productos SET activo = true WHERE id = $1 RETURNING *', [req.params.id]);
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al restaurar el producto' });
  }
});

// PUT /api/productos/:id — edita solo los campos enviados.
// (Antes se usaba COALESCE y no se podía quitar la foto ni el stock mínimo.)
// Si cambia el stock, se registra como "ajuste" en el historial.
router.put('/:id', async (req, res) => {
  const b = req.body || {};
  const cambios = {};

  if (b.nombre !== undefined) {
    const nombre = limpiarTexto(b.nombre, 150);
    if (!nombre) return res.status(400).json({ error: 'El nombre no puede quedar vacío' });
    cambios.nombre = nombre;
  }
  if (b.precio !== undefined) {
    const precio = Number(b.precio);
    if (b.precio === '' || b.precio === null || isNaN(precio) || precio < 0) {
      return res.status(400).json({ error: 'Precio inválido' });
    }
    cambios.precio = precio;
  }
  if (b.stock_minimo !== undefined) {
    if (b.stock_minimo === null || b.stock_minimo === '') cambios.stock_minimo = null;
    else if (!esEnteroNoNegativo(b.stock_minimo)) return res.status(400).json({ error: 'Stock mínimo inválido' });
    else cambios.stock_minimo = Number(b.stock_minimo);
  }
  if (b.imagen_url !== undefined) cambios.imagen_url = b.imagen_url || null;
  if (b.categoria !== undefined) cambios.categoria = limpiarTexto(b.categoria, 60) ?? null;

  let nuevoStock;
  if (b.stock_actual !== undefined && b.stock_actual !== null && b.stock_actual !== '') {
    if (!esEnteroNoNegativo(b.stock_actual)) return res.status(400).json({ error: 'Stock inválido' });
    nuevoStock = Number(b.stock_actual);
  }

  const producto = await enTransaccion(res, async (db) => {
    const actual = await db.query('SELECT * FROM productos WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (actual.rows.length === 0) throw { status: 404, message: 'Producto no encontrado' };
    const antes = actual.rows[0];

    if (cambios.nombre && (await existeNombre(db, cambios.nombre, antes.id))) {
      throw { status: 409, message: `Ya existe otro producto llamado "${cambios.nombre}"` };
    }
    if (nuevoStock !== undefined && nuevoStock !== antes.stock_actual) {
      cambios.stock_actual = nuevoStock;
    }

    const campos = Object.keys(cambios);
    if (campos.length === 0) return antes;

    const sets = campos.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const valores = campos.map((c) => cambios[c]);
    const r = await db.query(
      `UPDATE productos SET ${sets} WHERE id = $${campos.length + 1} RETURNING *`,
      [...valores, antes.id]
    );
    const despues = r.rows[0];

    if (cambios.stock_actual !== undefined) {
      await registrarMovimiento(db, {
        producto_id: despues.id,
        tipo: 'ajuste',
        cantidad: despues.stock_actual - antes.stock_actual,
        stock_resultante: despues.stock_actual,
        motivo: limpiarTexto(b.motivo_ajuste, 200) || 'Corrección manual de stock',
      });
    }
    return despues;
  }, 'Error al actualizar el producto');

  if (producto) res.json(producto);
});

// DELETE /api/productos/:id
// Si el producto ya tiene ventas, no se puede borrar sin perder historial:
// en ese caso se ARCHIVA (activo = false) y se puede restaurar después.
router.delete('/:id', async (req, res) => {
  try {
    const ventas = await pool.query(
      'SELECT 1 FROM venta_items WHERE producto_id = $1 LIMIT 1',
      [req.params.id]
    );
    if (ventas.rows.length > 0) {
      const archivado = await pool.query(
        'UPDATE productos SET activo = false WHERE id = $1 RETURNING *',
        [req.params.id]
      );
      if (archivado.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
      return res.json({
        mensaje: 'Tiene ventas registradas, así que se archivó (puedes restaurarlo desde "Archivados")',
        producto: archivado.rows[0],
        archivado: true,
      });
    }

    const result = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado', producto: result.rows[0], archivado: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

module.exports = router;
