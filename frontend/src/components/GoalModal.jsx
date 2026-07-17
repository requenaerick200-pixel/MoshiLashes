// src/components/GoalModal.jsx
// Formulario simple para fijar la meta de ventas del mes visible.

import { useState } from 'react';
import Modal from './Modal';

export default function GoalModal({ mes, montoActual, onGuardar, onCerrar }) {
  const [monto, setMonto] = useState(montoActual ? String(montoActual) : '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const nombreMes = new Date(`${mes}-01T00:00:00`).toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
  });

  const guardar = async () => {
    const valor = Number(monto);
    if (!monto || isNaN(valor) || valor <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await onGuardar(valor);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={`Meta de ${nombreMes}`}
      onCerrar={onCerrar}
      pie={
        <button className="btn btn-primario btn-ancho" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar meta'}
        </button>
      }
    >
      {error && <div className="aviso-error">{error}</div>}

      <div className="campo">
        <label>Monto meta (S/)</label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Ej. 3000"
          autoFocus
        />
      </div>
    </Modal>
  );
}
