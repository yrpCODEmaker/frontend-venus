import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Terminal, ShieldAlert } from 'lucide-react';
import './ErrorModal.css';

function ErrorModal({ error, onClose }) {
  if (!error || !error.isOpen) return null;

  const { title = 'Error del Servidor', message = 'Ocurrió un error inesperado', status } = error;

  return createPortal(
    <div className="modal-overlay error-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-content glass-panel error-modal-content" onClick={e => e.stopPropagation()}>
        <div className="error-modal-header">
          <div className="error-header-title">
            <div className="error-icon-glow">
              <AlertTriangle size={24} className="text-error" />
            </div>
            <div>
              <h2>{title}</h2>
              {status && <span className="error-status-badge">HTTP {status}</span>}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="error-modal-body">
          <p className="error-summary">El servidor backend retornó el siguiente detalle:</p>
          
          <div className="error-detail-box">
            <div className="error-box-header">
              <Terminal size={14} />
              <span>Respuesta del Servidor (Detalle técnico)</span>
            </div>
            <pre className="error-code-text">
              {typeof message === 'object' ? JSON.stringify(message, null, 2) : message}
            </pre>
          </div>
        </div>

        <div className="error-modal-footer">
          <button className="btn-action-error" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ErrorModal;
