// src/components/CatalogoTab.jsx

import { useEffect, useState } from 'react';
import { api } from '../api';
import ProductCard from './ProductCard';
import ProductFormModal from './ProductFormModal';
import ReabastecerModal from './ReabastecerModal';

export default function CatalogoTab() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [modalFormulario, setModalFormulario] = useState(null); // null | 'nuevo' | producto
  const [modalReabastecer, setModalReabastecer] = useState(null); // null | producto

  const cargarProductos = async () => {
    try {
      const datos = await api.listarProductos();
      setProductos(datos);
      setError('');
    } catch (e) {
      setError('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const guardarProducto = async (datosForm) => {
    if (modalFormulario === 'nuevo') {
      await api.crearProducto(datosForm);
    } else {
      await api.editarProducto(modalFormulario.id, datosForm);
    }
    setModalFormulario(null);
    await cargarProductos();
  };

  const eliminarProducto = async (producto) => {
    if (!confirm(`¿Eliminar "${producto.nombre}" del catálogo?`)) return;
    try {
      const resultado = await api.eliminarProducto(producto.id);
      setModalFormulario(null);
      await cargarProductos();
      if (resultado?.archivado) {
        alert(resultado.mensaje);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const confirmarReabastecer = async (id, cantidad) => {
    await api.reabastecerProducto(id, cantidad);
    setModalReabastecer(null);
    await cargarProductos();
  };

  return (
    <div>
      <div className="encabezado">
        <div className="marca">
          Moshi<span>Lashes</span>
        </div>
      </div>

      {error && <div className="aviso-conexion">{error}</div>}

      {cargando ? (
        <div className="cargando">Cargando catálogo…</div>
      ) : productos.length === 0 && !error ? (
        <div className="estado-vacio">
          <div className="icono-vacio">🧴</div>
          <h3>Aún no hay productos</h3>
          <p>Toca el botón + para agregar el primero a tu catálogo.</p>
        </div>
      ) : (
        <div className="lista-productos">
          {productos.map((p) => (
            <ProductCard
              key={p.id}
              producto={p}
              onSumarStock={setModalReabastecer}
              onEditar={setModalFormulario}
            />
          ))}
        </div>
      )}

      <button className="btn-fab" onClick={() => setModalFormulario('nuevo')} aria-label="Agregar producto">
        +
      </button>

      {modalFormulario && (
        <ProductFormModal
          productoInicial={modalFormulario === 'nuevo' ? null : modalFormulario}
          onGuardar={guardarProducto}
          onEliminar={eliminarProducto}
          onCerrar={() => setModalFormulario(null)}
        />
      )}

      {modalReabastecer && (
        <ReabastecerModal
          producto={modalReabastecer}
          onConfirmar={confirmarReabastecer}
          onCerrar={() => setModalReabastecer(null)}
        />
      )}
    </div>
  );
}