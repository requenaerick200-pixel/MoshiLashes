// src/components/RecepcionModal.jsx
// "Recibir mercadería": cuando llega un pedido con varios productos, los
// sumas todos de una vez en vez de abrir uno por uno.

import { useMemo, useState } from 'react';
import Modal from './Modal';
import { estadoStock, normalizar } from '../inventario';

export default function RecepcionModal({ productos, onConfirmar, onCerrar }) {
  const [cantidades, setCantidades] = useState({}); // { id: number }
  const [busqueda, setBusqueda] = useState('');
  const [soloFaltantes, setSoloFaltantes] = useState(false);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (id, valor) =>
    setCantidades((prev) => ({ ...prev, [id]: Math.max(0, Number(valor) || 0) }));

  const lista = useMemo(() => {
    const q = normalizar(busqueda);
    return productos
      .filter((p) => !q || normalizar(p.nombre).includes(q))
      .filter((p) => !soloFaltantes || estadoStock(p) !== 'ok')
      // Primero los agotados y con stock bajo: es lo que normalmente llega
      .sort((a, b) => {
        const orden = { agotado: 0, bajo: 1, ok: 2 };
        return orden[estadoStock(a)] - orden[estadoStock(b)] || a.nombre.localeCompare(b.nombre, 'es');
      });
  }, [productos, busqueda, soloFaltantes]);

  const items = Object.entries(cantidades)
    .filter(([, c]) => c > 0)
    .map(([producto_id, cantidad]) => ({ producto_id: Number(producto_id), cantidad }));
  const unidades = items.reduce((s, it) => s + it.cantidad, 0);

  const confirmar = async () => {
    if (items.length === 0) return setError('Pon la cantidad recibida en al menos un producto');
    setError('');
    setGuardando(true);
    try {
      await onConfirmar(items, nota.trim() || undefined);
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo="Recibir mercadería"
      onCerrar={onCerrar}
      pie={
        <button className="btn btn-primario btn-ancho" onClick={confirmar} disabled={guardando || items.length === 0}>
          {guardando
            ? 'Guardando…'
            : items.length
              ? `Sumar ${unidades} unidades · ${items.length} producto${items.length === 1 ? '' : 's'}`
              : 'Pon las cantidades recibidas'}
        </button>
      }
    >
      {error && <div className="aviso-error">{error}</div>}

      <div className="barra-busqueda" style={{ marginBottom: 10 }}>
        <input type="search" placeholder="Buscar producto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>
      <div className="chips">
        <button className={`chip ${!soloFaltantes ? 'activo' : ''}`} onClick={() => setSoloFaltantes(false)}>Todos</button>
        <button className={`chip ${soloFaltantes ? 'activo' : ''}`} onClick={() => setSoloFaltantes(true)}>Solo agotados / bajos</button>
      </div>

      <div className="selector-productos">
        {lista.map((p) => {
          const c = cantidades[p.id] || 0;
          const estado = estadoStock(p);
          return (
            <div className={`fila-producto-venta ${c > 0 ? 'seleccionada' : ''}`} key={p.id}>
              <span className="nombre">
                {p.nombre}
                <div className={`sub-stock ${estado}`}>
                  Stock {p.stock_actual}{c > 0 && <> → <strong>{p.stock_actual + c}</strong></>}
                </div>
              </span>
              <div className="contador">
                <button onClick={() => cambiar(p.id, c - 1)} disabled={c === 0}>−</button>
                <input
                  className="cantidad-input numero"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={c || ''}
                  placeholder="0"
                  onChange={(e) => cambiar(p.id, e.target.value)}
                />
                <button onClick={() => cambiar(p.id, c + 1)}>+</button>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && <p className="texto-suave">No hay productos que coincidan.</p>}
      </div>

      <div className="campo" style={{ marginTop: 16, marginBottom: 0 }}>
        <label>Nota (opcional)</label>
        <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Pedido de la proveedora del lunes" />
      </div>
    </Modal>
  );
}
