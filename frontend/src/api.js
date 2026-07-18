// src/api.js
// Centraliza todas las llamadas al backend. Si cambia la URL del
// servidor (por ejemplo al pasar de desarrollo a producción), solo se
// edita VITE_API_URL en el archivo .env — no hay que tocar componentes.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function solicitar(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const mensaje = datos?.error || `Error ${respuesta.status}`;
    throw new Error(mensaje);
  }

  return datos;
}

export const api = {
  // Salud del servidor
  health: () => solicitar('/health'),

  // Productos (Catálogo)
  listarProductos: () => solicitar('/productos'),
  crearProducto: (producto) =>
    solicitar('/productos', { method: 'POST', body: JSON.stringify(producto) }),
  editarProducto: (id, cambios) =>
    solicitar(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(cambios) }),
  reabastecerProducto: (id, cantidad_recibida) =>
    solicitar(`/productos/${id}/reabastecer`, {
      method: 'PUT',
      body: JSON.stringify({ cantidad_recibida }),
    }),
  eliminarProducto: (id) => solicitar(`/productos/${id}`, { method: 'DELETE' }),

  // Ventas
  listarVentas: (mes) => solicitar(`/ventas?mes=${mes}`),
  resumenMes: (mes, hoy) => solicitar(`/ventas/resumen-mes?mes=${mes}${hoy ? `&hoy=${hoy}` : ''}`),
  registrarVenta: (venta) =>
    solicitar('/ventas', { method: 'POST', body: JSON.stringify(venta) }),
  eliminarVenta: (id) => solicitar(`/ventas/${id}`, { method: 'DELETE' }),
  eliminarItemVenta: (itemId) => solicitar(`/ventas/items/${itemId}`, { method: 'DELETE' }),

  // Metas
  obtenerMeta: (mes) => solicitar(`/metas/${mes}`),
  guardarMeta: (mes, monto_meta) =>
    solicitar('/metas', { method: 'PUT', body: JSON.stringify({ mes, monto_meta }) }),
};
