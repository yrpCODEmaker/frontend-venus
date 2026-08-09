import React, { useState, useEffect } from 'react';
import { getToken, getApiBaseUrl } from '../services/api';

/**
 * ProtectedImage — carga una imagen protegida por JWT.
 *
 * Estrategia: construye la URL absoluta del backend con el token como
 * query param (?token=...) para que el <img> tag la cargue directamente
 * sin necesidad de fetch() + CORS preflight.
 *
 * Si la URL ya es un blob: o data:, la usa directamente.
 */
const ProtectedImage = ({ src, alt, className, style, onClick }) => {
  const [finalSrc, setFinalSrc] = useState(null);

  useEffect(() => {
    if (!src) {
      setFinalSrc(null);
      return;
    }

    // Blob o data URI locales — usarlos directamente
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setFinalSrc(src);
      return;
    }

    const token = getToken();
    const backendOrigin = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');

    let absoluteUrl = src;

    // Si la URL ya apunta al endpoint /api/v1/images/ del backend → añadir token
    if (src.startsWith('http://') || src.startsWith('https://')) {
      absoluteUrl = src;
    } else {
      // Ruta relativa → hacer absoluta apuntando al backend
      absoluteUrl = `${backendOrigin}/${src.replace(/^\/+/, '')}`;
    }

    // Añadir token como query param si la URL es del backend y aún no lo tiene
    if (token && !absoluteUrl.includes('token=')) {
      const separator = absoluteUrl.includes('?') ? '&' : '?';
      absoluteUrl = `${absoluteUrl}${separator}token=${encodeURIComponent(token)}`;
    }

    setFinalSrc(absoluteUrl);
  }, [src]);

  if (!src) return null;

  if (!finalSrc) {
    // Placeholder mientras se construye la URL
    return (
      <div className={className} style={{ ...style, background: 'var(--color-surface-2, #f0f0f0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ opacity: 0.3 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={finalSrc}
      alt={alt || 'Imagen'}
      className={className}
      style={style}
      onClick={onClick}
      onError={(e) => {
        // Si falla con el token, intentar sin él (por si es una URL pública)
        if (e.target.src && e.target.src.includes('token=')) {
          const urlWithoutToken = e.target.src.replace(/[?&]token=[^&]*/, '');
          e.target.src = urlWithoutToken;
        }
      }}
    />
  );
};

export default ProtectedImage;
