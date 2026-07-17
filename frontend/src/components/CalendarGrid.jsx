// src/components/CalendarGrid.jsx
// Pinta el mes como grid de 7 columnas. Recibe un Set de días (número)
// que tienen ventas registradas, para resaltarlos.

const NOMBRES_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function obtenerCeldas(anio, mes) {
  // mes: 0-indexado (0 = enero)
  const primerDia = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  const celdas = [];
  for (let i = 0; i < primerDia; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);
  return celdas;
}

export default function CalendarGrid({ anio, mes, diasConVenta, onSeleccionarDia }) {
  const celdas = obtenerCeldas(anio, mes);
  const hoy = new Date();
  const esMesActual = hoy.getFullYear() === anio && hoy.getMonth() === mes;

  return (
    <>
      <div className="grid-dias-nombre">
        {NOMBRES_DIA.map((n, i) => (
          <span key={i}>{n}</span>
        ))}
      </div>
      <div className="grid-calendario">
        {celdas.map((dia, i) => {
          if (dia === null) return <div key={i} className="celda-dia fuera-de-mes" />;

          const tieneVenta = diasConVenta.has(dia);
          const esHoy = esMesActual && hoy.getDate() === dia;

          return (
            <button
              key={i}
              className={`celda-dia ${tieneVenta ? 'con-venta' : ''} ${esHoy ? 'hoy' : ''}`}
              onClick={() => onSeleccionarDia(dia)}
            >
              {dia}
              {tieneVenta && <span className="punto" />}
            </button>
          );
        })}
      </div>
    </>
  );
}
