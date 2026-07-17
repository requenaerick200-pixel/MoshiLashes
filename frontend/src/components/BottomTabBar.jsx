// src/components/BottomTabBar.jsx

const TABS = [
  { id: 'catalogo', etiqueta: 'Catálogo', icono: '🧴' },
  { id: 'ventas', etiqueta: 'Ventas', icono: '📅' },
];

export default function BottomTabBar({ tabActiva, onCambiarTab }) {
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={tabActiva === tab.id ? 'activo' : ''}
          onClick={() => onCambiarTab(tab.id)}
        >
          <span style={{ fontSize: '1.2rem' }}>{tab.icono}</span>
          <span>{tab.etiqueta}</span>
        </button>
      ))}
    </nav>
  );
}
