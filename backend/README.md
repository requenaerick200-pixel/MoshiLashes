# MoshiLashes — Backend (Express + PostgreSQL)

API REST para el sistema de inventario y ventas de MoshiLashes.

## Requisitos previos

1. **Node.js** instalado (v18 o superior) → https://nodejs.org
2. **PostgreSQL** instalado y corriendo en tu computadora → https://www.postgresql.org/download/

## Instalación paso a paso

### 1. Instalar dependencias

Abre una terminal dentro de la carpeta `backend/` y corre:

```bash
npm install
```

Esto descarga Express, el driver de PostgreSQL (`pg`), CORS y dotenv.

### 2. Crear la base de datos

Abre PostgreSQL (con `psql` o con una herramienta como pgAdmin) y crea la
base de datos y el usuario:

```sql
CREATE USER moshilashes_user WITH PASSWORD 'elige_tu_password';
CREATE DATABASE moshilashes_db OWNER moshilashes_user;
```

### 3. Aplicar el esquema (crear las tablas)

Desde la terminal, dentro de `backend/`:

```bash
psql -h localhost -U moshilashes_user -d moshilashes_db -f db/schema.sql
```

Te va a pedir el password que elegiste. Si todo sale bien, verás:
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
```

### 4. Configurar las variables de entorno

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Abre `.env` y coloca tu password real:

```
DB_PASSWORD=el_password_que_elegiste
```

**Importante:** el archivo `.env` nunca se sube a git (ya está en
`.gitignore`), porque contiene datos sensibles.

### 5. Arrancar el servidor

```bash
npm start
```

Si todo está bien conectado, verás en la consola:

```
🚀 Servidor MoshiLashes escuchando en http://localhost:3000
✅ Conectado a PostgreSQL (base de datos: moshilashes_db)
```

Deja esa terminal abierta — mientras esté corriendo, el backend está
disponible en `http://localhost:3000`.

## Endpoints disponibles

### Productos (Catálogo)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/productos` | Lista todos los productos |
| GET | `/api/productos/:id` | Obtiene un producto |
| POST | `/api/productos` | Crea un producto nuevo |
| PUT | `/api/productos/:id` | Edita un producto |
| PUT | `/api/productos/:id/reabastecer` | Suma cantidad al stock (botón "+") |
| DELETE | `/api/productos/:id` | Elimina un producto |

### Ventas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/ventas?mes=2026-07` | Lista ventas de un mes |
| GET | `/api/ventas/resumen-mes?mes=2026-07` | Total vendido + comparación con meta |
| POST | `/api/ventas` | Registra una venta (descuenta stock automáticamente) |
| DELETE | `/api/ventas/:id` | Elimina una venta (devuelve el stock) |

### Metas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/metas/:mes` | Obtiene la meta de un mes (formato `YYYY-MM`) |
| PUT | `/api/metas` | Crea o actualiza la meta de un mes |

## Ejemplo: registrar una venta

```bash
curl -X POST http://localhost:3000/api/ventas \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2026-07-17",
    "items": [
      { "producto_id": 1, "cantidad": 2 },
      { "producto_id": 3, "cantidad": 1 }
    ]
  }'
```

Esto:
1. Verifica que haya stock suficiente de cada producto
2. Si alguno no alcanza, rechaza TODA la venta con un mensaje claro (nada se guarda a medias)
3. Si hay stock, crea la venta y descuenta automáticamente el stock de cada producto

## Próximos pasos pendientes

- [ ] Conectar el frontend (React) a esta API en vez de usar `localStorage`
- [ ] Subida de imágenes a Cloudinary (reemplazar el base64 de prueba)
- [ ] Módulo 3 de Reportes (producto más vendido, comparativa mes vs mes)
