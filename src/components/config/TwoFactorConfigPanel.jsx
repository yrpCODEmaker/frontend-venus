import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, KeyRound, Copy, Check, QrCode, Lock, RefreshCw, X } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import './TwoFactorConfigPanel.css';

function TwoFactorConfigPanel() {
  const { showNotification } = useApp();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estado del flujo de Setup
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState(null); // { secret, qr_code_base64, otpauth_url }
  const [verificationCode, setVerificationCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estado del flujo de Desactivación
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disabling, setDisabling] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get2FAStatus();
      setEnabled(!!res.enabled);
    } catch (err) {
      console.warn('Error al obtener estado de 2FA:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const res = await api.setup2FA();
      if (res && res.secret) {
        setSetupData(res);
        setShowSetup(true);
        setVerificationCode('');
      }
    } catch (err) {
      showNotification(err.detail || err.message || 'No se pudo iniciar la configuración de 2FA', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      showNotification('¡Clave secreta copiada al portapapeles!', 'success');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleConfirmEnable = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length < 6) return;

    setConfirming(true);
    try {
      const res = await api.enable2FA(verificationCode);
      if (res && res.enabled) {
        setEnabled(true);
        setShowSetup(false);
        setSetupData(null);
        setVerificationCode('');
        showNotification('¡Autenticación de 2 Factores (2FA) activada exitosamente!', 'success');
      }
    } catch (err) {
      showNotification(err.detail || err.message || 'Código OTP inválido o desincronizado.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirmDisable = async (e) => {
    e.preventDefault();
    if (!disablePassword) return;

    setDisabling(true);
    try {
      const res = await api.disable2FA(disablePassword);
      if (res && !res.enabled) {
        setEnabled(false);
        setShowDisableModal(false);
        setDisablePassword('');
        showNotification('Autenticación de 2 Factores desactivada.', 'info');
      }
    } catch (err) {
      showNotification(err.detail || err.message || 'No se pudo desactivar el 2FA. Verifique su contraseña.', 'error');
    } finally {
      setDisabling(false);
    }
  };

  return (
    <div className="two-factor-panel glass-panel animate-fade-in">
      <div className="tf-header">
        <div className="tf-title-group">
          <KeyRound size={28} className="text-primary" />
          <div>
            <h2>Autenticación de Dos Factores (2FA / TOTP)</h2>
            <p className="text-muted">Protege tu cuenta agregando una capa de seguridad con códigos temporales generados en tu teléfono.</p>
          </div>
        </div>
        <div className={`tf-status-badge ${enabled ? 'active' : 'inactive'}`}>
          {enabled ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
          <span>{enabled ? '2FA Activado' : '2FA Inactivo'}</span>
        </div>
      </div>

      {loading && !showSetup ? (
        <div className="tf-loading">
          <RefreshCw size={24} className="spin-icon" />
          <span>Cargando estado de seguridad...</span>
        </div>
      ) : (
        <div className="tf-content">
          {!enabled && !showSetup && (
            <div className="tf-promo-box">
              <div className="tf-info-cards">
                <div className="tf-info-card">
                  <ShieldCheck size={20} className="text-success" />
                  <h4>Protección ante Bloqueos</h4>
                  <p>Si sufres 3 intentos fallidos de clave, tu cuenta exigirá un código OTP en lugar de bloquearse por 5 minutos.</p>
                </div>
                <div className="tf-info-card">
                  <Lock size={20} className="text-primary" />
                  <h4>Detección de IP Sospechosa</h4>
                  <p>Inicios de sesión desde ubicaciones o direcciones IP fuera del país requerirán automáticamente tu código 2FA.</p>
                </div>
              </div>

              <div className="tf-actions">
                <button type="button" className="btn-action-primary" onClick={handleStartSetup}>
                  <KeyRound size={18} /> Activar Autenticación de Dos Factores
                </button>
              </div>
            </div>
          )}

          {/* VISTA DE SETUP (Generación de QR y confirmación) */}
          {showSetup && setupData && (
            <div className="tf-setup-container animate-fade-in">
              <div className="tf-setup-header">
                <h3>Configuración de 2FA</h3>
                <button type="button" className="btn-icon-close" onClick={() => setShowSetup(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="tf-steps-grid">
                {/* PASO 1: QR y Clave */}
                <div className="tf-step-box">
                  <div className="step-number">Paso 1</div>
                  <h4>Escanear Código QR</h4>
                  <p className="text-muted">Abre tu app autenticadora (Google Authenticator, Authy, 1Password) y escanea este código:</p>

                  <div className="qr-image-wrapper">
                    <img src={setupData.qr_code_base64} alt="Código QR para 2FA" className="qr-code-img" />
                  </div>

                  <div className="secret-copy-box">
                    <span className="secret-label">¿No puedes escanear el QR? Copia la clave secreta:</span>
                    <div className="secret-input-group">
                      <input type="text" readOnly value={setupData.secret} className="secret-text-input" />
                      <button type="button" className="btn-copy-secret" onClick={handleCopySecret} title="Copiar clave secreta">
                        {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                        {copied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* PASO 2: Confirmación con código OTP */}
                <div className="tf-step-box">
                  <div className="step-number">Paso 2</div>
                  <h4>Verificar Activación</h4>
                  <p className="text-muted">Ingresa el código de 6 dígitos que muestra tu aplicación para asegurarnos de que todo está sincronizado correctamente.</p>

                  <form onSubmit={handleConfirmEnable} className="tf-confirm-form">
                    <div className="input-group">
                      <label htmlFor="verifyOtpInput">Código OTP generado (6 dígitos)</label>
                      <input
                        type="text"
                        id="verifyOtpInput"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Ej: 123456"
                        maxLength={6}
                        required
                        className="otp-verify-input"
                      />
                    </div>

                    <div className="tf-confirm-actions">
                      <button type="button" className="btn-secondary" onClick={() => setShowSetup(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn-action-primary" disabled={confirming || verificationCode.length < 6}>
                        <ShieldCheck size={18} />
                        {confirming ? 'Verificando...' : 'Confirmar y Activar 2FA'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2FA ACTIVADO */}
          {enabled && !showSetup && (
            <div className="tf-active-box animate-fade-in">
              <div className="tf-active-banner">
                <ShieldCheck size={32} className="text-success" />
                <div>
                  <h3>Tu cuenta está protegida con 2FA</h3>
                  <p>Cada inicio de sesión desde un nuevo navegador o IP sospechosa solicitará tu código de 6 dígitos.</p>
                </div>
              </div>

              <div className="tf-active-actions">
                <button type="button" className="btn-danger-outline" onClick={() => setShowDisableModal(true)}>
                  Desactivar 2FA
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE DESACTIVACIÓN */}
      {showDisableModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel um-modal">
            <div className="modal-header">
              <h2>Desactivar Autenticación de 2 Factores</h2>
              <button type="button" className="btn-icon-close" onClick={() => setShowDisableModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmDisable} className="modal-form">
              <p className="text-muted">Por seguridad, ingresa tu contraseña actual para confirmar la desactivación del 2FA:</p>

              <div className="input-group">
                <label>Contraseña Actual</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Tu contraseña de usuario"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowDisableModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-action-primary bg-danger" disabled={disabling || !disablePassword}>
                  {disabling ? 'Desactivando...' : 'Confirmar Desactivación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TwoFactorConfigPanel;
