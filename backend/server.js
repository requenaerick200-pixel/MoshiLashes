// server.js
// Punto de entrada del backend. Levanta Express, conecta las rutas
// y arranca el servidor.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productosRoutes = require('./routes/productos');
const ventasRoutes = require('./routes/ventas');
const metasRoutes = require('./routes/metas');

const migrar = require('./db/migrate');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // permite leer JSON en req.body (10mb para fotos en base64)

// Ruta de salud, útil para probar que el servidor responde
app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', mensaje: 'MoshiLashes API funcionando' });
});

// Rutas de la app
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/metas', metasRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
// Primero aplicamos migraciones (crea columnas/tablas nuevas si faltan) y
// luego levantamos el servidor. Si la migración falla, igual arrancamos
// para no tumbar la app, pero queda el error en consola.
migrar()
  .catch((err) => console.error('❌ Error aplicando migraciones:', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor MoshiLashes escuchando en http://localhost:${PORT}`);
    });
  });
