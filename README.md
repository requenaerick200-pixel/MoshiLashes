# MoshiLashes — Guía rápida de arranque

## Requisitos
- Node.js 18+
- PostgreSQL 16 corriendo localmente

## 1. Base de datos (solo la primera vez)

```bash
createdb moshilashes_db
psql -d moshilashes_db -f backend/db/schema.sql
```

Si usas otro usuario/password de Postgres, ajusta `backend/.env` (ya viene
con valores de ejemplo para desarrollo local: usuario `moshilashes_user`,
password `moshilashes123`).

## 2. Backend

```bash
cd backend
npm install
node server.js
```

Debe mostrar:
```
🚀 Servidor MoshiLashes escuchando en http://localhost:3000
✅ Conectado a PostgreSQL (base de datos: moshilashes_db)
```

## 3. Frontend (en otra terminal)

```bash
cd frontend
npm install
npm run dev
```

Abre la URL que muestra Vite (normalmente `http://localhost:5173`).
Para verlo desde el celular en la misma red WiFi, usa `npm run dev -- --host`
y entra desde el celular a `http://<IP-de-tu-compu>:5173`.

## Notas
- El backend valida el stock en el servidor (no solo en el frontend), con
  transacciones — si algo falla a mitad de una venta, no queda nada a medias.
- `venta_items.precio_unitario` guarda el precio histórico: si luego subes
  el precio de un producto, las ventas pasadas no cambian.
- Pendiente: subida de imágenes a Cloudinary (ahora mismo se guardan como
  base64 en la BD, funciona pero no es lo ideal a largo plazo) y el
  módulo de Reportes (producto más vendido, comparativa mes vs mes).
