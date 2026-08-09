import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Server, Palette, Building2, Plus, Trash2, Save, ShieldCheck, Users, KeyRound } from 'lucide-react';
import { formatPhoneInput } from '../utils/formatters';
import api from '../services/api';
import UserManagementPanel from '../components/config/UserManagementPanel';
import MaterialesTableManager from '../components/config/MaterialesTableManager';
import TwoFactorConfigPanel from '../components/config/TwoFactorConfigPanel';
import './Config.css';

function Config() {
  const { config, updateConfigValue, apiUrl, updateApiUrl, showNotification, isAdmin } = useApp();
  const [activeTab, setActiveTab] = useState(isAdmin ? 'users' : '2fa');

  // Red/Server
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);

  // Materiales, Colores, Areas, Tipos
  const [newArea, setNewArea] = useState('');
  const [newTipo, setNewTipo] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [newColor, setNewColor] = useState('');

  // Empresa (Persistido en company_config.json en el backend)
  const [empresaNombre, setEmpresaNombre] = useState('Venus Muebles');
  const [empresaRnc, setEmpresaRnc] = useState('');
  const [empresaTel, setEmpresaTel] = useState('');
  const [empresaDir, setEmpresaDir] = useState('');

  useEffect(() => {
    const fetchEmpresaConfig = async () => {
      try {
        const emp = await api.getEmpresaConfig();
        if (emp) {
          if (emp.nombre) setEmpresaNombre(emp.nombre);
          if (emp.rnc !== undefined) setEmpresaRnc(emp.rnc || '');
          if (emp.telefono) setEmpresaTel(emp.telefono);
          if (emp.ubicacion) setEmpresaDir(emp.ubicacion);
        }
      } catch (err) {
        console.error("Error cargando configuración de empresa desde backend:", err);
      }
    };
    fetchEmpresaConfig();
  }, []);

  const handleSaveApiServer = (e) => {
    e.preventDefault();
    updateApiUrl(tempApiUrl);
  };

  const handleSaveEmpresa = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateEmpresaConfig({
        nombre: empresaNombre,
        rnc: empresaRnc,
        telefono: empresaTel,
        ubicacion: empresaDir
      });
      if (res) {
        showNotification('Datos de la empresa guardados correctamente en company_config.json', 'success');
      }
    } catch (err) {
      showNotification(`Error al guardar datos de la empresa: ${err.message}`, 'error');
    }
  };

  const addItemToConfig = (key, value, setter) => {
    if (!value.trim()) return;
    const currentList = config[key] || [];
    if (currentList.includes(value.trim())) {
      showNotification('Este elemento ya existe', 'error');
      return;
    }
    const updatedConfig = {
      ...config,
      [key]: [...currentList, value.trim()]
    };
    updateConfigValue(updatedConfig);
    setter('');
  };

  const removeItemFromConfig = (key, value) => {
    const currentList = config[key] || [];
    const updatedConfig = {
      ...config,
      [key]: currentList.filter(item => item !== value)
    };
    updateConfigValue(updatedConfig);
  };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header glass-panel">
        <div>
          <h1>Configuración del Sistema</h1>
          <p>Gestión de seguridad, conexión al backend, catálogos auxiliares y datos fiscales</p>
        </div>
      </header>

      <div className="tab-navigation glass-panel">
        {isAdmin && (
          <button 
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} /> Empleados y Permisos
          </button>
        )}
        <button 
          className={`tab-button ${activeTab === '2fa' ? 'active' : ''}`}
          onClick={() => setActiveTab('2fa')}
        >
          <KeyRound size={18} /> Seguridad & 2FA
        </button>
        <button 
          className={`tab-button ${activeTab === 'server' ? 'active' : ''}`}
          onClick={() => setActiveTab('server')}
        >
          <Server size={18} /> Red y API Backend
        </button>
        <button 
          className={`tab-button ${activeTab === 'options' ? 'active' : ''}`}
          onClick={() => setActiveTab('options')}
        >
          <Palette size={18} /> Materiales y Colores
        </button>
        <button 
          className={`tab-button ${activeTab === 'company' ? 'active' : ''}`}
          onClick={() => setActiveTab('company')}
        >
          <Building2 size={18} /> Datos de la Empresa
        </button>
      </div>

      {/* PESTAÑA 0: USUARIOS (Solo admin) */}
      {isAdmin && activeTab === 'users' && (
        <UserManagementPanel />
      )}

      {/* PESTAÑA 1: SEGURIDAD Y 2FA */}
      {activeTab === '2fa' && (
        <TwoFactorConfigPanel />
      )}

      {/* PESTAÑA 2: RED Y SERVIDOR */}
      {activeTab === 'server' && (
        <div className="config-section glass-panel animate-fade-in">
          <h2>Conexión al Backend REST API</h2>
          <p className="text-muted">Configura el endpoint público o local del servidor backend FastAPI.</p>

          <form onSubmit={handleSaveApiServer} className="config-form">
            <div className="input-group">
              <label>URL Base de la API</label>
              <input 
                type="text" 
                value={tempApiUrl} 
                onChange={e => setTempApiUrl(e.target.value)} 
                placeholder="http://127.0.0.1:8000/api/v1"
                required 
              />
            </div>

            <div className="status-box">
              <ShieldCheck size={20} className="text-green" />
              <span>Modo Híbrido Activo: Si la API no responde, el sistema usará almacenamiento local con sincronización diferida.</span>
            </div>

            <button type="submit" className="btn-action-primary">
              <Save size={16} /> Guardar Configuración de Red
            </button>
          </form>
        </div>
      )}

      {/* PESTAÑA 2: MATERIALES Y COLORES */}
      {activeTab === 'options' && (
        <MaterialesTableManager />
      )}

      {/* PESTAÑA 3: DATOS EMPRESA */}
      {activeTab === 'company' && (
        <div className="config-section glass-panel animate-fade-in">
          <h2>Información Comercial de la Empresa</h2>
          <p className="text-muted">Estos datos aparecerán en los comprobantes y facturas emitidas.</p>

          <form onSubmit={handleSaveEmpresa} className="config-form">
            <div className="form-row">
              <div className="input-group">
                <label>Nombre Comercial / Razón Social</label>
                <input 
                  type="text" 
                  value={empresaNombre} 
                  onChange={e => setEmpresaNombre(e.target.value)} 
                  required
                />
              </div>

              <div className="input-group">
                <label>RNC / Identificación Fiscal</label>
                <input 
                  type="text" 
                  value={empresaRnc} 
                  onChange={e => setEmpresaRnc(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Teléfono Principal</label>
                <input 
                  type="text" 
                  value={empresaTel} 
                  onChange={e => setEmpresaTel(formatPhoneInput(e.target.value))} 
                />
              </div>

              <div className="input-group">
                <label>Dirección</label>
                <input 
                  type="text" 
                  value={empresaDir} 
                  onChange={e => setEmpresaDir(e.target.value)} 
                />
              </div>
            </div>

            <button type="submit" className="btn-action-primary">
              <Save size={16} /> Guardar Datos Comercial
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Config;
