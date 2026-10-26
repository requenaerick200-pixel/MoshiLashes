// src/components/ArchivadosModal.jsx
// Productos archivados (los que se "eliminaron" pero tenían ventas).
// Se pueden restaurar al catálogo.

import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from './Modal';

export default function ArchivadosModal({ onRestaurar, onCerrar }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');

  const cargar = () => api.listarArchivados().then(setLista).catch((e) => setError(e.message));
  useEffect(() => {
    cargar();
  }, []);

  const restaurar = async (p) => {
    try {
      await onRestaurar(p);
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Modal titulo="Archivados" onCerrar={onCerrar}>
      {error && <div className="aviso-error">{error}</div>}
      {lista === null && !error && <div className="cargando">Cargando…</div>}
      {lista?.length === 0 && <p className="texto-suave">No tienes productos archivados.</p>}
      <div className="selector-productos">
        {lista?.map((p) => (
          <div key={p.id} className="fila-producto-venta">
            <span className="nombre">
              {p.nombre}
              <div className="sub-stock">S/ {Number(p.precio).toFixed(2)} · Stock {p.stock_actual}</div>
            </span>
            <button className="btn btn-secundario" style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={() => restaurar(p)}>
              Restaurar
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
