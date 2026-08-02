import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Catalog from './pages/Catalog';
import Stock from './pages/Stock';
import Production from './pages/Production';
import Invoices from './pages/Invoices';
import Finance from './pages/Finance';
import Config from './pages/Config';
import Login from './pages/Login';
import { useApp } from './context/AppContext';

const PermissionRoute = ({ element, permission, adminOnly }) => {
  const { hasPermission, isAdmin } = useApp();
  if (adminOnly && !isAdmin) return <Navigate to="/catalog" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/catalog" replace />;
  return element;
};

function AppRoutes() {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/production" element={
          <PermissionRoute permission="fabricacion_ver_estados" element={<Production />} />
        } />
        <Route path="/invoices" element={
          <PermissionRoute permission="facturas_ver" element={<Invoices />} />
        } />
        <Route path="/finance" element={<Finance />} />
        <Route path="/config" element={
          <PermissionRoute adminOnly element={<Config />} />
        } />
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
