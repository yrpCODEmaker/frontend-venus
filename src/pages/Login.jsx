import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Server, ShieldCheck, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { loginUser, loading, notification, apiUrl, updateApiUrl } = useApp();
  const [showConfig, setShowConfig] = useState(false);
  const [tempUrl, setTempUrl] = useState(apiUrl);
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

    const success = await loginUser(username, password);
    if (success) {
      navigate('/catalog');
    }
  };

  const handleSaveApiUrl = (e) => {
    e.preventDefault();
    updateApiUrl(tempUrl);
    setShowConfig(false);
    checkConnection();
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="login-logo-glow"></div>
          <h1>Venus</h1>
          <p>Sistema de Gestión e Inventario</p>
        </div>

        {/* Indicador de Estado de Conexión del Servidor Backend */}
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

        {notification && (
          <div className={`notification-toast ${notification.type}`}>
            {notification.message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
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
        </form>

        <div className="login-footer">
          <button type="button" className="btn-server-config" onClick={() => setShowConfig(!showConfig)}>
            <Server size={14} />
            {showConfig ? 'Ocultar Servidor' : 'Configurar URL del Servidor'}
          </button>
        </div>

        {showConfig && (
          <form onSubmit={handleSaveApiUrl} className="server-config-form animate-fade-in">
            <div className="input-group">
              <label>API Endpoint Backend</label>
              <input 
                type="text" 
                value={tempUrl} 
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="http://127.0.0.1:8000/api/v1" 
              />
            </div>
            <div className="config-actions-row">
              <button type="button" className="btn-secondary" onClick={checkConnection}>
                <RefreshCw size={14} /> Probar
              </button>
              <button type="submit" className="btn-action-primary">
                <ShieldCheck size={14} /> Guardar URL
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
