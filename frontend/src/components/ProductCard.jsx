// src/components/ProductCard.jsx

export default function ProductCard({ producto, onSumarStock, onEditar }) {
  const stockBajo =
    producto.stock_minimo != null && producto.stock_actual <= producto.stock_minimo;

  const iniciales = producto.nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className={`tarjeta-producto ${stockBajo ? 'stock-bajo' : ''}`}>
      <button onClick={() => onEditar(producto)} style={{ display: 'flex', flex: 1, gap: 12, alignItems: 'center', textAlign: 'left' }}>
        {producto.imagen_url ? (
          <img className="miniatura" src={producto.imagen_url} alt={producto.nombre} />
        ) : (
          <div className="miniatura miniatura-vacia">{iniciales}</div>
        )}

        <div className="info-producto">
          <div className="nombre">{producto.nombre}</div>
          <div className="meta-linea">
            <span className="precio-chip numero">S/ {Number(producto.precio).toFixed(2)}</span>
            <span>·</span>
            <span>Stock: {producto.stock_actual}</span>
            {stockBajo && <span className="badge-bajo">Bajo</span>}
          </div>
        </div>
      </button>

      <button
        className="btn-sumar"
        onClick={() => onSumarStock(producto)}
        aria-label={`Reabastecer ${producto.nombre}`}
      >
        +
      </button>
    </div>
  );
}
