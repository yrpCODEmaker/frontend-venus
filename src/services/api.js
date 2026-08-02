// Servicio de API REST para Venus Backend (FastAPI / OAS 3.1)

// Se usa window.location.hostname para adaptarse a IPs dinámicas en la red local.
// De esta manera, si la IP de tu PC cambia (ej. de 192.168.1.32 a 192.168.1.45),
// el frontend en los móviles buscará automáticamente en la IP correcta.
const DEFAULT_BASE_URL = `http://${window.location.hostname}:8000/api/v1`;

export const getApiBaseUrl = () => {
  return localStorage.getItem('venus_api_url') || DEFAULT_BASE_URL;
};

export const setApiBaseUrl = (url) => {
  if (url) {
    localStorage.setItem('venus_api_url', url);
  } else {
    localStorage.removeItem('venus_api_url');
  }
};

export const getToken = () => {
  return localStorage.getItem('venus_token') || null;
};

export const setToken = (token) => {
  if (token) {
    localStorage.setItem('venus_token', token);
  } else {
    localStorage.removeItem('venus_token');
  }
};

let onErrorListener = null;
let onUnauthorizedListener = null;
let onForbiddenListener = null;

export const setErrorListener = (listener) => {
  onErrorListener = listener;
};

export const setUnauthorizedListener = (listener) => {
  onUnauthorizedListener = listener;
};

export const setForbiddenListener = (listener) => {
  onForbiddenListener = listener;
};

/**
 * Construye la URL de imagen para un item usando el endpoint protegido.
 *
 * Prioridades:
 * 1. Si el servidor ya devuelve image_url (viene resuelta con fallback al catalogo) → usarla
 * 2. Si viene image_id → construir URL del endpoint protegido /api/v1/images/{id}
 * 3. Si viene file_path o image_src → construir URL con baseUrl
 * 4. Si nada → string vacío
 */
export const extractImageUrl = (item) => {
  if (!item) return '';

  // 1. Prioridad: Usar endpoint protegido /api/v1/images/{id} que requiere JWT
  if (item.image_id || item.resolved_image_id) {
    const imgId = item.resolved_image_id || item.image_id;
    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    return `${baseUrl}/images/${imgId}`;
  }

  // 2. Si el servidor ya devuelve image_url (viene resuelta con fallback al catalogo)
  if (item.image_url) {
    const rawUrl = item.image_url;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
      return rawUrl;
    }
    const backendOrigin = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
    return `${backendOrigin}/${rawUrl.replace(/^\/+/, '')}`;
  }

  // 3. Fallback a file_path / image_src / url_imagen
  const rawUrl = item.url_imagen || item.file_path || item.image_src || item.remote_path || '';

  if (!rawUrl) return '';

  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    return rawUrl;
  }

  const backendOrigin = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
  return `${backendOrigin}/${rawUrl.replace(/^\/+/, '')}`;
};

const getHeaders = (isJson = true) => {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

async function request(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  
  const defaultOptions = {
    headers: getHeaders(options.isJson !== false && !(options.body instanceof FormData)),
  };

  const finalOptions = { ...defaultOptions, ...options };
  delete finalOptions.isJson;

  try {
    const response = await fetch(url, finalOptions);
    if (!response.ok) {
      if (response.status === 401) {
        setToken(null);
        if (onUnauthorizedListener) {
          onUnauthorizedListener();
        }
      }

      // Manejar 403 con mensaje amigable en lugar del modal técnico
      if (response.status === 403) {
        const errorData403 = await response.json().catch(() => ({}));
        const msg403 = errorData403.detail || 'No tienes permiso para realizar esta acción. Consulta al administrador.';
        if (onForbiddenListener) {
          onForbiddenListener(msg403);
        }
        const err403 = new Error(msg403);
        err403.status = 403;
        throw err403;
      }

      const errorData = await response.json().catch(() => ({ message: response.statusText || `HTTP ${response.status}` }));
      
      let detailMsg = errorData.detail || errorData.message || `Error HTTP ${response.status}`;
      if (Array.isArray(detailMsg)) {
        detailMsg = detailMsg.map(err => `${err.loc ? err.loc.join(' > ') + ': ' : ''}${err.msg}`).join('\n');
      }
      
      const err = new Error(typeof detailMsg === 'string' ? detailMsg : JSON.stringify(detailMsg));
      err.status = response.status;
      err.detail = detailMsg;
      
      // Notificar errores distintos a 401 y 403 (ya manejados arriba)
      if (response.status !== 401 && response.status !== 403 && onErrorListener) {
        onErrorListener({
          title: `Error en Servidor (HTTP ${response.status})`,
          message: detailMsg,
          status: response.status
        });
      }
      
      throw err;
    }
    if (response.status === 204) return true;
    return await response.json();
  } catch (error) {
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      const connMsg = `No se pudo establecer conexión con el servidor backend en '${url}'.\n\nPor favor verifica:\n1. Que la API del backend esté en ejecución.\n2. Que la dirección IP y puerto estén configurados correctamente.`;
      if (onErrorListener) {
        onErrorListener({
          title: 'Error de Conexión con Backend',
          message: connMsg,
          status: 'OFFLINE'
        });
      }
    }
    console.warn(`[API] Falló la petición a ${endpoint}:`, error.message);
    throw error;
  }
}

export const MOCK_DATA = {
  catalogo: [],
  stock: [],
  facturas: [],
  items: [],
  envios: [],
  clientes: [],
  config: {
    company_info: {
      nombre_empresa: "Muebles Venus SRL",
      rnc: "131-99882-1",
      telefono: "809-555-8888",
      direccion: "Santo Domingo, República Dominicana"
    },
    areas: ["Tapicería", "Ebanistería", "Pintura", "Costura"],
    tipos: ["Sofá", "Cama", "Comedor", "Mesa", "Sillón"],
    materiales: ["Terciopelo", "Lino", "Cuerina", "Madera Roble", "Pino Tratado"],
    colores: ["Gris Plomo", "Beige", "Azul Marino", "Negro", "Nogal Oscuro"]
  }
};

export const api = {
  // 1. Administración (/admin)
  getAdminUsers: () => request('/admin/users'),
  createAdminUser: (userData) => request('/admin/users', { method: 'POST', body: JSON.stringify(userData) }),
  toggleAdminUser: (username) => request(`/admin/users/${username}/toggle`, { method: 'PATCH' }),
  updateAdminUser: (username, data) => request(`/admin/users/${username}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminUser: (username) => request(`/admin/users/${username}`, { method: 'DELETE' }),
  getAdminUserPermissions: (username) => request(`/admin/users/${username}/permissions`),
  updateAdminUserPermissions: (username, perms) => request(`/admin/users/${username}/permissions`, { method: 'PUT', body: JSON.stringify(perms) }),
  patchAdminUserDataVisibility: (username, data) => request(`/admin/users/${username}/data-visibility`, { method: 'PATCH', body: JSON.stringify(data) }),

  // 2. Autenticación Real (/auth)
  login: async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const res = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    if (res && res.access_token) {
      setToken(res.access_token);
      return res;
    } else {
      throw new Error('Respuesta de autenticación inválida del servidor');
    }
  },

  getMe: () => request('/auth/me'),

  // Health check real del backend
  healthCheck: async () => {
    try {
      const baseUrl = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
      const response = await fetch(`${baseUrl}/health`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  },

  // 3. Pull Masivo Inicial de Estado
  pullAllData: async () => {
    const [catalogoRaw, stockRaw, facturas, itemsRaw, envios, clientes, config] = await Promise.all([
      request('/catalogo').catch(() => []),
      request('/stock').catch(() => []),
      request('/facturas').catch(() => []),
      request('/items').catch(() => []),
      request('/envios').catch(() => []),
      request('/clientes').catch(() => []),
      request('/config').catch(() => MOCK_DATA.config)
    ]);

    const catalogo = (Array.isArray(catalogoRaw) ? catalogoRaw : []).map(item => ({
      ...item,
      image_url: extractImageUrl(item)
    }));

    const stock = (Array.isArray(stockRaw) ? stockRaw : []).map(item => ({
      ...item,
      image_url: extractImageUrl(item)
    }));

    const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map(item => ({
      ...item,
      image_url: extractImageUrl(item)
    }));

    return {
      catalogo,
      stock,
      facturas: Array.isArray(facturas) ? facturas : [],
      items,
      envios: Array.isArray(envios) ? envios : [],
      clientes: Array.isArray(clientes) ? clientes : [],
      config: (config && typeof config === 'object') ? config : MOCK_DATA.config
    };
  },

  // 4. Catálogo (/catalogo)
  getCatalogo: async () => {
    const list = await request('/catalogo');
    return (Array.isArray(list) ? list : []).map(item => ({
      ...item,
      image_url: extractImageUrl(item)
    }));
  },
  createCatalogo: async (itemData, file) => {
    const formData = new FormData();
    formData.append('nombre', itemData.nombre || '');
    formData.append('tipo', itemData.tipo || '');
    const areaVal = Array.isArray(itemData.area) ? JSON.stringify(itemData.area) : JSON.stringify(itemData.area ? [itemData.area] : []);
    formData.append('area', areaVal);
    formData.append('precio_base', (itemData.precio_base || 0).toString());
    if (file) {
      formData.append('file', file);
    }
    const created = await request('/catalogo', { method: 'POST', body: formData });
    return {
      ...created,
      image_url: extractImageUrl(created)
    };
  },
  updateCatalogo: async (id, itemData, file) => {
    const formData = new FormData();
    if (itemData.nombre) formData.append('nombre', itemData.nombre);
    if (itemData.tipo) formData.append('tipo', itemData.tipo);
    if (itemData.area) {
      const areaVal = Array.isArray(itemData.area) ? JSON.stringify(itemData.area) : JSON.stringify(itemData.area ? [itemData.area] : []);
      formData.append('area', areaVal);
    }
    if (itemData.precio_base !== undefined && itemData.precio_base !== null) {
      formData.append('precio_base', itemData.precio_base.toString());
    }
    if (file) {
      formData.append('file', file);
    }
    const updated = await request(`/catalogo/${id}`, { method: 'PUT', body: formData });
    return {
      ...updated,
      image_url: extractImageUrl(updated)
    };
  },
  patchCatalogo: (id, patchData) => request(`/catalogo/${id}`, { method: 'PATCH', body: JSON.stringify(patchData) }),
  deleteCatalogo: (id) => request(`/catalogo/${id}`, { method: 'DELETE' }),

  // 5. Stock (/stock)
  getStock: async () => {
    const list = await request('/stock');
    return (Array.isArray(list) ? list : []).map(item => ({
      ...item,
      image_url: extractImageUrl(item)
    }));
  },
  createStock: async (stockData, file) => {
    const formData = new FormData();
    formData.append('catalogo_id', stockData.catalogo_id || '');
    if (stockData.tela) formData.append('tela', stockData.tela);
    if (stockData.material) formData.append('material', stockData.material);
    if (stockData.descripcion) formData.append('descripcion', stockData.descripcion);
    formData.append('cantidad', (stockData.cantidad || 1).toString());
    formData.append('precio', (stockData.precio || 0).toString());
    if (file) formData.append('file', file);
    const created = await request('/stock', { method: 'POST', body: formData });
    return {
      ...created,
      image_url: extractImageUrl(created)
    };
  },
  updateStockCantidad: (id, delta) => request(`/stock/${id}/cantidad`, { method: 'PATCH', body: JSON.stringify({ delta }) }),
  deleteStock: (id) => request(`/stock/${id}`, { method: 'DELETE' }),

  // 6. Facturas (/facturas)
  getFacturas: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/facturas${query ? `?${query}` : ''}`);
  },
  getFacturaDetail: (id) => request(`/facturas/${id}`),
  createFactura: (facturaPayload) => request('/facturas', { method: 'POST', body: JSON.stringify(facturaPayload) }),
  patchFactura: (id, patchData) => request(`/facturas/${id}`, { method: 'PATCH', body: JSON.stringify(patchData) }),
  deleteFactura: (id) => request(`/facturas/${id}`, { method: 'DELETE' }),
  dispatchFactura: (id) => request(`/facturas/${id}/dispatch`, { method: 'POST' }),

  // 7. Ítems / Producción (/items)
  getItems: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const list = await request(`/items${query ? `?${query}` : ''}`);
    return (Array.isArray(list) ? list : []).map(item => ({
      ...item,
      image_url: extractImageUrl(item)
    }));
  },
  addFacturaItem: (facturaId, itemData) => request(`/facturas/${facturaId}/items`, { method: 'POST', body: JSON.stringify(itemData) }),
  updateItem: (id, itemData) => request(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(itemData) }),
  updateItemStatus: (id, status) => request(`/items/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  setItemPhoto: (id, imageId) => request(`/items/${id}/photo`, { method: 'PATCH', body: JSON.stringify({ image_id: imageId }) }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),

  // 8. Pagos / Abonos
  getPagosFactura: (id) => request(`/facturas/${id}/pagos`),
  createPago: (id, monto, nota) => request(`/facturas/${id}/pagos`, { method: 'POST', body: JSON.stringify({ monto, nota }) }),
  declararPerdida: (id) => request(`/facturas/${id}/perdida`, { method: 'PATCH' }),
  perdonarDeuda: (id) => request(`/facturas/${id}/perdonar`, { method: 'PATCH' }),

  // 9. Envíos (/envios)
  getEnvios: () => request('/envios'),
  updateEnvioStatus: (id, status) => request(`/envios/${id}/status`, { method: 'PATCH', body: JSON.stringify({ estado: status }) }),

  // 10. Clientes (/clientes)
  getClientes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/clientes${query ? `?${query}` : ''}`);
  },
  createCliente: (clienteData) => request('/clientes', { method: 'POST', body: JSON.stringify(clienteData) }),
  patchCliente: (id, clienteData) => request(`/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(clienteData) }),
  deleteCliente: (id) => request(`/clientes/${id}`, { method: 'DELETE' }),

  // 11. Configuración (/config)
  getConfig: () => request('/config'),
  updateConfig: (configPayload) => request('/config', { method: 'PUT', body: JSON.stringify(configPayload) }),

  // 12. Sincronización Desktop & Imágenes (/sync)
  syncPush: (payload) => request('/sync/push', { method: 'POST', body: JSON.stringify(payload) }),
  syncPull: (lastSync) => request(`/sync/pull${lastSync ? `?last_sync=${lastSync}` : ''}`),
  uploadSyncImage: (localImageId, file) => {
    const formData = new FormData();
    formData.append('local_image_id', localImageId);
    formData.append('file', file);
    return request('/sync/upload_image', { method: 'POST', body: formData });
  },

  // 13. Materiales / Catálogos Auxiliares (/materiales)
  getMateriales: (categoria) => request(`/materiales${categoria ? `?categoria=${encodeURIComponent(categoria)}` : ''}`),
  createMaterial: (data) => request('/materiales', { method: 'POST', body: JSON.stringify(data) }),
  updateMaterial: (id, data) => request(`/materiales/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMaterial: (id) => request(`/materiales/${id}`, { method: 'DELETE' }),

  // 14. Nóminas y Finanzas
  getEmpleados: () => request('/nominas/empleados'),
  createEmpleado: (data) => request('/nominas/empleados', { method: 'POST', body: JSON.stringify(data) }),
  updateEmpleado: (id, data) => request(`/nominas/empleados/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEmpleado: (id) => request(`/nominas/empleados/${id}`, { method: 'DELETE' }),

  getComisiones: (empleadoId) => request(`/nominas/empleados/${empleadoId}/comisiones`),
  createComision: (empleadoId, data) => request(`/nominas/empleados/${empleadoId}/comisiones`, { method: 'POST', body: JSON.stringify(data) }),
  deleteComision: (id) => request(`/nominas/comisiones/${id}`, { method: 'DELETE' }),

  getGastoPerfiles: () => request('/finanzas/gastos/perfiles'),
  createGastoPerfil: (data) => request('/finanzas/gastos/perfiles', { method: 'POST', body: JSON.stringify(data) }),
  deleteGastoPerfil: (id) => request(`/finanzas/gastos/perfiles/${id}`, { method: 'DELETE' }),

  getGastoRegistros: () => request('/finanzas/gastos/registros'),
  createGastoRegistro: (data) => request('/finanzas/gastos/registros', { method: 'POST', body: JSON.stringify(data) }),
  deleteGastoRegistro: (id) => request(`/finanzas/gastos/registros/${id}`, { method: 'DELETE' }),

  getMetricasFinancieras: (start, end) => request(`/finanzas/metricas?start_date=${start}&end_date=${end}`)
};
