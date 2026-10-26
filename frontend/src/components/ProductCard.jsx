// src/components/ProductCard.jsx

import { estadoStock } from '../inventario';

export default function ProductCard({ producto, onSumarStock, onEditar }) {
  const estado = estadoStock(producto);

  const iniciales = producto.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className={`tarjeta-producto ${estado === 'bajo' ? 'stock-bajo' : ''} ${estado === 'agotado' ? 'agotado' : ''}`}>
      <button onClick={() => onEditar(producto)} style={{ display: 'flex', flex: 1, gap: 12, alignItems: 'center', textAlign: 'left', minWidth: 0 }}>
        {producto.imagen_url ? (
          <img className="miniatura" src={producto.imagen_url} alt={producto.nombre} loading="lazy" />
        ) : (
          <div className="miniatura miniatura-vacia">{iniciales}</div>
        )}

        <div className="info-producto">
          <div className="nombre">{producto.nombre}</div>
          <div className="meta-linea">
            <span className="precio-chip numero">S/ {Number(producto.precio).toFixed(2)}</span>
          </div>
        </div>
      </button>

      <div className={`stock-pill ${estado}`}>
        <span className="numero">{producto.stock_actual}</span>
        <small>{estado === 'agotado' ? 'agotado' : estado === 'bajo' ? 'bajo' : 'en stock'}</small>
      </div>

      <button
        className="btn-sumar"
        onClick={() => onSumarStock(producto)}
        aria-label={`Mover stock de ${producto.nombre}`}
      >
        ±
      </button>
    </div>
  );
}
