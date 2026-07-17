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

// Railway (y otros proveedores en la nube) suelen dar una sola variable
// DATABASE_URL con todo junto, en vez de host/usuario/password sueltos.
// Soportamos ambos formatos: si existe DATABASE_URL la usamos; si no,
// caemos a las variables sueltas (para desarrollo local).
const usaConnectionString = !!process.env.DATABASE_URL;

const pool = usaConnectionString
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
        ? { rejectUnauthorized: false }
        : false,
    });

// Pequeña prueba de conexión al arrancar el servidor.
// Si falla, mostramos un mensaje claro en vez de un error críptico.
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Conectado a PostgreSQL'))
  .catch((err) => {
    console.error('❌ No se pudo conectar a PostgreSQL:', err.message);
  });

module.exports = pool;