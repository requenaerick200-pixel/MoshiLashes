// src/components/DayModal.jsx
// Se abre al tocar un día del calendario (o el botón "Registrar venta de
// hoy"). Muestra lo ya vendido ese día y permite agregar productos
// nuevos eligiéndolos del catálogo (no texto libre). El precio se
// autocompleta desde el catálogo y no es editable.

import { useMemo, useState } from 'react';
import Modal from './Modal';

function formatearFechaLarga(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function DayModal({ fechaISO, ventasDelDia, productos, onRegistrar, onEliminarVenta, onCerrar }) {
  const [seleccion, setSeleccion] = useState({}); // { producto_id: cantidad }
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambiarCantidad = (producto, delta) => {
    setSeleccion((prev) => {
      const actual = prev[producto.id] || 0;
      const nueva = Math.max(0, Math.min(producto.stock_actual, actual + delta));
      return { ...prev, [producto.id]: nueva };
    });
  };

  const items = useMemo(
    () =>
      Object.entries(seleccion)
        .filter(([, cantidad]) => cantidad > 0)
        .map(([producto_id, cantidad]) => ({ producto_id: Number(producto_id), cantidad })),
    [seleccion]
  );

  const totalNuevo = useMemo(() => {
    return items.reduce((suma, item) => {
      const producto = productos.find((p) => p.id === item.producto_id);
      return suma + (producto ? producto.precio * item.cantidad : 0);
    }, 0);
  }, [items, productos]);

  const registrar = async () => {
    if (items.length === 0) {
      setError('Selecciona al menos un producto');
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await onRegistrar({ fecha: fechaISO, items });
      setSeleccion({});
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={formatearFechaLarga(fechaISO)}
      onCerrar={onCerrar}
      pie={
        <button className="btn btn-primario btn-ancho" onClick={registrar} disabled={guardando || items.length === 0}>
          {guardando ? 'Registrando…' : items.length > 0 ? `Registrar venta · S/ ${totalNuevo.toFixed(2)}` : 'Selecciona productos'}
        </button>
      }
    >
      {error && <div className="aviso-error">{error}</div>}

      {ventasDelDia.length > 0 && (
        <>
          <p className="texto-suave" style={{ marginBottom: 8, fontWeight: 600 }}>Ya vendido este día</p>
          <div className="items-del-dia">
            {ventasDelDia.flatMap((venta) =>
              venta.items.map((it) => (
                <div key={it.id} className="item-del-dia">
                  <span>
                    <span className="cantidad-x numero">{it.cantidad}×</span>
                    {it.nombre}
                  </span>
                  <span className="numero">S/ {(it.cantidad * it.precio_unitario).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
          <button
            className="btn-fantasma"
            style={{ fontSize: '0.78rem', marginBottom: 12 }}
            onClick={() => onEliminarVenta(ventasDelDia[ventasDelDia.length - 1].id)}
          >
            Deshacer último registro de este día
          </button>
          <div className="separador" />
        </>
      )}

      <p className="texto-suave" style={{ marginBottom: 8, fontWeight: 600 }}>Agregar productos</p>

      {productos.length === 0 ? (
        <p className="texto-suave">No hay productos en el catálogo todavía.</p>
      ) : (
        <div className="selector-productos">
          {productos.map((p) => {
            const cantidad = seleccion[p.id] || 0;
            const sinStock = p.stock_actual === 0;
            return (
              <div className="fila-producto-venta" key={p.id}>
                <span className="nombre">
                  {p.nombre}
                  {sinStock && <div className="sin-stock">Sin stock</div>}
                </span>
                <span className="numero" style={{ fontSize: '0.82rem', color: 'var(--texto-suave)' }}>
                  S/ {Number(p.precio).toFixed(2)}
                </span>
                <div className="contador">
                  <button onClick={() => cambiarCantidad(p, -1)} disabled={cantidad === 0}>
                    −
                  </button>
                  <span className="cantidad">{cantidad}</span>
                  <button onClick={() => cambiarCantidad(p, 1)} disabled={cantidad >= p.stock_actual}>
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="resumen-venta">
          <span>Total a registrar</span>
          <span className="numero">S/ {totalNuevo.toFixed(2)}</span>
        </div>
      )}
    </Modal>
  );
}
