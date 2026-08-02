/**
 * Formatea un número al estándar "23,000.00" (comas para miles, punto para decimales fixed 2).
 * @param {number|string} val - El valor a formatear.
 * @returns {string} - El string formateado (ej. "23,000.00").
 */
export const formatCurrency = (val) => {
  const num = Number(val || 0);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formatea un valor numérico a un string con separadores de miles para su visualización.
 * @param {number|string} value - El valor a formatear.
 * @returns {string} - El string formateado (ej. "25,000" o "25,000.50").
 */
export const formatCurrencyInput = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numStr = value.toString();
  // Solo permitir dígitos y un solo punto decimal
  const cleanStr = numStr.replace(/[^\d.]/g, '');
  if (!cleanStr) return '';

  const parts = cleanStr.split('.');
  // Formatear la parte entera con comas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Reunir las partes, asegurándose de no tener más de dos decimales opcionalmente
  if (parts.length > 1) {
    return `${parts[0]}.${parts[1].substring(0, 2)}`;
  }
  return parts[0];
};

/**
 * Parsea un string formateado con comas de vuelta a un string numérico limpio para guardarlo.
 * @param {string} value - El string formateado.
 * @returns {string} - El string de solo números (ej. "25000" o "25000.50").
 */
export const parseCurrencyInput = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return value.toString().replace(/[^\d.]/g, '');
};

/**
 * Formatea un número de teléfono mientras el usuario escribe.
 * Formato objetivo: XXX-XXX-XXXX
 * @param {string} value - El valor a formatear.
 * @returns {string} - El número de teléfono formateado.
 */
export const formatPhoneInput = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const cleanStr = value.toString().replace(/[^\d]/g, '');
  if (!cleanStr) return '';

  if (cleanStr.length <= 3) return cleanStr;
  if (cleanStr.length <= 6) return `${cleanStr.substring(0, 3)}-${cleanStr.substring(3)}`;
  return `${cleanStr.substring(0, 3)}-${cleanStr.substring(3, 6)}-${cleanStr.substring(6, 10)}`;
};

/**
 * Parsea un string que puede ser JSON o texto plano.
 * Útil para campos como color o material que ahora se guardan como JSON
 * pero antes se guardaban como texto plano.
 * @param {string} value - El valor a parsear
 * @returns {object|string} - El objeto parseado o el texto plano
 */
export const parseItemJSON = (value) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch (e) {
    return value;
  }
};

/**
 * Formatea visualmente un JSON (arreglo u objeto) o texto plano.
 * @param {string} value - El valor desde la DB
 * @returns {string} - Un string bonito para mostrar
 */
export const formatItemJSON = (value) => {
  const parsed = parseItemJSON(value);
  
  if (!parsed) {
    return '';
  }

  if (Array.isArray(parsed)) {
    return parsed
      .filter(val => val && !String(val).startsWith('Ninguna') && !String(val).startsWith('None'))
      .join(' - ');
  }
  
  if (typeof parsed === 'object') {
    if (Object.keys(parsed).length === 0) return 'Dato Inválido';
    return Object.entries(parsed)
      .filter(([_, val]) => val && !String(val).startsWith('Ninguna') && !String(val).startsWith('None'))
      .map(([key, val]) => {
        const displayKey = key.charAt(0).toUpperCase() + key.slice(1);
        return `${displayKey}: ${val}`;
      })
      .join(' | ');
  }

  return String(parsed);
};
