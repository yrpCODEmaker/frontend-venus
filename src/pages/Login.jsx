import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Server, ShieldCheck, Wifi, WifiOff, RefreshCw, KeyRound, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [requiresOtp, setRequiresOtp] = useState(false);
  const { loginUser, loading, notification, apiUrl } = useApp();
  const [serverStatus, setServerStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const navigate = useNavigate();

  const checkConnection = async () => {
    setServerStatus('checking');
    const isOnline = await api.healthCheck();
    setServerStatus(isOnline ? 'online' : 'offline');
  };

  useEffect(() => {
    checkConnection();
  }, [apiUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    const res = await loginUser(username, password, requiresOtp ? otpCode : null);
    if (res?.requiresOtp) {
      setRequiresOtp(true);
    } else if (res?.success) {
      navigate('/catalog');
    }
  };

  const handleResetForm = () => {
    setRequiresOtp(false);
    setOtpCode('');
  };



  return (
    <div className="login-container animate-fade-in">
      <div className="login-card glass-panel">
        <div className="login-header">
          <img src="/venus_muebles_avatar.jpg" alt="Venus Logo" className="login-logo-img" />
          <h1>Venus</h1>
          <p>Sistema de Gestión e Inventario</p>
        </div>

        {/* Indicador de Estado de Conexión del Servidor Backend */}
        <div className="server-status-container">
          <div className={`server-status-pill ${serverStatus}`}>
            {serverStatus === 'checking' && (
              <>
                <RefreshCw size={14} className="spin-icon" />
                <span>Verificando conexión con servidor...</span>
              </>
            )}
            {serverStatus === 'online' && (
              <>
                <Wifi size={14} className="text-success" />
                <span>Servidor Backend Conectado</span>
              </>
            )}
            {serverStatus === 'offline' && (
              <>
                <WifiOff size={14} className="text-error" />
                <span>Servidor Desconectado / Inaccesible</span>
              </>
            )}
          </div>
        </div>

        {notification && (
          <div className={`notification-toast ${notification.type}`}>
            {notification.message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          {!requiresOtp ? (
            <>
              <div className="input-group">
                <label htmlFor="username">Usuario</label>
                <input 
                  type="text" 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Ej: admin"
                  required 
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="password">Contraseña</label>
                <input 
                  type="password" 
                  id="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Ingresa tu contraseña"
                  required 
                />
              </div>
              
              <button type="submit" className="btn-primary" disabled={loading}>
                <LogIn size={18} />
                {loading ? 'Validando con Servidor...' : 'Iniciar Sesión'}
              </button>
            </>
          ) : (
            <div className="otp-challenge-box animate-fade-in">
              <div className="otp-challenge-header">
                <KeyRound size={28} className="text-accent" />
                <div>
                  <h3>Verificación 2FA Requerida</h3>
                  <p className="text-muted">Ingresa el código de 6 dígitos de tu aplicación autenticadora para completar el acceso.</p>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="otpCode">Código de Verificación (OTP)</label>
                <input 
                  type="text" 
                  id="otpCode" 
                  value={otpCode} 
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  placeholder="Ej: 123456"
                  maxLength={6}
                  autoFocus
                  required 
                  className="otp-input-highlight"
                />
              </div>

              <div className="otp-actions">
                <button type="button" className="btn-secondary" onClick={handleResetForm}>
                  <ArrowLeft size={16} /> Volver
                </button>
                <button type="submit" className="btn-primary" disabled={loading || otpCode.length < 6}>
                  <ShieldCheck size={18} />
                  {loading ? 'Verificando OTP...' : 'Verificar e Ingresar'}
                </button>
              </div>
            </div>
          )}
        </form>


      </div>
    </div>
  );
}

export default Login;
