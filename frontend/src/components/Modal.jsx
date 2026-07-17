// src/components/Modal.jsx
// Modal base reutilizable. Todos los formularios de la app (agregar
// producto, reabastecer, registrar venta, editar meta) usan esto en vez
// de prompt()/alert() del navegador.

export default function Modal({ titulo, onCerrar, children, pie }) {
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-hoja" onClick={(e) => e.stopPropagation()}>
        <div className="modal-agarradera" />
        <div className="modal-encabezado">
          <h2>{titulo}</h2>
          <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>
  );
}
