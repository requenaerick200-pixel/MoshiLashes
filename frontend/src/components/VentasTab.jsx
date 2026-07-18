// src/components/VentasTab.jsx
// Orquesta todo el módulo de ventas: navegación entre meses, tarjeta
// resumen con la "cinta métrica" de la meta, calendario del mes y los
// modales de día y de meta. Carga productos (para el selector de venta),
// ventas del mes y la meta cada vez que cambia el mes visible.

import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import CalendarGrid from './CalendarGrid';
import DayModal from './DayModal';
import GoalModal from './GoalModal';

function mesISO(anio, mes) {
  // mes: 0-indexado -> 'YYYY-MM'
  return `${anio}-${String(mes + 1).padStart(2, '0')}`;
}

function hoyISO() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
    hoy.getDate()
  ).padStart(2, '0')}`;
}

export default function VentasTab() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth()); // 0-indexado

  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [diaSeleccionado, setDiaSeleccionado] = useState(null); // número de día o null
  const [modalMeta, setModalMeta] = useState(false);

  const mesActualISO = mesISO(anio, mes);

  const cargarMes = async () => {
    setCargando(true);
    try {
      const [ventasData, resumenData, productosData] = await Promise.all([
        api.listarVentas(mesActualISO),
        api.resumenMes(mesActualISO, hoyISO()),
        api.listarProductos(),
      ]);
      setVentas(ventasData);
      setResumen(resumenData);
      setProductos(productosData);
      setError('');
    } catch (e) {
      setError('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesActualISO]);

  const cambiarMes = (delta) => {
    let nuevoMes = mes + delta;
    let nuevoAnio = anio;
    if (nuevoMes < 0) {
      nuevoMes = 11;
      nuevoAnio -= 1;
    } else if (nuevoMes > 11) {
      nuevoMes = 0;
      nuevoAnio += 1;
    }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  const diasConVenta = useMemo(() => {
    const set = new Set();
    ventas.forEach((v) => {
      const dia = Number(v.fecha.split('-')[2]);
      set.add(dia);
    });
    return set;
  }, [ventas]);

  const ventasDelDiaSeleccionado = useMemo(() => {
    if (diaSeleccionado === null) return [];
    const fechaISO = `${mesActualISO}-${String(diaSeleccionado).padStart(2, '0')}`;
    return ventas.filter((v) => v.fecha === fechaISO);
  }, [ventas, diaSeleccionado, mesActualISO]);

  const registrarVenta = async ({ fecha, items }) => {
    await api.registrarVenta({ fecha, items });
    await cargarMes();
  };

  const eliminarVenta = async (id) => {
    if (!confirm('¿Deshacer este registro de venta? El stock se restaurará.')) return;
    await api.eliminarVenta(id);
    await cargarMes();
  };

  const eliminarItemVenta = async (itemId) => {
    await api.eliminarItemVenta(itemId);
    await cargarMes();
  };

  const guardarMeta = async (monto_meta) => {
    await api.guardarMeta(mesActualISO, monto_meta);
    setModalMeta(false);
    await cargarMes();
  };

  const abrirVentaDeHoy = () => {
    const hoyStr = hoyISO();
    const [aHoy, mHoy, dHoy] = hoyStr.split('-').map(Number);
    // Si el mes visible no es el actual, saltar al mes actual primero.
    if (aHoy !== anio || mHoy - 1 !== mes) {
      setAnio(aHoy);
      setMes(mHoy - 1);
    }
    setDiaSeleccionado(dHoy);
  };

  const nombreMesCapitalizado = new Date(anio, mes, 1)
    .toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

  const porcentaje = resumen && resumen.monto_meta > 0
    ? Math.min(100, (resumen.total_vendido / resumen.monto_meta) * 100)
    : 0;
  const superada = resumen?.meta_superada;

  return (
    <div>
      <div className="encabezado">
        <div className="marca">
          Moshi<span>Lashes</span>
        </div>
      </div>

      {error && <div className="aviso-conexion">{error}</div>}

      {cargando ? (
        <div className="cargando">Cargando ventas…</div>
      ) : (
        <>
          <div className="tarjeta-resumen">
            <div className="etiqueta">Vendido en {nombreMesCapitalizado}</div>
            <div className="total numero">S/ {Number(resumen?.total_vendido || 0).toFixed(2)}</div>

            {resumen?.monto_meta ? (
              <>
                <div className="cinta-progreso">
                  <div className="cinta-riel">
                    <div className={`cinta-relleno ${superada ? 'superada' : ''}`} style={{ width: `${porcentaje}%` }} />
                  </div>
                </div>
                <div className="mensaje-meta">
                  {superada ? (
                    <>¡Meta superada por <strong>S/ {Math.abs(Number(resumen.diferencia)).toFixed(2)}</strong>! 🎉</>
                  ) : (
                    <>Faltan <strong>S/ {Math.abs(Number(resumen.diferencia)).toFixed(2)}</strong> para la meta de S/ {Number(resumen.monto_meta).toFixed(2)}</>
                  )}
                </div>
                <button className="btn-editar-meta" onClick={() => setModalMeta(true)}>
                  Editar meta
                </button>
              </>
            ) : (
              <button className="btn-editar-meta" onClick={() => setModalMeta(true)}>
                Fijar una meta para este mes
              </button>
            )}
          </div>

          <div className="tarjetas-metricas">
            <div className="tarjeta-metrica">
              <div className="etiqueta-metrica">Vendido hoy</div>
              <div className="valor-metrica numero">S/ {Number(resumen?.vendido_hoy || 0).toFixed(2)}</div>
            </div>
            <div className="tarjeta-metrica">
              <div className="etiqueta-metrica">Productos vendidos</div>
              <div className="valor-metrica numero">{resumen?.total_productos || 0}</div>
            </div>
          </div>

          <div className="selector-mes">
            <button onClick={() => cambiarMes(-1)} aria-label="Mes anterior">‹</button>
            <span className="nombre-mes">{nombreMesCapitalizado}</span>
            <button onClick={() => cambiarMes(1)} aria-label="Mes siguiente">›</button>
          </div>

          <CalendarGrid
            anio={anio}
            mes={mes}
            diasConVenta={diasConVenta}
            onSeleccionarDia={setDiaSeleccionado}
          />

          <button className="btn btn-primario btn-ancho" onClick={abrirVentaDeHoy}>
            Registrar venta de hoy
          </button>
        </>
      )}

      {diaSeleccionado !== null && (
        <DayModal
          fechaISO={`${mesActualISO}-${String(diaSeleccionado).padStart(2, '0')}`}
          ventasDelDia={ventasDelDiaSeleccionado}
          productos={productos}
          onRegistrar={registrarVenta}
          onEliminarItem={eliminarItemVenta}
          onCerrar={() => setDiaSeleccionado(null)}
        />
      )}

      {modalMeta && (
        <GoalModal
          mes={mesActualISO}
          montoActual={resumen?.monto_meta}
          onGuardar={guardarMeta}
          onCerrar={() => setModalMeta(false)}
        />
      )}
    </div>
  );
}
