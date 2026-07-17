// src/components/ReabastecerModal.jsx
// Ventana que se abre al tocar el botón "+" de un producto en el catálogo.
// Suma la "cantidad recibida" al stock actual (flujo de reabastecimiento).

import { useState } from 'react';
import Modal from './Modal';

export default function ReabastecerModal({ producto, onConfirmar, onCerrar }) {
  const [cantidad, setCantidad] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const confirmar = async () => {
    const num = Number(cantidad);
    if (!cantidad || num <= 0) {
      setError('Ingresa una cantidad mayor a 0');
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await onConfirmar(producto.id, num);
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo="Reabastecer stock"
      onCerrar={onCerrar}
      pie={
        <button className="btn btn-primario btn-ancho" onClick={confirmar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Agregar al stock'}
        </button>
      }
    >
      {error && <div className="aviso-error">{error}</div>}

      <p className="texto-suave" style={{ marginBottom: 16 }}>
        <strong style={{ color: 'var(--texto)' }}>{producto.nombre}</strong>
        <br />
        Stock actual: <span className="numero">{producto.stock_actual}</span>
      </p>

      <div className="campo">
        <label>Cantidad recibida</label>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          autoFocus
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Ej. 20"
        />
      </div>

      {cantidad && Number(cantidad) > 0 && (
        <p className="texto-suave">
          Nuevo stock: <span className="numero" style={{ color: 'var(--vino)', fontWeight: 700 }}>
            {producto.stock_actual + Number(cantidad)}
          </span>
        </p>
      )}
    </Modal>
  );
}
