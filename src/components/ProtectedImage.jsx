import React, { useState, useEffect } from 'react';
import { getToken } from '../services/api';

const ProtectedImage = ({ src, alt, className, style }) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let isMounted = true;

    const fetchImage = async () => {
      if (!src) {
        setImgSrc(null);
        return;
      }

      // Si es un Blob local, data URI o imagen externa que no necesita protección
      if (src.startsWith('blob:') || src.startsWith('data:') || !src.startsWith('http')) {
        setImgSrc(src);
        return;
      }

      try {
        const token = getToken();
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch(src, { headers });
        if (!response.ok) throw new Error('Error al cargar la imagen');

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        
        if (isMounted) {
          setImgSrc(objectUrl);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (error || (!imgSrc && src)) {
    return (
      <div 
        className={`${className} flex items-center justify-center bg-gray-100 text-gray-400`}
        style={style}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return <img src={imgSrc || ''} alt={alt || 'Imagen'} className={className} style={style} />;
};

export default ProtectedImage;
