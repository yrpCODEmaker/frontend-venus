// Servicio de API REST para Venus Backend (FastAPI / OAS 3.1)

// Detecta el Hostname de la URL activa en el navegador del celular o PC
const getRuntimeHost = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
      return host;
    }
  }
  return null;
};

const RUNTIME_HOST = getRuntimeHost();
const WINDOWS_LOCAL_IP = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_LOCAL_MACHINE_IP ? import.meta.env.VITE_LOCAL_MACHINE_IP : null;
const ENV_API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL : null;

const isDevEnvironment = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.DEV;
  }
  return true;
};

const isProductionEnvironment = () => !isDevEnvironment();

// IP preferida para celulares/LAN: 1) Hostname del celular, 2) IP de Windows inyectada por comando, 3) 127.0.0.1
export const PRIMARY_LAN_IP = RUNTIME_HOST || WINDOWS_LOCAL_IP || '127.0.0.1';

// Direcciones por defecto: en producción se usa siempre el dominio real; en desarrollo se intenta primero local
export const LOCAL_BASE_URL = `http://${PRIMARY_LAN_IP}:8000/api/v1`;
export const DOMAIN_BASE_URL = 'https://api.venusmuebles.com/api/v1';
const DEFAULT_BASE_URL = ENV_API_BASE_URL ? formatApiUrl(ENV_API_BASE_URL) : (isProductionEnvironment() ? DOMAIN_BASE_URL : LOCAL_BASE_URL);

let activeAutoUrl = DEFAULT_BASE_URL;

/**
 * Normaliza cualquier entrada de IP, Dominio o URL
 * (ej: "api.venusmuebles.com" -> "http://api.venusmuebles.com/api/v1")
 * (ej: "192.168.1.50" -> "http://192.168.1.50:8000/api/v1")
 */
export const formatApiUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return DEFAULT_BASE_URL;
  let clean = rawUrl.trim();
  if (!clean) return DEFAULT_BASE_URL;

  // Añadir http:// si no se especificó un protocolo
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }

  clean = clean.replace(/\/+$/, '');

  // Si no termina en /api/v1
  if (!clean.endsWith('/api/v1')) {
    const hostWithoutProto = clean.replace(/^https?:\/\//, '');
    const hasPort = /:\d+/.test(hostWithoutProto);
    const isRawIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostWithoutProto) || hostWithoutProto.startsWith('localhost');

    // Solo añadir :8000 si es una dirección IP numérica o localhost sin puerto explícito
    if (!hasPort && isRawIp) {
      clean = `${clean}:8000`;
    }
    clean = `${clean}/api/v1`;
  }

  return clean;
};

export const getApiBaseUrl = () => {
  const stored = localStorage.getItem('venus_api_url');
  if (stored) return formatApiUrl(stored);
  return activeAutoUrl;
};

export const setApiBaseUrl = (url) => {
  if (url) {
    const formatted = formatApiUrl(url);
    localStorage.setItem('venus_api_url', formatted);
  } else {
    localStorage.removeItem('venus_api_url');
    activeAutoUrl = LOCAL_BASE_URL;
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

export const parseAreaField = (areaVal) => {
  if (Array.isArray(areaVal)) return areaVal;
  if (typeof areaVal === 'string') {
    if (!areaVal.trim()) return [];
    try {
      const parsed = JSON.parse(areaVal);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Ignorar error y usar fallback
    }
    return areaVal.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
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

  const token = getToken();
  const appendTokenIfNeeded = (url) => {
    if (!url) return '';
    if (token && url.includes('/api/v1/images/') && !url.includes('token=')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}token=${encodeURIComponent(token)}`;
    }
    return url;
  };

  // 1. Prioridad: Usar endpoint protegido /api/v1/images/{id} que requiere JWT
  if (item.image_id || item.resolved_image_id) {
    const imgId = item.resolved_image_id || item.image_id;
    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    return appendTokenIfNeeded(`${baseUrl}/images/${imgId}`);
  }

  // 2. Si el servidor ya devuelve image_url (viene resuelta con fallback al catalogo)
  if (item.image_url) {
    const rawUrl = item.image_url;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
      return appendTokenIfNeeded(rawUrl);
    }
    const backendOrigin = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
    return appendTokenIfNeeded(`${backendOrigin}/${rawUrl.replace(/^\/+/, '')}`);
  }

  // 3. Fallback a file_path / image_src / url_imagen
  const rawUrl = item.url_imagen || item.file_path || item.image_src || item.remote_path || '';

  if (!rawUrl) return '';

  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    return appendTokenIfNeeded(rawUrl);
  }

  const backendOrigin = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
  return appendTokenIfNeeded(`${backendOrigin}/${rawUrl.replace(/^\/+/, '')}`);
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
    const stored = localStorage.getItem('venus_api_url');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    // En producción no se debe intentar fallback automático a localhost. En desarrollo sí se puede redirigir al dominio si la API local falla.
    if (!stored && isDevEnvironment() && activeAutoUrl === LOCAL_BASE_URL && (error.message?.includes('Failed to fetch') || error.name === 'TypeError' || error.message?.includes('NetworkError'))) {
      activeAutoUrl = DOMAIN_BASE_URL;
      const fallbackUrl = `${DOMAIN_BASE_URL.replace(/\/+$/, '')}/${cleanEndpoint}`;
      try {
        const fallbackRes = await fetch(fallbackUrl, finalOptions);
        if (fallbackRes.ok) {
          if (fallbackRes.status === 204) return true;
          return await fallbackRes.json();
        }
      } catch (fallbackErr) {
        // Fallback también falló
      }
    }

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

  // 1. Autenticación (/auth)
  login: async (username, password, otpCode = null) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    if (otpCode) {
      formData.append('otp_code', otpCode);
    }

    const res = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    if (res && res.requires_otp) {
      return res;
    }

    if (res && res.access_token) {
      setToken(res.access_token);
      return res;
    } else {
      throw new Error('Respuesta de autenticación inválida del servidor');
    }
  },

  getMe: () => request('/auth/me'),

  // Autenticación de Dos Factores (2FA)
  setup2FA: () => request('/auth/2fa/setup', { method: 'POST' }),
  enable2FA: (otpCode) => request('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ otp_code: otpCode }) }),
  disable2FA: (password = null, otpCode = null) => request('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ password, otp_code: otpCode }) }),
  get2FAStatus: () => request('/auth/2fa/status'),

  // Health check real del backend con auto-descubrimiento (IP Local de Windows primero -> Dominio Nube fallback)
  healthCheck: async () => {
    const stored = localStorage.getItem('venus_api_url');
    if (stored) {
      try {
        const baseUrl = formatApiUrl(stored).replace(/\/api\/v1\/?$/, '');
        const response = await fetch(`${baseUrl}/health`, { method: 'GET' });
        return response.ok;
      } catch {
        return false;
      }
    }

    const envBaseUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL ? formatApiUrl(import.meta.env.VITE_API_BASE_URL) : null;
    if (envBaseUrl) {
      activeAutoUrl = envBaseUrl;
      try {
        const base = envBaseUrl.replace(/\/api\/v1\/?$/, '');
        const response = await fetch(`${base}/health`, { method: 'GET' });
        return response.ok;
      } catch {
        return false;
      }
    }

    if (isProductionEnvironment()) {
      activeAutoUrl = DOMAIN_BASE_URL;
      try {
        const domainBase = DOMAIN_BASE_URL.replace(/\/api\/v1\/?$/, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${domainBase}/health`, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        return res.ok;
      } catch {
        return false;
      }
    }

    // 1. Candidatos de API Local (solo en desarrollo)
    const localCandidates = [];
    if (RUNTIME_HOST) {
      localCandidates.push(`http://${RUNTIME_HOST}:8000/api/v1`);
    }
    if (WINDOWS_LOCAL_IP) {
      localCandidates.push(`http://${WINDOWS_LOCAL_IP}:8000/api/v1`);
    }
    localCandidates.push('http://127.0.0.1:8000/api/v1');
    localCandidates.push('http://localhost:8000/api/v1');

    const uniqueLocalCandidates = Array.from(new Set(localCandidates.filter(Boolean)));

    for (const candidateUrl of uniqueLocalCandidates) {
      try {
        const localBase = candidateUrl.replace(/\/api\/v1\/?$/, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${localBase}/health`, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          activeAutoUrl = candidateUrl;
          return true;
        }
      } catch {
        // Candidato local no respondió, probar el siguiente
      }
    }

    // 2. Fallback a la API en la Nube (solo en desarrollo)
    try {
      const domainBase = DOMAIN_BASE_URL.replace(/\/api\/v1\/?$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${domainBase}/health`, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        activeAutoUrl = DOMAIN_BASE_URL;
        return true;
      }
    } catch {
      // API en la nube no respondió
    }

    return false;
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
      area: parseAreaField(item.area),
      image_url: extractImageUrl(item)
    }));

    const stock = (Array.isArray(stockRaw) ? stockRaw : []).map(item => ({
      ...item,
      area: parseAreaField(item.area),
      image_url: extractImageUrl(item)
    }));

    const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map(item => ({
      ...item,
      area: parseAreaField(item.area),
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
      area: parseAreaField(item.area),
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
      area: parseAreaField(created.area),
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
      area: parseAreaField(updated.area),
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
      area: parseAreaField(item.area),
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
      area: parseAreaField(created.area),
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

  /**
   * Descarga la factura en PDF desde el backend y dispara la descarga en el navegador.
   * El backend genera el PDF server-side con todos los datos de empresa.
   */
  downloadFacturaPdf: async (facturaId) => {
    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    const url = `${baseUrl}/facturas/${facturaId}/download/pdf`;
    const response = await fetch(url, { headers: getHeaders(false) });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Error ${response.status} al generar PDF`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `Factura_${facturaId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  },

  /**
   * Descarga la factura en PNG desde el backend y dispara la descarga en el navegador.
   */
  downloadFacturaPng: async (facturaId) => {
    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    const url = `${baseUrl}/facturas/${facturaId}/download/png`;
    const response = await fetch(url, { headers: getHeaders(false) });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Error ${response.status} al generar PNG`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `Factura_${facturaId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  },


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
  getEmpresaConfig: () => request('/config/empresa'),
  updateEmpresaConfig: (empresaData) => request('/config/empresa', { method: 'PUT', body: JSON.stringify(empresaData) }),

  // 12. Sincronización Desktop & Imágenes (/sync)
  syncPush: (payload) => request('/sync/push', { method: 'POST', body: JSON.stringify(payload) }),
  syncPull: (lastSync) => request(`/sync/pull${lastSync ? `?last_sync=${lastSync}` : ''}`),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/images/upload', { method: 'POST', body: formData });
  },
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

export default api;
