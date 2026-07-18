// src/components/ProductFormModal.jsx
// Formulario para dar de alta un producto nuevo, o editar uno existente.
//
// Nota sobre la foto: por ahora el preview se muestra leyendo el archivo
// como base64 en el navegador (para que el usuario vea la imagen de
// inmediato). Cuando se conecte Cloudinary, este mismo campo
// "imagen_url" pasará a guardar la URL real que devuelva Cloudinary en
// vez del base64 — el resto del formulario no cambia.

import { useState } from 'react';
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

export default function ProductFormModal({ productoInicial, onGuardar, onEliminar, onCerrar }) {
  const esEdicion = Boolean(productoInicial);

  const [nombre, setNombre] = useState(productoInicial?.nombre || '');
  const [precio, setPrecio] = useState(productoInicial?.precio || '');
  const [stockInicial, setStockInicial] = useState(productoInicial?.stock_actual ?? '');
  const [stockMinimo, setStockMinimo] = useState(productoInicial?.stock_minimo ?? '');
  const [imagenUrl, setImagenUrl] = useState(productoInicial?.imagen_url || '');
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const manejarFoto = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError('');
    setProcesandoFoto(true);
    try {
      const dataUrl = await procesarFoto(archivo);
      setImagenUrl(dataUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesandoFoto(false);
    }
  };

  const validar = () => {
    if (!nombre.trim()) return 'El nombre es obligatorio';
    if (precio === '' || Number(precio) < 0) return 'Ingresa un precio válido';
    if (stockInicial === '' || Number(stockInicial) < 0)
      return 'Ingresa un stock válido';
    return '';
  };

  const guardar = async () => {
    const err = validar();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        precio: Number(precio),
        stock_actual: Number(stockInicial),
        stock_minimo: stockMinimo === '' ? null : Number(stockMinimo),
        imagen_url: imagenUrl || null,
      });
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={esEdicion ? 'Editar producto' : 'Nuevo producto'}
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn btn-primario btn-ancho" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Agregar al catálogo'}
          </button>
          {esEdicion && (
            <button
              className="btn btn-peligro btn-ancho"
              style={{ marginTop: 8 }}
              onClick={() => onEliminar(productoInicial)}
            >
              Eliminar producto
            </button>
          )}
        </>
      }
    >
      {error && <div className="aviso-error">{error}</div>}

      <div className="subida-foto">
        <div className="caja-preview">
          {imagenUrl ? (
            <img className="preview" src={imagenUrl} alt="Vista previa" />
          ) : (
            <span className="icono-camara-vacio">📷</span>
          )}
        </div>
        <label className={`btn btn-secundario ${procesandoFoto ? 'btn-primario' : ''}`} style={{ opacity: procesandoFoto ? 0.7 : 1 }}>
          {procesandoFoto ? 'Procesando foto…' : imagenUrl ? 'Cambiar foto' : 'Agregar foto'}
          <input
            type="file"
            accept="image/*"
            onChange={manejarFoto}
            disabled={procesandoFoto}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <div className="campo">
        <label>Nombre del producto</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Pestañas Volumen Ruso 15D"
        />
      </div>

      <div className="campo">
        <label>Precio (S/)</label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.10"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="campo">
        <label>{esEdicion ? 'Stock actual (corrige si te equivocaste)' : 'Stock inicial'}</label>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={stockInicial}
          onChange={(e) => setStockInicial(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="campo">
        <label>Alerta de stock mínimo (opcional)</label>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={stockMinimo}
          onChange={(e) => setStockMinimo(e.target.value)}
          placeholder="Ej. 3"
        />
      </div>
    </Modal>
  );
}