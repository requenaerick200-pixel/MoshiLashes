# MoshiLashes — Casos de uso del Inventario

Actor principal: **Dueña / vendedora** (única usuaria del sistema).
Regla general: **todo cambio de stock queda registrado** en el historial
(`movimientos_stock`), con tipo, cantidad, stock resultante, motivo y fecha.

| # | Caso de uso | Dónde está en la app |
|---|---|---|
| CU-01 | Registrar un producto nuevo | Botón **Nuevo producto** o **+** flotante |
| CU-02 | Registrar varios productos seguidos (variantes) | **Guardar y agregar otro** |
| CU-03 | Duplicar un producto | Editar producto → **Duplicar** |
| CU-04 | Registrar muchos productos de una vez | **Agregar varios** (planilla o pegar lista) |
| CU-05 | Recibir mercadería de varios productos | **Recibir mercadería** |
| CU-06 | Reponer stock de un producto | Botón **±** → Entrada |
| CU-07 | Registrar salida que no es venta | Botón **±** → Salida |
| CU-08 | Corregir el stock (ajuste) | Editar producto → Stock actual |
| CU-09 | Editar datos de un producto | Tocar el producto |
| CU-10 | Buscar y filtrar productos | Buscador + filtros |
| CU-11 | Ver alertas de stock bajo / agotado | Filtros “Agotados” / “Stock bajo” y etiqueta en cada tarjeta |
| CU-12 | Ver el historial de un producto | Editar producto → **Historial** |
| CU-13 | Eliminar / archivar un producto | Editar producto → **Eliminar** |
| CU-14 | Restaurar un producto archivado | **Archivados** (arriba a la derecha) |
| CU-15 | Ver el valor del inventario | Tarjeta de resumen del catálogo |
| CU-16 | Venta y devolución descuentan / devuelven stock | Pestaña **Ventas** (automático) |

---

### CU-01 Registrar un producto nuevo
- **Flujo:** Nuevo producto → escribe nombre (el cursor ya está ahí) → *Enter* → precio → *Enter* → cantidad → *Enter* → alerta mínima → *Enter* guarda.
- **Opcional:** foto, categoría (se elige con un toque entre las que ya existen o se escribe una nueva), alerta de stock mínimo.
- **Reglas:** nombre obligatorio y **no repetido** (sin importar mayúsculas/tildes); precio ≥ 0; cantidad entera ≥ 0. Si la cantidad > 0 se registra un movimiento “Stock inicial”.

### CU-02 Registrar varios productos seguidos
- **Flujo:** en el formulario de nuevo producto, **Guardar y agregar otro**. El formulario queda abierto, limpia nombre/foto/cantidad y **conserva precio, categoría y alerta** (ideal para variantes de color). Muestra cuántos llevas agregados.

### CU-03 Duplicar un producto
- **Flujo:** abrir un producto → **Duplicar**. Se abre “Nuevo producto” con el mismo nombre (cursor al final para escribir la variante), precio, categoría, alerta y foto; la cantidad empieza en 0.

### CU-04 Registrar muchos productos de una vez
- **Flujo A (planilla):** Agregar varios → escribe Nombre / Precio / Cant. por fila; *Enter* salta a la siguiente celda; siempre aparece una fila vacía nueva.
- **Flujo B (pegar lista):** “Pegar una lista” → pega desde Notas/WhatsApp/Excel, una línea por producto: `Nombre, precio, cantidad`.
- **Reglas:** se marcan en rojo filas sin precio, con nombre repetido o que ya existe. Se guarda **todo o nada** (transacción). Categoría común opcional. Máx. 200 por lote.

### CU-05 Recibir mercadería de varios productos
- **Flujo:** Recibir mercadería → aparecen primero los agotados y con stock bajo → pon la cantidad recibida en cada uno (− / + o escribiendo) → muestra “Stock 2 → 12” → **Sumar N unidades**.
- **Opcional:** nota (ej. proveedora). Todo en una transacción.

### CU-06 Reponer stock de un producto
- **Flujo:** **±** en el producto → Entrada → escribe cantidad o toca +1/+5/+10/+20/+50 → muestra “Ahora → Quedará” → confirmar.

### CU-07 Registrar salida que no es venta
- **Flujo:** **±** → Salida → cantidad → motivo (Dañado, Uso personal, Regalo/muestra, Pérdida, Otro).
- **Reglas:** motivo obligatorio; no puede sacar más de lo que hay. No cuenta como venta (no afecta la meta).

### CU-08 Corregir el stock (ajuste)
- **Flujo:** editar producto → cambiar “Stock actual”. Se avisa que se guardará como ajuste (+/−) en el historial.

### CU-09 Editar datos de un producto
- Nombre, precio, categoría, foto (se puede **quitar**), alerta mínima (se puede **dejar vacía**). El precio nuevo no cambia ventas pasadas (precio histórico).

### CU-10 Buscar y filtrar
- Búsqueda instantánea sin importar tildes (“pestanas” encuentra “Pestañas”). Filtros: Todos, Agotados, Stock bajo y uno por cada categoría. Si no hay resultados, ofrece **Crear “lo que buscaste”**.

### CU-11 Alertas de stock
- Cada tarjeta muestra el stock grande con estado: *en stock*, *bajo* (≤ alerta mínima) o *agotado* (0). Los filtros muestran cuántos hay de cada uno.

### CU-12 Historial de un producto
- Lista los últimos 100 movimientos: +/− cantidad, tipo (Stock inicial, Entrada, Salida, Ajuste, Venta, Devolución), motivo, fecha y stock resultante.

### CU-13 Eliminar / archivar
- Sin ventas → se elimina. Con ventas → se **archiva** (no se pierde el historial de ventas).

### CU-14 Restaurar archivado
- Archivados → Restaurar. Si ya existe otro producto activo con el mismo nombre, pide renombrarlo primero.

### CU-15 Valor del inventario
- Resumen: valor total a precio de venta (Σ stock × precio), número de productos y unidades.

### CU-16 Ventas y devoluciones
- Registrar venta descuenta stock y registra “Venta”. Quitar un producto de una venta o eliminar la venta devuelve el stock y registra “Devolución”.

---

## API nueva / cambiada

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/productos/lote` | CU-04 |
| POST | `/api/productos/recepcion` | CU-05 |
| PUT | `/api/productos/:id/reabastecer` | CU-06 (ahora acepta `motivo`) |
| POST | `/api/productos/:id/salida` | CU-07 |
| PUT | `/api/productos/:id` | CU-08/09 — ahora solo cambia lo enviado y permite `null` |
| GET | `/api/productos/:id/movimientos` | CU-12 |
| GET | `/api/productos/archivados` | CU-14 |
| PUT | `/api/productos/:id/restaurar` | CU-14 |

## Base de datos
- Nueva columna `productos.categoria`.
- Nueva tabla `movimientos_stock`.
- Se crean **solas** al arrancar el backend (`backend/db/migrate.js`), no hay que correr SQL a mano.
