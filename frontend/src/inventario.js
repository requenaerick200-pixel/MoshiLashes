// src/inventario.js
// Utilidades compartidas del módulo de inventario.

// Quita tildes y pasa a minúsculas para buscar "pestanas" y encontrar "Pestañas".
export function normalizar(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// 'agotado' | 'bajo' | 'ok'
export function estadoStock(p) {
  if (p.stock_actual <= 0) return 'agotado';
  if (p.stock_minimo != null && p.stock_actual <= p.stock_minimo) return 'bajo';
  return 'ok';
}

// Lista de categorías únicas (respetando cómo se escribieron), ordenadas.
export function categoriasDe(productos) {
  const mapa = new Map();
  productos.forEach((p) => {
    if (p.categoria) mapa.set(normalizar(p.categoria), p.categoria);
  });
  return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

export function existeNombre(productos, nombre, excluirId = null) {
  const n = normalizar(nombre);
  return n !== '' && productos.some((p) => p.id !== excluirId && normalizar(p.nombre) === n);
}

export const soles = (n) =>
  `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Convierte texto pegado (de notas, WhatsApp o Excel) en filas de productos.
// Acepta una línea por producto: "Nombre, precio, stock" — separado por
// coma, punto y coma, tab o " - ". Precio y stock son opcionales.
export function parsearLista(texto) {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linea) => {
      const partes = linea.split(/\t|;|\s-\s|,(?=\s*\d)/).map((x) => x.trim()).filter(Boolean);
      const nombre = partes[0] || '';
      const precio = (partes[1] || '').replace(/s\/\.?\s*/i, '').replace(',', '.');
      const stock = (partes[2] || '').replace(/\D/g, '');
      return { nombre, precio: isNaN(Number(precio)) ? '' : precio, stock };
    });
}
