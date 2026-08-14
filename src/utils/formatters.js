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

  // Reunir las partes
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
 * @param {string} value - El valor a parsear
 * @returns {object|string} - El objeto parseado o el texto plano
 */
export const parseItemJSON = (value) => {
  if (!value) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

/**
 * Limpia y normaliza cualquier valor de campo eliminando nulos, marcas "None", "(None)",
 * "Por definir", arreglos JSON escapados como '["Tapicería"]', corchetes y comillas.
 * Retorna un string limpio o "" si el campo no tiene datos reales.
 */
export const cleanFieldValue = (value) => {
  if (value === null || value === undefined) return '';

  let str = '';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      str = value
        .map(v => cleanFieldValue(v))
        .filter(Boolean)
        .join(', ');
    } else {
      str = Object.entries(value)
        .map(([k, v]) => {
          const valClean = cleanFieldValue(v);
          return valClean ? `${k}: ${valClean}` : null;
        })
        .filter(Boolean)
        .join(' | ');
    }
  } else {
    str = String(value).trim();
  }

  if (!str) return '';

  // Si es un string JSON que representa un array como '["Tapicería"]'
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        str = parsed.map(v => cleanFieldValue(v)).filter(Boolean).join(', ');
      }
    } catch {}
  }

  // Quitar corchetes, comillas externas o barras invertidas sobrantes
  str = str.replace(/^\[\s*["']?|["']?\s*\]$/g, '').replace(/\\"/g, '"').replace(/^["']+|["']+$/g, '').trim();

  // Limpiar valores nulos o placeholders comunes
  const lower = str.toLowerCase();
  if (['none', 'null', 'undefined', '(none)', '(null)', 'por definir', 'ninguno', 'ninguna', 'n/a'].includes(lower)) {
    return '';
  }

  // Quitar cualquier sufijo tipo "(None)" o "(null)" o "(Por definir)" pegado al final
  str = str.replace(/\s*\((none|null|undefined|por definir|ninguna|ninguno|n\/a)\)/gi, '').trim();

  return str;
};

/**
 * Formatea el campo Área limpiamente (ej. "Tapicería" en lugar de '["Tapicería"]').
 */
export const formatArea = (area) => {
  return cleanFieldValue(area);
};

/**
 * Formatea Material y Tela combinados de forma limpia e inteligente.
 */
export const formatMaterialAndTela = (material, tela) => {
  const cleanMat = cleanFieldValue(material);
  const cleanTel = cleanFieldValue(tela);

  if (cleanMat && cleanTel && cleanMat.toLowerCase() !== cleanTel.toLowerCase()) {
    return `Material: ${cleanMat} · Tela: ${cleanTel}`;
  }
  if (cleanMat) {
    return `Material: ${cleanMat}`;
  }
  if (cleanTel) {
    return `Tela: ${cleanTel}`;
  }
  return '';
};

/**
 * Formatea visualmente un JSON o texto plano limpiando valores nulos.
 */
export const formatItemJSON = (value) => {
  return cleanFieldValue(value);
};

/**
 * Genera el texto formateado de una factura listo para enviar por WhatsApp.
 * @param {Object} factura - Objeto de la factura
 * @param {Array} groupedItems - Lista de artículos agrupados
 * @param {Object} companyInfo - Datos de la empresa (nombre, teléfono, rnc, etc.)
 * @returns {string} - Texto formateado listo para WhatsApp
 */
export const formatInvoiceWhatsAppText = (factura, groupedItems = [], companyInfo = {}) => {
  if (!factura) return '';

  const companyName = companyInfo?.nombre_empresa || 'Muebles Venus';
  const companyPhone = companyInfo?.telefono || '';
  const companyRnc = companyInfo?.rnc || '';
  const companyDir = companyInfo?.direccion || '';

  // Datos del cliente
  const clientName = [
    factura.cliente_nombre || factura.cliente?.nombre || '',
    factura.cliente_apellido || factura.cliente?.apellido || ''
  ].filter(Boolean).join(' ').trim() || 'Cliente';

  const clientPhone = factura.cliente_telefono || factura.cliente?.telefono || '';
  const clientAddress = factura.cliente_domicilio || factura.cliente?.domicilio || '';

  // Fechas y Folio
  const invoiceId = factura.id ? `#${factura.id}` : '';
  const dateValue = factura.fecha || factura.created_at;
  const fechaStr = dateValue
    ? new Date(dateValue).toLocaleDateString('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Cálculos financieros
  const total = parseFloat(factura.total) || 0;
  const pagado = parseFloat(factura.monto_pagado) || 0;
  const balance = Math.max(0, total - pagado);

  const lines = [];

  // Encabezado
  lines.push(`🧾 *FACTURA ${invoiceId}*`);
  lines.push(`🏢 *${companyName}*`);
  if (companyRnc) lines.push(`📄 RNC: ${companyRnc}`);
  if (companyPhone) lines.push(`📞 Tel: ${companyPhone}`);
  if (companyDir) lines.push(`📍 ${companyDir}`);
  lines.push(`───────────────────────`);

  // Información del Cliente
  lines.push(`👤 *Cliente:* ${clientName}`);
  if (clientPhone) lines.push(`📱 *Tel:* ${clientPhone}`);
  if (clientAddress) lines.push(`🏠 *Dirección:* ${clientAddress}`);
  lines.push(`📅 *Fecha:* ${fechaStr}`);
  
  if (factura.entrega_domicilio) {
    const dirEntrega = factura.direccion_entrega || clientAddress;
    lines.push(`🚚 *Entrega:* A Domicilio${dirEntrega ? ` (${dirEntrega})` : ''}`);
  } else {
    lines.push(`📦 *Entrega:* Retiro en Tienda`);
  }

  if (factura.garantia_hasta) {
    lines.push(`🛡️ *Garantía:* ${factura.garantia_hasta}`);
  }

  lines.push(`───────────────────────`);
  lines.push(`📋 *DETALLE DE ARTÍCULOS:*`);

  const itemsList = (groupedItems && groupedItems.length > 0)
    ? groupedItems
    : (factura.items || []);

  if (itemsList.length === 0) {
    lines.push(`(Sin artículos detallados)`);
  } else {
    itemsList.forEach((it, idx) => {
      const cant = it.cantidad || 1;
      const sub = parseFloat(it.subtotal) || 0;
      const unit = cant > 0 ? (sub / cant) : sub;
      
      lines.push(``);
      lines.push(`${idx + 1}️⃣ *${cant}x ${it.nombre}*`);
      lines.push(`   ▫️ Precio: $${formatCurrency(unit)} | Subtotal: $${formatCurrency(sub)}`);

      const area = formatArea(it.area);
      const tipo = cleanFieldValue(it.tipo_mueble || it.tipo);
      const matTela = formatMaterialAndTela(it.material, it.tela);
      const color = cleanFieldValue(it.color);

      const itemSpecs = [];
      if (area || tipo) itemSpecs.push([area, tipo].filter(Boolean).join(' / '));
      if (color) itemSpecs.push(`Color: ${color}`);
      if (matTela) itemSpecs.push(matTela);

      if (itemSpecs.length > 0) {
        lines.push(`   ▫️ ${itemSpecs.join(' · ')}`);
      }

      const desc = cleanFieldValue(it.descripcion);
      if (desc) {
        lines.push(`   ▫️ _Nota: ${desc}_`);
      }
    });
  }

  lines.push(``);
  lines.push(`───────────────────────`);
  lines.push(`💰 *RESUMEN DE PAGO:*`);
  lines.push(`💵 *Total:* $${formatCurrency(total)}`);
  lines.push(`✅ *Abonado:* $${formatCurrency(pagado)}`);
  lines.push(`⏳ *Balance Pendiente:* $${formatCurrency(balance)}`);

  if (factura.declarado_perdida === 1) {
    lines.push(`⚠️ *Estado:* Declarada en Pérdida`);
  } else if (factura.declarado_perdonado === 1) {
    lines.push(`🎁 *Estado:* Saldo Perdonado`);
  } else if (balance <= 0) {
    lines.push(`🎉 *Estado:* PAGADA`);
  } else {
    lines.push(`⚠️ *Estado:* PENDIENTE DE PAGO`);
  }

  lines.push(`───────────────────────`);
  lines.push(`✨ _¡Muchas gracias por su preferencia!_`);

  return lines.join('\n');
};

