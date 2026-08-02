import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken as saveTokenStorage, getApiBaseUrl, setApiBaseUrl, setErrorListener, setUnauthorizedListener, setForbiddenListener } from '../services/api';
import ErrorModal from '../components/ErrorModal';

const AppContext = createContext();

const DEFAULT_CONFIG = {
  company_info: {
    nombre_empresa: "Muebles Venus SRL",
    rnc: "131-99882-1",
    telefono: "809-555-8888",
    direccion: "Santo Domingo, República Dominicana"
  },
  areas: ['Tapicería', 'Ebanistería', 'Pintura', 'Costura'],
  tipos: ['Sofá', 'Cama', 'Comedor', 'Mesa', 'Sillón'],
  materiales: ['Terciopelo', 'Lino', 'Cuerina', 'Madera Roble', 'Pino Tratado'],
  colores: ['Gris Plomo', 'Beige', 'Azul Marino', 'Negro', 'Nogal Oscuro']
};

/** Permisos por defecto (usuario sin datos de permisos) */
const DEFAULT_PERMISSIONS = {
  facturas_ver: false,
  facturas_emitir: false,
  facturas_modificar: false,
  fabricacion_ver_estados: false,
  fabricacion_modificar_estados: false,
  fabricacion_mandar_envio: false,
  stock_crear: false,
  stock_modificar: false,
  stock_eliminar: false,
  catalogo_crear: false,
  catalogo_modificar: false,
  catalogo_eliminar: false,
  clientes_crear: false,
  clientes_modificar: false,
  clientes_eliminar: false,
  puede_ver_datos_de_otros: false,
  prefijos_visibles: []
};

export const AppProvider = ({ children }) => {
  // Tema (Light / Dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('venus_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('venus_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Autenticación
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(null);        // { username, rol, prefix, permissions }
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  // Configuración de red
  const [apiUrl, setApiUrlState] = useState(getApiBaseUrl());

  // Estado de Datos principales (Cache en Memoria)
  const [catalogo, setCatalogo] = useState([]);
  const [stock, setStock] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [items, setItems] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  // Modal Global de Errores del Backend
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    status: null
  });

  // Helpers de permisos
  /**
   * Verifica si el usuario actual tiene un permiso específico.
   * El admin siempre tiene todos los permisos.
   * @param {string} action - Clave del permiso (ej. 'facturas_emitir')
   * @returns {boolean}
   */
  const hasPermission = useCallback((action) => {
    if (user?.rol === 'admin') return true;
    return !!permissions[action];
  }, [user, permissions]);

  /** Verdadero si el usuario autenticado es administrador */
  const isAdmin = user?.rol === 'admin';

  // Limpieza total de sesión y caché en memoria
  const handleUnauthorized = () => {
    saveTokenStorage(null);
    setTokenState(null);
    setUser(null);
    setPermissions(DEFAULT_PERMISSIONS);
    setCart([]);
    setCatalogo([]);
    setStock([]);
    setFacturas([]);
    setItems([]);
    setEnvios([]);
    setClientes([]);
    setConfig(DEFAULT_CONFIG);
    showNotification('Tu sesión ha expirado o el token es inválido. Por favor inicia sesión nuevamente.', 'error');
  };

  useEffect(() => {
    // Configurar listener para capturar automáticamente errores HTTP 401 (token expirado)
    setUnauthorizedListener(handleUnauthorized);

    // Configurar listener para capturar automáticamente otros errores de API
    setErrorListener(({ title, message, status }) => {
      setErrorModal({
        isOpen: true,
        title,
        message,
        status
      });
    });

    // Listener para 403: notificación amigable tipo toast, NO modal técnico
    setForbiddenListener((msg) => {
      showNotification(`🔒 Sin permiso: ${msg}`, 'error');
    });
  }, []);

  const closeErrorModal = () => {
    setErrorModal(prev => ({ ...prev, isOpen: false }));
  };

  const showErrorModalCustom = (title, message, status = null) => {
    setErrorModal({
      isOpen: true,
      title,
      message,
      status
    });
  };

  // Carrito POS / Nueva Factura
  const [cart, setCart] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);

  // Estados de interfaz
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Carga masiva de datos iniciales (showSpinner = false para actualizaciones silenciosas sin resetear la vista)
  const refreshData = async (showSpinner = true) => {
    if (!token) return;
    if (showSpinner) setLoading(true);
    try {
      const data = await api.pullAllData();
      setCatalogo(Array.isArray(data.catalogo) ? data.catalogo : []);
      setStock(Array.isArray(data.stock) ? data.stock : []);
      setFacturas(Array.isArray(data.facturas) ? data.facturas : []);
      setItems(Array.isArray(data.items) ? data.items : []);
      setEnvios(Array.isArray(data.envios) ? data.envios : []);
      setClientes(Array.isArray(data.clientes) ? data.clientes : []);
      
      if (data.config && typeof data.config === 'object') {
        setConfig(prev => ({
          ...prev,
          ...data.config,
          company_info: { ...prev.company_info, ...(data.config.company_info || {}) },
          areas: (Array.isArray(data.config.areas) && data.config.areas.length > 0) ? data.config.areas : prev.areas,
          tipos: (Array.isArray(data.config.tipos) && data.config.tipos.length > 0) ? data.config.tipos : prev.tipos,
          materiales: (Array.isArray(data.config.materiales) && data.config.materiales.length > 0) ? data.config.materiales : prev.materiales,
          telas: (Array.isArray(data.config.telas) && data.config.telas.length > 0) ? data.config.telas : prev.telas,
          colores: (Array.isArray(data.config.colores) && data.config.colores.length > 0) ? data.config.colores : prev.colores,
        }));
      }
    } catch (error) {
      console.error("[AppContext] Error al cargar datos del servidor:", error);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token]);

  /**
   * Carga el perfil completo del usuario (incluyendo permisos) desde /auth/me.
   * Llamado justo después del login y al montar la app si hay token.
   */
  const loadUserProfile = async () => {
    try {
      const me = await api.getMe();
      if (me) {
        setUser({
          username: me.username,
          rol: me.rol,
          prefix: me.prefix,
          activo: me.activo,
        });
        if (me.permissions) {
          setPermissions({
            ...DEFAULT_PERMISSIONS,
            ...me.permissions,
          });
        } else if (me.rol === 'admin') {
          // Admin sin permisos explícitos → todos
          setPermissions(Object.fromEntries(
            Object.keys(DEFAULT_PERMISSIONS).map(k =>
              [k, k === 'prefijos_visibles' ? [] : true]
            )
          ));
        }
      }
    } catch (err) {
      console.warn('[AppContext] No se pudo cargar el perfil de usuario:', err.message);
    }
  };

  // Al montar: si ya hay token guardado, cargar el perfil
  useEffect(() => {
    if (token) {
      loadUserProfile();
    }
  }, []);

  // Login de Usuario Estricto
  const loginUser = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.login(username, password);
      if (res && res.access_token) {
        saveTokenStorage(res.access_token);
        setTokenState(res.access_token);
        // Cargar perfil completo (incluyendo permisos)
        await loadUserProfile();
        showNotification('¡Sesión iniciada correctamente!', 'success');
        return true;
      }
      throw new Error('Respuesta de autenticación vacía');
    } catch (err) {
      saveTokenStorage(null);
      setTokenState(null);
      setUser(null);
      setPermissions(DEFAULT_PERMISSIONS);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = () => {
    saveTokenStorage(null);
    setTokenState(null);
    setUser(null);
    setPermissions(DEFAULT_PERMISSIONS);
    setCart([]);
    setCatalogo([]);
    setStock([]);
    setFacturas([]);
    setItems([]);
    setEnvios([]);
    setClientes([]);
    setConfig(DEFAULT_CONFIG);
    showNotification('Sesión cerrada');
  };

  const updateApiUrl = (url) => {
    setApiBaseUrl(url);
    setApiUrlState(url);
    showNotification('Dirección del Servidor actualizada', 'info');
  };

  // Carrito Methods
  const addToCart = (productItem, isStock = false) => {
    setCart(prev => {
      return [...prev, {
        id: Date.now() + Math.random(),
        catalogo_id: productItem.catalogo_id || productItem.id,
        nombre: productItem.nombre,
        color: productItem.color || 'Por definir',
        material: productItem.material || 'Por definir',
        descripcion: productItem.descripcion || '',
        image_preview: productItem.image_preview || productItem.image_url || '',
        image_file: productItem.image_file || null,
        precio: productItem.precio_base || productItem.precio || 0,
        cantidad: productItem.cantidad || 1,
        isStock,
        area: productItem.area || 'Tapicería',
        tipo_mueble: productItem.tipo || productItem.tipo_mueble || 'Mueble'
      }];
    });
    showNotification(`Encargo "${productItem.nombre}" agregado al carrito`, 'success');
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateCartQuantity = (index, delta) => {
    setCart(prev => {
      if (index < 0 || index >= prev.length) return prev;
      const currentItem = prev[index];
      const currentQty = parseInt(currentItem.cantidad, 10) || 1;
      const newQty = currentQty + delta;

      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }

      return prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            cantidad: newQty
          };
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCliente(null);
  };

  // Acciones de Negocio
  const addCatalogItem = async (catalogData, file) => {
    try {
      const newItem = await api.createCatalogo(catalogData, file);
      if (newItem) {
        setCatalogo(prev => [newItem, ...prev]);
        showNotification('Modelo creado exitosamente en el servidor', 'success');
        return true;
      }
    } catch {
      // El ErrorModal capturó el detalle
    }
    return false;
  };

  const updateCatalogItem = async (id, catalogData, file) => {
    try {
      const updatedItem = await api.updateCatalogo(id, catalogData, file);
      if (updatedItem) {
        setCatalogo(prev => {
          const filtered = prev.filter(c => String(c.id) !== String(id) && String(c.id) !== String(updatedItem.old_id));
          return [updatedItem, ...filtered];
        });
        showNotification('Modelo actualizado exitosamente (nueva versión creada)', 'success');
        return true;
      }
    } catch {
      // El ErrorModal capturó el detalle
    }
    return false;
  };
  const deleteCatalogItem = async (id) => {
    try {
      await api.deleteCatalogo(id);
      setCatalogo(prev => prev.filter(c => String(c.id) !== String(id)));
      showNotification('Modelo eliminado exitosamente (soft delete)', 'success');
      return true;
    } catch {
      // El ErrorModal capturó el detalle
    }
    return false;
  };

  const addStockItem = async (stockData, file) => {
    try {
      const newStock = await api.createStock(stockData, file);
      if (newStock) {
        setStock(prev => [newStock, ...prev]);
        showNotification('Stock ingresado en el servidor', 'success');
        return true;
      }
    } catch {
      // El ErrorModal capturó el detalle
    }
    return false;
  };

  const adjustStockCount = async (stockId, delta) => {
    try {
      await api.updateStockCantidad(stockId, delta);
      setStock(prev => prev.map(s => s.id === stockId ? { ...s, cantidad: Math.max(0, s.cantidad + delta) } : s).filter(s => s.cantidad > 0));
    } catch {
      // El ErrorModal capturó el detalle
    }
  };

  const updateItemStatus = async (itemId, newStatus) => {
    try {
      const res = await api.updateItemStatus(itemId, newStatus);
      // Actualizar optimistamente el estado local
      const finalStatus = res?.status || newStatus;
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: finalStatus } : it));
      showNotification(`Estado de ítem actualizado a ${finalStatus}`, 'info');
      // Refrescar datos en segundo plano sin mostrar spinner ni devolver al inicio
      if (finalStatus === 'procesado' || finalStatus === 'completado') {
        refreshData(false);
      }
    } catch {
      // El ErrorModal capturó el detalle
    }
  };

  const updateEnvioStatus = async (envioId, newStatus) => {
    try {
      await api.updateEnvioStatus(envioId, newStatus);
      setEnvios(prev => prev.map(e => e.id === envioId ? { ...e, estado: newStatus } : e));
      showNotification(`Envío actualizado a "${newStatus}"`, 'success');
      // Refrescar datos silenciosamente
      refreshData(false);
    } catch {
      // El ErrorModal capturó el detalle
    }
  };

  const createCliente = async (clienteData) => {
    try {
      const created = await api.createCliente(clienteData);
      if (created) {
        setClientes(prev => {
          const exists = prev.some(c => String(c.id) === String(created.id));
          return exists ? prev : [created, ...prev];
        });
        showNotification(`Cliente "${created.nombre || ''}" registrado en el servidor`, 'success');
        return created;
      }
    } catch {
      // El ErrorModal capturó el detalle
    }
    return null;
  };

  const createInvoice = async (invoicePayload) => {
    try {
      const res = await api.createFactura(invoicePayload);
      if (res) {
        showNotification('¡Factura y Encargo a Taller registrados exitosamente!', 'success');
        clearCart();
        refreshData();
        return true;
      }
    } catch {
      // El ErrorModal capturó el detalle
    }
    return false;
  };

  const dispatchInvoice = async (facturaId) => {
    try {
      await api.dispatchFactura(facturaId);
      showNotification('Factura despachada y enviada a logística', 'success');
      refreshData(false);
    } catch {
      // El ErrorModal capturó el detalle
    }
  };

  const addPago = async (facturaId, monto, nota) => {
    try {
      await api.createPago(facturaId, monto, nota);
      showNotification('Abono registrado correctamente', 'success');
      refreshData();
    } catch {
      // El ErrorModal capturó el detalle
    }
  };

  const declararPerdida = async (facturaId) => {
    try {
      await api.declararPerdida(facturaId);
      showNotification('Factura declarada como pérdida exitosamente', 'success');
      refreshData();
    } catch {
      // ErrorModal capta
    }
  };

  const perdonarDeuda = async (facturaId) => {
    try {
      await api.perdonarDeuda(facturaId);
      showNotification('Deuda de factura perdonada exitosamente', 'success');
      refreshData();
    } catch {
      // ErrorModal capta
    }
  };


  const updateConfigValue = async (newConfig) => {
    try {
      await api.updateConfig(newConfig);
      setConfig(newConfig);
      showNotification('Configuración guardada en el servidor', 'success');
    } catch {
      // El ErrorModal capturó el detalle
    }
  };

  return (
    <AppContext.Provider value={{
      theme,
      toggleTheme,
      token,
      user,
      isAdmin,
      permissions,
      hasPermission,
      apiUrl,
      updateApiUrl,
      isAuthenticated: !!token,
      loginUser,
      logoutUser,
      loading,
      notification,
      showNotification,
      showErrorModalCustom,
      // Datos
      catalogo,
      stock,
      facturas,
      items,
      envios,
      clientes,
      config,
      refreshData,
      // Acciones
      addCatalogItem,
      updateCatalogItem,
      deleteCatalogItem,
      addStockItem,
      adjustStockCount,
      updateItemStatus,
      updateEnvioStatus,
      createCliente,
      createInvoice,
      dispatchInvoice,
      addPago,
      declararPerdida,
      perdonarDeuda,
      updateConfigValue,
      // Carrito
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      selectedCliente,
      setSelectedCliente
    }}>
      {children}
      {/* Componente Modal Global de Errores de API */}
      <ErrorModal error={errorModal} onClose={closeErrorModal} />
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
