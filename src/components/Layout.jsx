import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PackageSearch, Warehouse, Hammer, ReceiptText, Settings, LogOut, Sun, Moon, Menu, X, ShoppingCart, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Layout.css';

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme, cart = [], logoutUser, notification, hasPermission, user } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.cantidad, 0);

  const navItems = [
    { path: '/catalog', label: 'Catálogo', icon: <PackageSearch size={20} />, show: true },
    { path: '/stock', label: 'Stock', icon: <Warehouse size={20} />, show: true },
    { path: '/production', label: 'Trabajos', icon: <Hammer size={20} />, show: hasPermission('fabricacion_ver_estados') },
    { path: '/invoices', label: 'Facturas / POS', icon: <ReceiptText size={20} />, badge: totalItemsCount, show: hasPermission('facturas_ver') },
    { path: '/finance', label: 'Finanzas', icon: <TrendingUp size={20} />, show: hasPermission('finanzas_ver') || hasPermission('nominas_gestionar') || hasPermission('gastos_gestionar') },
  ].filter(item => item.show);

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="layout-container">
      {/* Header Móvil con Botón Hamburguesa de 3 Rayitas */}
      <div className="mobile-header glass-panel">
        <div className="mobile-brand">
          <div className="logo-glow"></div>
          <h2>Venus</h2>
        </div>

        <button 
          className="hamburger-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Abrir menú de navegación"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay oscuro cuando el menú móvil está abierto */}
      {isMobileMenuOpen && (
        <div 
          className="sidebar-overlay animate-fade-in" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar de Navegación (Fijo en Escritorio / Desplegable Drawer en Móvil) */}
      <nav className={`glass-panel sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-glow"></div>
          <h2>Venus</h2>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <ul className="nav-links">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user-info notranslate" translate="no">
              <span className="user-name">👤 {user.username}</span>
              <span className="user-role badge-role">{user.rol === 'admin' ? '👑 Admin' : 'Empleado'}</span>
            </div>
          )}

          <button className="nav-item theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
          </button>

          <Link 
            to="/config" 
            className={`nav-item ${location.pathname === '/config' ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            <Settings size={20} />
            <span>Configuración</span>
          </Link>

          <button className="nav-item btn-logout" onClick={() => { handleNavClick(); logoutUser(); }}>
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="main-content animate-fade-in">
        {notification && (
          <div className={`global-toast toast-${notification.type} animate-fade-in`}>
            {notification.message}
          </div>
        )}
        {children}
      </main>

      {/* Botón Flotante Azul del Carrito (Navega automáticamente a Facturar / POS) */}
      <button 
        className="floating-cart-btn" 
        onClick={() => navigate('/invoices')}
        title="Ir a Facturar"
      >
        <ShoppingCart size={22} />
        {totalItemsCount > 0 && (
          <span className="floating-cart-badge">{totalItemsCount}</span>
        )}
      </button>
    </div>
  );
}

export default Layout;
