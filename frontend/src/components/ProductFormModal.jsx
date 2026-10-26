// src/components/ProductFormModal.jsx
// Formulario para dar de alta un producto nuevo, o editar uno existente.
// Pensado para cargar rápido: Enter pasa al siguiente campo, “Guardar y
// agregar otro” deja el formulario abierto (conserva precio y categoría
// para variantes), y desde un producto existente se puede “Duplicar”.
//
// Nota sobre la foto: por ahora el preview se muestra leyendo el archivo
// como base64 en el navegador (para que el usuario vea la imagen de
// inmediato). Cuando se conecte Cloudinary, este mismo campo
// "imagen_url" pasará a guardar la URL real que devuelva Cloudinary en
// vez del base64 — el resto del formulario no cambia.

import { useEffect, useRef, useState } from 'react';
import { existeNombre } from '../inventario';
import Modal from './Modal';

const MAX_LADO = 800;

// Intenta cargar un archivo/blob como <img> del navegador.
function cargarComoImagen(blob) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer esa foto. Intenta con otra.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('FORMATO_NO_SOPORTADO'));
      img.onload = () => resolve(img);
      img.src = lector.result;
    };
    lector.readAsDataURL(blob);
  });
}

// Redimensiona y comprime la imagen ya cargada, y devuelve un data URL JPEG.
function comprimir(img) {
  let { width, height } = img;
  if (width > height && width > MAX_LADO) {
    height = Math.round((height * MAX_LADO) / width);
    width = MAX_LADO;
  } else if (height > MAX_LADO) {
    width = Math.round((width * MAX_LADO) / height);
    height = MAX_LADO;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

// Procesa cualquier foto que el usuario suba: intenta abrirla directo, y si
// el navegador no puede (típico de fotos HEIC/HEIF en Chrome/Android),
// la convierte primero a JPEG con heic2any antes de comprimirla. Solo los
// formatos RAW/ProRAW (sensor sin procesar) quedan realmente fuera de
// alcance — ningún navegador puede decodificarlos.
async function procesarFoto(archivo) {
  try {
    const img = await cargarComoImagen(archivo);
    return comprimir(img);
  } catch (err) {
    if (err.message !== 'FORMATO_NO_SOPORTADO') throw err;

    try {
      const { default: heic2any } = await import('heic2any');
      const convertido = await heic2any({ blob: archivo, toType: 'image/jpeg', quality: 0.85 });
      const img = await cargarComoImagen(convertido);
      return comprimir(img);
    } catch {
      throw new Error(
        'Ese formato de foto no se puede usar (probablemente RAW/ProRAW de iPhone). Ve a Ajustes → Cámara → Formatos en tu iPhone y desactiva "Apple ProRAW", o elige una foto tomada en formato normal.'
      );
    }
  }
}

export default function ProductFormModal({
  productoInicial,
  plantilla,
  productos = [],
  categorias = [],
  onGuardar,
  onEliminar,
  onDuplicar,
  onVerHistorial,
  onCerrar,
}) {
  const esEdicion = Boolean(productoInicial);
  const base = productoInicial || plantilla || {};

  const [nombre, setNombre] = useState(base.nombre || '');
  const [precio, setPrecio] = useState(base.precio ?? '');
  const [stock, setStock] = useState(esEdicion ? String(base.stock_actual) : '');
  const [stockMinimo, setStockMinimo] = useState(base.stock_minimo ?? '');
  const [categoria, setCategoria] = useState(base.categoria || '');
  const [imagenUrl, setImagenUrl] = useState(base.imagen_url || '');
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [agregadosSesion, setAgregadosSesion] = useState(0);

  const refNombre = useRef(null);
  const refs = { precio: useRef(null), stock: useRef(null), minimo: useRef(null) };

  useEffect(() => {
    if (!esEdicion) {
      const el = refNombre.current;
      el?.focus();
      // Al duplicar, deja el cursor al final del nombre para escribir la variante
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [esEdicion]);

  const nombreRepetido = existeNombre(productos, nombre, productoInicial?.id ?? null);
  const stockNum = stock === '' ? 0 : Number(stock);
  const stockCambiado = esEdicion && stock !== '' && stockNum !== productoInicial.stock_actual;

  const manejarFoto = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError('');
    setProcesandoFoto(true);
    try {
      setImagenUrl(await procesarFoto(archivo));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesandoFoto(false);
      e.target.value = '';
    }
  };

  const validar = () => {
    if (!nombre.trim()) return 'El nombre es obligatorio';
    if (nombreRepetido) return 'Ya existe un producto con ese nombre';
    if (precio === '' || isNaN(Number(precio)) || Number(precio) < 0) return 'Ingresa un precio válido';
    if (!Number.isInteger(stockNum) || stockNum < 0) return 'El stock debe ser un número entero';
    if (stockMinimo !== '' && (!Number.isInteger(Number(stockMinimo)) || Number(stockMinimo) < 0))
      return 'La alerta de stock mínimo debe ser un número entero';
    return '';
  };

  const guardar = async (seguir = false) => {
    const err = validar();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await onGuardar(
        {
          nombre: nombre.trim(),
          precio: Number(precio),
          stock_actual: stockNum,
          stock_minimo: stockMinimo === '' ? null : Number(stockMinimo),
          categoria: categoria.trim() || null,
          imagen_url: imagenUrl || null,
        },
        { seguir }
      );
      if (seguir) {
        // Limpia lo que cambia entre variantes; conserva precio, categoría y alerta
        setNombre('');
        setStock('');
        setImagenUrl('');
        setAgregadosSesion((n) => n + 1);
        refNombre.current?.focus();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  // Enter = pasar al siguiente campo (como en una planilla)
  const alEnter = (siguiente) => (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (siguiente) siguiente.current?.focus();
    else guardar(!esEdicion);
  };

  const sumarStock = (n) => setStock(String(Math.max(0, stockNum + n)));

  return (
    <Modal
      titulo={esEdicion ? 'Editar producto' : 'Nuevo producto'}
      onCerrar={onCerrar}
      pie={
        esEdicion ? (
          <>
            <button className="btn btn-primario btn-ancho" onClick={() => guardar(false)} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <div className="fila-botones">
              <button className="btn btn-secundario" onClick={() => onDuplicar(productoInicial)}>Duplicar</button>
              <button className="btn btn-secundario" onClick={() => onVerHistorial(productoInicial)}>Historial</button>
              <button className="btn btn-peligro" onClick={() => onEliminar(productoInicial)}>Eliminar</button>
            </div>
          </>
        ) : (
          <>
            <button className="btn btn-primario btn-ancho" onClick={() => guardar(true)} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar y agregar otro'}
            </button>
            <button className="btn btn-fantasma btn-ancho" style={{ marginTop: 4 }} onClick={() => guardar(false)} disabled={guardando}>
              Guardar y cerrar
            </button>
          </>
        )
      }
    >
      {agregadosSesion > 0 && (
        <div className="aviso-ok">✓ {agregadosSesion} agregado{agregadosSesion === 1 ? '' : 's'} — sigue con el próximo</div>
      )}
      {error && <div className="aviso-error">{error}</div>}

      <div className="fila-foto">
        <label className="caja-foto-chica">
          {imagenUrl ? <img src={imagenUrl} alt="Vista previa" /> : <span>{procesandoFoto ? '…' : '📷'}</span>}
          <input type="file" accept="image/*" onChange={manejarFoto} disabled={procesandoFoto} style={{ display: 'none' }} />
        </label>
        <div className="campo" style={{ flex: 1, marginBottom: 0 }}>
          <label>Nombre del producto</label>
          <input
            ref={refNombre}
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={alEnter(refs.precio)}
            placeholder="Ej. Pestañas anime (Lila)"
            enterKeyHint="next"
            autoCapitalize="sentences"
          />
        </div>
      </div>
      <div className="foto-acciones">
        {procesandoFoto ? 'Procesando foto…' : imagenUrl ? (
          <button className="btn-texto" onClick={() => setImagenUrl('')}>Quitar foto</button>
        ) : 'Foto opcional — toca la cámara'}
      </div>
      {nombreRepetido && <div className="campo-error" style={{ marginTop: -8, marginBottom: 12 }}>Ya existe un producto con ese nombre</div>}

      <div className="dos-columnas">
        <div className="campo">
          <label>Precio (S/)</label>
          <input
            ref={refs.precio}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.10"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            onKeyDown={alEnter(refs.stock)}
            placeholder="0.00"
            enterKeyHint="next"
          />
        </div>
        <div className="campo">
          <label>{esEdicion ? 'Stock actual' : 'Cantidad'}</label>
          <div className="stepper">
            <button type="button" onClick={() => sumarStock(-1)} aria-label="Restar uno">−</button>
            <input
              ref={refs.stock}
              type="number"
              inputMode="numeric"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              onKeyDown={alEnter(refs.minimo)}
              placeholder="0"
              enterKeyHint="next"
            />
            <button type="button" onClick={() => sumarStock(1)} aria-label="Sumar uno">+</button>
          </div>
        </div>
      </div>
      {stockCambiado && (
        <p className="texto-suave" style={{ marginTop: -12, marginBottom: 16 }}>
          Se guardará como ajuste ({stockNum - productoInicial.stock_actual > 0 ? '+' : ''}
          {stockNum - productoInicial.stock_actual}) en el historial. Para mercadería nueva usa el botón ±.
        </p>
      )}

      <div className="campo">
        <label>Categoría (opcional)</label>
        {categorias.length > 0 && (
          <div className="chips chips-form">
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${categoria === c ? 'activo' : ''}`}
                onClick={() => setCategoria(categoria === c ? '' : c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <input
          type="text"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          placeholder={categorias.length ? 'O escribe una nueva' : 'Ej. Pestañas anime, Pegamentos'}
        />
      </div>

      <div className="campo">
        <label>Avisarme cuando queden (opcional)</label>
        <input
          ref={refs.minimo}
          type="number"
          inputMode="numeric"
          min="0"
          value={stockMinimo}
          onChange={(e) => setStockMinimo(e.target.value)}
          onKeyDown={alEnter(null)}
          placeholder="Ej. 3"
          enterKeyHint="done"
        />
      </div>
    </Modal>
  );
}
