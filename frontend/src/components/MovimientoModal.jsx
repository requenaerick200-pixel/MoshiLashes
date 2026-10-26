// src/components/MovimientoModal.jsx
// Se abre con el botón ± de cada producto.
//  - Entrada: llegó mercadería (suma stock)
//  - Salida: se dañó, se regaló, uso personal… (resta stock SIN contar como venta)

import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

const RAPIDOS = [1, 5, 10, 20, 50];
const MOTIVOS_SALIDA = ['Dañado / defectuoso', 'Uso personal', 'Regalo / muestra', 'Pérdida', 'Otro'];

export default function MovimientoModal({ producto, onConfirmar, onCerrar }) {
  const [tipo, setTipo] = useState('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const refInput = useRef(null);

  useEffect(() => {
    refInput.current?.focus();
  }, [tipo]);

  const num = Number(cantidad) || 0;
  const nuevoStock = tipo === 'entrada' ? producto.stock_actual + num : producto.stock_actual - num;

  const confirmar = async () => {
    if (!Number.isInteger(num) || num <= 0) return setError('Ingresa una cantidad mayor a 0');
    let motivoFinal = null;
    if (tipo === 'salida') {
      if (num > producto.stock_actual) return setError(`Solo hay ${producto.stock_actual} en stock`);
      motivoFinal = motivo === 'Otro' ? motivoOtro.trim() : motivo;
      if (!motivoFinal) return setError('Elige el motivo de la salida');
    }
    setError('');
    setGuardando(true);
    try {
      await onConfirmar({ tipo, cantidad: num, motivo: motivoFinal });
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={producto.nombre}
      onCerrar={onCerrar}
      pie={
        <button className="btn btn-primario btn-ancho" onClick={confirmar} disabled={guardando || num <= 0}>
          {guardando
            ? 'Guardando…'
            : num > 0
              ? tipo === 'entrada' ? `Sumar ${num} al stock` : `Sacar ${num} del stock`
              : 'Ingresa una cantidad'}
        </button>
      }
    >
      <div className="segmentado">
        <button className={tipo === 'entrada' ? 'activo' : ''} onClick={() => setTipo('entrada')}>＋ Entrada</button>
        <button className={tipo === 'salida' ? 'activo' : ''} onClick={() => setTipo('salida')}>− Salida</button>
      </div>

      {error && <div className="aviso-error">{error}</div>}

      <div className="stock-antes-despues">
        <div>
          <small>Ahora</small>
          <span className="numero">{producto.stock_actual}</span>
        </div>
        <span className="flecha">→</span>
        <div className={nuevoStock < 0 ? 'negativo' : ''}>
          <small>Quedará</small>
          <span className="numero">{num > 0 ? nuevoStock : '—'}</span>
        </div>
      </div>

      <div className="campo">
        <label>{tipo === 'entrada' ? 'Cantidad recibida' : 'Cantidad que sale'}</label>
        <input
          ref={refInput}
          type="number"
          inputMode="numeric"
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirmar()}
          placeholder="Ej. 20"
          enterKeyHint="done"
        />
        <div className="chips" style={{ marginTop: 10, marginBottom: 0 }}>
          {RAPIDOS.map((n) => (
            <button key={n} className="chip" onClick={() => setCantidad(String(num + n))}>+{n}</button>
          ))}
          {num > 0 && <button className="chip" onClick={() => setCantidad('')}>Borrar</button>}
        </div>
      </div>

      {tipo === 'salida' && (
        <div className="campo">
          <label>Motivo</label>
          <div className="chips" style={{ marginBottom: 0 }}>
            {MOTIVOS_SALIDA.map((m) => (
              <button key={m} className={`chip ${motivo === m ? 'activo' : ''}`} onClick={() => setMotivo(m)}>{m}</button>
            ))}
          </div>
          {motivo === 'Otro' && (
            <input style={{ marginTop: 10 }} type="text" value={motivoOtro} onChange={(e) => setMotivoOtro(e.target.value)} placeholder="Escribe el motivo" />
          )}
          <p className="texto-suave" style={{ marginTop: 10 }}>Las ventas se registran en la pestaña Ventas, no aquí.</p>
        </div>
      )}
    </Modal>
  );
}
