// src/components/CatalogoTab.jsx
// Módulo de Inventario: resumen, búsqueda, filtros y accesos rápidos para
// agregar productos (uno o varios), recibir mercadería y registrar salidas.

import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { categoriasDe, estadoStock, normalizar, soles } from '../inventario';
import ProductCard from './ProductCard';
import ProductFormModal from './ProductFormModal';
import MovimientoModal from './MovimientoModal';
import RecepcionModal from './RecepcionModal';
import LoteModal from './LoteModal';
import HistorialModal from './HistorialModal';
import ArchivadosModal from './ArchivadosModal';
import Toast from './Toast';

export default function CatalogoTab() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos'); // 'todos' | 'bajo' | 'agotado' | 'cat:<nombre>'

  // Modales: solo uno abierto a la vez
  const [modal, setModal] = useState(null); // { tipo, producto?, plantilla? }
  const [toast, setToast] = useState(null);

  const avisar = (mensaje, tipo = 'ok') => setToast({ mensaje, tipo, id: Date.now() });
  const cerrar = () => setModal(null);

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

  // ---------- Derivados ----------
  const categorias = useMemo(() => categoriasDe(productos), [productos]);

  const resumen = useMemo(() => {
    let unidades = 0, valor = 0, bajos = 0, agotados = 0;
    productos.forEach((p) => {
      unidades += p.stock_actual;
      valor += p.stock_actual * Number(p.precio);
      const e = estadoStock(p);
      if (e === 'bajo') bajos++;
      if (e === 'agotado') agotados++;
    });
    return { unidades, valor, bajos, agotados };
  }, [productos]);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    return productos.filter((p) => {
      if (q && !normalizar(`${p.nombre} ${p.categoria || ''}`).includes(q)) return false;
      if (filtro === 'bajo') return estadoStock(p) === 'bajo';
      if (filtro === 'agotado') return estadoStock(p) === 'agotado';
      if (filtro.startsWith('cat:')) return p.categoria === filtro.slice(4);
      return true;
    });
  }, [productos, busqueda, filtro]);

  // ---------- Acciones ----------
  const guardarProducto = async (datosForm, { seguir } = {}) => {
    const editando = modal?.tipo === 'editar';
    if (editando) {
      await api.editarProducto(modal.producto.id, datosForm);
      avisar(`✓ Cambios guardados`);
      cerrar();
    } else {
      await api.crearProducto(datosForm);
      avisar(`✓ "${datosForm.nombre}" agregado`);
      if (!seguir) cerrar();
    }
    await cargarProductos();
  };

  const eliminarProducto = async (producto) => {
    if (!confirm(`¿Eliminar "${producto.nombre}" del catálogo?`)) return;
    try {
      const resultado = await api.eliminarProducto(producto.id);
      cerrar();
      await cargarProductos();
      avisar(resultado?.archivado ? `"${producto.nombre}" se archivó (tiene ventas)` : `"${producto.nombre}" eliminado`);
    } catch (e) {
      avisar(e.message, 'error');
    }
  };

  const registrarMovimiento = async ({ tipo, cantidad, motivo }) => {
    const p = modal.producto;
    if (tipo === 'entrada') await api.reabastecerProducto(p.id, cantidad, motivo);
    else await api.registrarSalida(p.id, cantidad, motivo);
    cerrar();
    await cargarProductos();
    avisar(tipo === 'entrada' ? `+${cantidad} a "${p.nombre}"` : `−${cantidad} de "${p.nombre}"`);
  };

  const recibir = async (items, motivo) => {
    const r = await api.recibirMercaderia(items, motivo);
    cerrar();
    await cargarProductos();
    avisar(`✓ ${r.unidades} unidades en ${r.productos} producto${r.productos === 1 ? '' : 's'}`);
  };

  const crearLote = async (lista) => {
    const r = await api.crearProductosLote(lista);
    cerrar();
    await cargarProductos();
    avisar(`✓ ${r.creados} producto${r.creados === 1 ? '' : 's'} agregado${r.creados === 1 ? '' : 's'}`);
  };

  const restaurar = async (producto) => {
    await api.restaurarProducto(producto.id);
    await cargarProductos();
    avisar(`"${producto.nombre}" volvió al catálogo`);
  };

  const duplicar = (producto) => {
    setModal({
      tipo: 'nuevo',
      plantilla: {
        nombre: `${producto.nombre} `,
        precio: producto.precio,
        categoria: producto.categoria,
        stock_minimo: producto.stock_minimo,
        imagen_url: producto.imagen_url,
      },
    });
  };

  // ---------- Render ----------
  const chip = (id, etiqueta, extra = '') => (
    <button
      key={id}
      className={`chip ${filtro === id ? 'activo' : ''} ${extra}`}
      onClick={() => setFiltro(filtro === id ? 'todos' : id)}
    >
      {etiqueta}
    </button>
  );

  return (
    <div>
      <div className="encabezado">
        <div className="marca">
          Moshi<span>Lashes</span>
        </div>
        <button className="btn-texto" onClick={() => setModal({ tipo: 'archivados' })}>
          Archivados
        </button>
      </div>

      {error && <div className="aviso-conexion">{error}</div>}

      {!cargando && productos.length > 0 && (
        <div className="resumen-inventario">
          <div>
            <div className="etiqueta">Valor del inventario</div>
            <div className="valor numero">{soles(resumen.valor)}</div>
          </div>
          <div className="resumen-sub">
            <span><strong className="numero">{productos.length}</strong> productos</span>
            <span><strong className="numero">{resumen.unidades}</strong> unidades</span>
          </div>
        </div>
      )}

      <div className="acciones-rapidas">
        <button onClick={() => setModal({ tipo: 'recepcion' })}>
          <span className="ico">📦</span>
          <span>Recibir<br />mercadería</span>
        </button>
        <button onClick={() => setModal({ tipo: 'nuevo' })}>
          <span className="ico">＋</span>
          <span>Nuevo<br />producto</span>
        </button>
        <button onClick={() => setModal({ tipo: 'lote' })}>
          <span className="ico">☰</span>
          <span>Agregar<br />varios</span>
        </button>
      </div>

      <div className="barra-busqueda">
        <input
          type="search"
          placeholder={`Buscar entre ${productos.length} productos…`}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button className="limpiar" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">✕</button>
        )}
      </div>

      <div className="chips">
        {chip('todos', 'Todos')}
        {resumen.agotados > 0 && chip('agotado', `Agotados · ${resumen.agotados}`, 'chip-peligro')}
        {resumen.bajos > 0 && chip('bajo', `Stock bajo · ${resumen.bajos}`, 'chip-aviso')}
        {categorias.map((c) => chip(`cat:${c}`, c))}
      </div>

      {cargando ? (
        <div className="cargando">Cargando catálogo…</div>
      ) : productos.length === 0 && !error ? (
        <div className="estado-vacio">
          <div className="icono-vacio">🧴</div>
          <h3>Aún no hay productos</h3>
          <p>Usa “Agregar varios” para cargar tu inventario de una sola vez.</p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="estado-vacio">
          <h3>Sin resultados</h3>
          <p>
            No hay productos que coincidan.{' '}
            {busqueda && (
              <button
                className="btn-texto"
                onClick={() => setModal({ tipo: 'nuevo', plantilla: { nombre: busqueda } })}
              >
                Crear “{busqueda}”
              </button>
            )}
          </p>
        </div>
      ) : (
        <div className="lista-productos">
          {visibles.map((p) => (
            <ProductCard
              key={p.id}
              producto={p}
              onSumarStock={(producto) => setModal({ tipo: 'movimiento', producto })}
              onEditar={(producto) => setModal({ tipo: 'editar', producto })}
            />
          ))}
        </div>
      )}

      <button className="btn-fab" onClick={() => setModal({ tipo: 'nuevo' })} aria-label="Agregar producto">
        +
      </button>

      {(modal?.tipo === 'nuevo' || modal?.tipo === 'editar') && (
        <ProductFormModal
          key={modal.plantilla ? JSON.stringify(modal.plantilla) : modal.producto?.id || 'nuevo'}
          productoInicial={modal.tipo === 'editar' ? modal.producto : null}
          plantilla={modal.plantilla}
          productos={productos}
          categorias={categorias}
          onGuardar={guardarProducto}
          onEliminar={eliminarProducto}
          onDuplicar={duplicar}
          onVerHistorial={(producto) => setModal({ tipo: 'historial', producto })}
          onCerrar={cerrar}
        />
      )}

      {modal?.tipo === 'movimiento' && (
        <MovimientoModal producto={modal.producto} onConfirmar={registrarMovimiento} onCerrar={cerrar} />
      )}

      {modal?.tipo === 'recepcion' && (
        <RecepcionModal productos={productos} onConfirmar={recibir} onCerrar={cerrar} />
      )}

      {modal?.tipo === 'lote' && (
        <LoteModal productos={productos} categorias={categorias} onConfirmar={crearLote} onCerrar={cerrar} />
      )}

      {modal?.tipo === 'historial' && <HistorialModal producto={modal.producto} onCerrar={cerrar} />}

      {modal?.tipo === 'archivados' && <ArchivadosModal onRestaurar={restaurar} onCerrar={cerrar} />}

      {toast && <Toast key={toast.id} {...toast} onFin={() => setToast(null)} />}
    </div>
  );
}
