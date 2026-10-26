// src/components/HistorialModal.jsx
// Historial de movimientos de stock de un producto (kardex).

import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from './Modal';

const ETIQUETAS = {
  alta: 'Stock inicial',
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  venta: 'Venta',
  devolucion: 'Devolución',
};

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-PE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function HistorialModal({ producto, onCerrar }) {
  const [movimientos, setMovimientos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.historialProducto(producto.id).then(setMovimientos).catch((e) => setError(e.message));
  }, [producto.id]);

  return (
    <Modal titulo={`Historial`} onCerrar={onCerrar}>
      <p className="texto-suave" style={{ marginBottom: 14 }}>
        <strong style={{ color: 'var(--texto)' }}>{producto.nombre}</strong> · Stock actual{' '}
        <span className="numero">{producto.stock_actual}</span>
      </p>
      {error && <div className="aviso-error">{error}</div>}
      {movimientos === null && !error && <div className="cargando">Cargando…</div>}
      {movimientos?.length === 0 && (
        <p className="texto-suave">Aún no hay movimientos registrados. Desde ahora cada entrada, salida y venta aparecerá aquí.</p>
      )}
      <div className="lista-movimientos">
        {movimientos?.map((m) => (
          <div key={m.id} className="movimiento">
            <span className={`mov-cantidad numero ${m.cantidad >= 0 ? 'positivo' : 'negativo'}`}>
              {m.cantidad > 0 ? '+' : ''}{m.cantidad}
            </span>
            <div className="mov-info">
              <div className="mov-tipo">{ETIQUETAS[m.tipo] || m.tipo}{m.motivo && <span> · {m.motivo}</span>}</div>
              <div className="mov-fecha">{formatearFecha(m.creado_en)}</div>
            </div>
            <span className="mov-resultado numero">{m.stock_resultante}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
