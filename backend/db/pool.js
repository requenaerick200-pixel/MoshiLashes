// db/pool.js
// Este archivo crea UN solo "pool" de conexiones a PostgreSQL que se
// reutiliza en toda la app. Un pool mantiene varias conexiones abiertas
// y listas, en vez de abrir y cerrar una conexión nueva por cada consulta
// (eso sería mucho más lento).

require('dotenv').config();
const { Pool, types } = require('pg');

// Por defecto, pg convierte las columnas DATE en objetos Date de JS en
// UTC medianoche. Al serializar a JSON eso se vuelve un string tipo
// "2026-07-17T00:00:00.000Z", lo cual rompe comparaciones simples de
// fecha en el frontend (y puede correrse un día según la zona horaria
// del servidor). Forzamos a que DATE (OID 1082) se devuelva tal cual
// como string "YYYY-MM-DD".
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Pequeña prueba de conexión al arrancar el servidor.
// Si falla, mostramos un mensaje claro en vez de un error críptico.
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Conectado a PostgreSQL (base de datos: ' + process.env.DB_NAME + ')'))
  .catch((err) => {
    console.error('❌ No se pudo conectar a PostgreSQL:', err.message);
  });

module.exports = pool;
