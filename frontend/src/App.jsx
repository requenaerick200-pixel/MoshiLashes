// src/App.jsx
// Componente raíz. Solo decide qué tab mostrar y monta la barra inferior.

import { useState } from 'react';
import BottomTabBar from './components/BottomTabBar';
import CatalogoTab from './components/CatalogoTab';
import VentasTab from './components/VentasTab';

export default function App() {
  const [tabActiva, setTabActiva] = useState('catalogo'); // 'catalogo' | 'ventas'

  return (
    <div className="app">
      <main className="contenido">
        {tabActiva === 'catalogo' ? <CatalogoTab /> : <VentasTab />}
      </main>
      <BottomTabBar tabActiva={tabActiva} onCambiarTab={setTabActiva} />
    </div>
  );
}
