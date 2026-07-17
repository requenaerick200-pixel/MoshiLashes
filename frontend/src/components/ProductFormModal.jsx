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

export default function ProductFormModal({ productoInicial, onGuardar, onEliminar, onCerrar }) {
  const esEdicion = Boolean(productoInicial);

  const [nombre, setNombre] = useState(productoInicial?.nombre || '');
  const [precio, setPrecio] = useState(productoInicial?.precio || '');
  const [stockInicial, setStockInicial] = useState(productoInicial?.stock_actual ?? '');
  const [stockMinimo, setStockMinimo] = useState(productoInicial?.stock_minimo ?? '');
  const [imagenUrl, setImagenUrl] = useState(productoInicial?.imagen_url || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

const manejarFoto = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Las fotos de galería del celular pueden pesar varios MB. Las
    // redimensionamos y comprimimos en el navegador antes de convertirlas
    // a base64, para que quepan cómodamente en la petición al backend.
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_LADO = 800;
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
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        setImagenUrl(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  };

  const validar = () => {
    if (!nombre.trim()) return 'El nombre es obligatorio';
    if (precio === '' || Number(precio) < 0) return 'Ingresa un precio válido';
    if (!esEdicion && (stockInicial === '' || Number(stockInicial) < 0))
      return 'Ingresa un stock inicial válido';
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
        stock_actual: esEdicion ? undefined : Number(stockInicial),
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
        {imagenUrl ? (
          <img className="preview" src={imagenUrl} alt="Vista previa" />
        ) : (
          <div className="preview miniatura-vacia" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            📷
          </div>
        )}
        <label className="btn btn-secundario">
          {imagenUrl ? 'Cambiar foto' : 'Agregar foto'}
          <input type="file" accept="image/*" onChange={manejarFoto} style={{ display: 'none' }} />
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

      {!esEdicion && (
        <div className="campo">
          <label>Stock inicial</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={stockInicial}
            onChange={(e) => setStockInicial(e.target.value)}
            placeholder="0"
          />
        </div>
      )}

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
