// src/components/Toast.jsx
// Aviso corto que aparece abajo y se va solo (reemplaza a alert()).

import { useEffect, useRef } from 'react';

export default function Toast({ mensaje, tipo = 'ok', onFin }) {
  const finRef = useRef(onFin);
  finRef.current = onFin;

  useEffect(() => {
    const t = setTimeout(() => finRef.current(), 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`toast ${tipo === 'error' ? 'toast-error' : ''}`} role="status">
      {mensaje}
    </div>
  );
}
