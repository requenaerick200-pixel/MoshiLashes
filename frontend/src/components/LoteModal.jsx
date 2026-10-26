// src/components/LoteModal.jsx
// "Agregar varios": carga muchos productos de una sola vez, tipo planilla.
// También acepta pegar una lista (de notas, WhatsApp o Excel), una línea
// por producto: "Nombre, precio, cantidad".

import { useRef, useState } from 'react';
import Modal from './Modal';
import { existeNombre, normalizar, parsearLista } from '../inventario';

const filaVacia = () => ({ nombre: '', precio: '', stock: '' });

export default function LoteModal({ productos, categorias, onConfirmar, onCerrar }) {
  const [filas, setFilas] = useState([filaVacia(), filaVacia(), filaVacia()]);
  const [categoria, setCategoria] = useState('');
  const [modoPegar, setModoPegar] = useState(false);
  const [textoPegado, setTextoPegado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const contenedor = useRef(null);

  const actualizar = (i, campo, valor) => {
    setFilas((prev) => {
      const nuevas = prev.map((f, j) => (j === i ? { ...f, [campo]: valor } : f));
      // Siempre deja una fila vacía al final para seguir escribiendo
      if (i === nuevas.length - 1 && valor) nuevas.push(filaVacia());
      return nuevas;
    });
  };

  const quitar = (i) => setFilas((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : [filaVacia()]));

  // Enter en la última columna salta al nombre de la fila siguiente
  const alEnter = (i, col) => (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const sel = col < 2 ? `[data-f="${i}"][data-c="${col + 1}"]` : `[data-f="${i + 1}"][data-c="0"]`;
    setTimeout(() => contenedor.current?.querySelector(sel)?.focus(), 0);
  };

  // Pegar varias líneas en un nombre las reparte en filas
  const alPegar = (i) => (e) => {
    const texto = e.clipboardData.getData('text');
    if (!texto.includes('\n')) return;
    e.preventDefault();
    importar(texto, i);
  };

  const importar = (texto, desde = null) => {
    const nuevas = parsearLista(texto);
    if (nuevas.length === 0) return;
    setFilas((prev) => {
      const base = (desde === null ? prev : prev.slice(0, desde)).filter((f) => f.nombre.trim());
      return [...base, ...nuevas, filaVacia()];
    });
    setModoPegar(false);
    setTextoPegado('');
  };

  const completas = filas.filter((f) => f.nombre.trim());

  const problemaDe = (f, i) => {
    if (!f.nombre.trim()) return '';
    if (f.precio === '' || isNaN(Number(f.precio)) || Number(f.precio) < 0) return 'Falta precio';
    if (f.stock !== '' && (!Number.isInteger(Number(f.stock)) || Number(f.stock) < 0)) return 'Cantidad inválida';
    if (existeNombre(productos, f.nombre)) return 'Ya existe';
    const n = normalizar(f.nombre);
    if (filas.findIndex((g) => normalizar(g.nombre) === n) !== i) return 'Repetido';
    return '';
  };

  const conProblema = filas.filter((f, i) => problemaDe(f, i)).length;

  const confirmar = async () => {
    if (completas.length === 0) return setError('Escribe al menos un producto');
    if (conProblema) return setError('Revisa las filas marcadas en rojo');
    setError('');
    setGuardando(true);
    try {
      await onConfirmar(
        completas.map((f) => ({
          nombre: f.nombre.trim(),
          precio: Number(f.precio),
          stock_actual: f.stock === '' ? 0 : Number(f.stock),
          categoria: categoria.trim() || null,
        }))
      );
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo="Agregar varios"
      onCerrar={onCerrar}
      pie={
        <button className="btn btn-primario btn-ancho" onClick={confirmar} disabled={guardando || completas.length === 0}>
          {guardando ? 'Guardando…' : completas.length ? `Agregar ${completas.length} producto${completas.length === 1 ? '' : 's'}` : 'Escribe tus productos'}
        </button>
      }
    >
      {error && <div className="aviso-error">{error}</div>}

      <div className="campo">
        <label>Categoría para todos (opcional)</label>
        {categorias.length > 0 && (
          <div className="chips chips-form">
            {categorias.map((c) => (
              <button key={c} className={`chip ${categoria === c ? 'activo' : ''}`} onClick={() => setCategoria(categoria === c ? '' : c)}>{c}</button>
            ))}
          </div>
        )}
        <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ej. Pestañas anime" />
      </div>

      {modoPegar ? (
        <div className="campo">
          <label>Pega tu lista — una línea por producto: nombre, precio, cantidad</label>
          <textarea
            rows={6}
            value={textoPegado}
            onChange={(e) => setTextoPegado(e.target.value)}
            placeholder={'Pestañas anime Lila, 19, 6\nPestañas anime Verde, 19, 4\nPegamento negro, 8.50, 10'}
            autoFocus
          />
          <div className="fila-botones">
            <button className="btn btn-secundario" onClick={() => setModoPegar(false)}>Cancelar</button>
            <button className="btn btn-primario" onClick={() => importar(textoPegado)} disabled={!textoPegado.trim()}>Convertir en filas</button>
          </div>
        </div>
      ) : (
        <>
          <div className="tabla-lote" ref={contenedor}>
            <div className="fila-lote cabecera">
              <span>Nombre</span><span>Precio</span><span>Cant.</span><span />
            </div>
            {filas.map((f, i) => {
              const problema = problemaDe(f, i);
              return (
                <div key={i}>
                  <div className={`fila-lote ${problema ? 'con-error' : ''}`}>
                    <input data-f={i} data-c={0} type="text" value={f.nombre} placeholder={i === 0 ? 'Pestañas anime Lila' : ''}
                      onChange={(e) => actualizar(i, 'nombre', e.target.value)} onKeyDown={alEnter(i, 0)} onPaste={alPegar(i)} enterKeyHint="next" />
                    <input data-f={i} data-c={1} type="number" inputMode="decimal" value={f.precio} placeholder="0.00"
                      onChange={(e) => actualizar(i, 'precio', e.target.value)} onKeyDown={alEnter(i, 1)} enterKeyHint="next" />
                    <input data-f={i} data-c={2} type="number" inputMode="numeric" value={f.stock} placeholder="0"
                      onChange={(e) => actualizar(i, 'stock', e.target.value)} onKeyDown={alEnter(i, 2)} enterKeyHint="next" />
                    <button className="quitar" onClick={() => quitar(i)} aria-label="Quitar fila" tabIndex={-1}>×</button>
                  </div>
                  {problema && <div className="campo-error" style={{ margin: '-2px 0 6px 4px' }}>{problema}</div>}
                </div>
              );
            })}
          </div>
          <button className="btn-texto" style={{ marginTop: 10 }} onClick={() => setModoPegar(true)}>
            📋 Pegar una lista desde notas o Excel
          </button>
          <p className="texto-suave" style={{ marginTop: 10 }}>Las fotos las puedes agregar después tocando cada producto.</p>
        </>
      )}
    </Modal>
  );
}
