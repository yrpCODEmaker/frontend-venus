import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  CreditCard, Plus, Trash2, Calendar, Tag, FileText, Layers, DollarSign, Wallet
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import './Expenses.css';

function Expenses() {
  const { hasPermission, showNotification } = useApp();
  const [perfiles, setPerfiles] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [activeTab, setActiveTab] = useState('registros'); // 'registros' | 'perfiles'

  // Perfil State
  const [nombrePerfil, setNombrePerfil] = useState('');
  const [tipoPerfil, setTipoPerfil] = useState('Variable');
  const [diaPago, setDiaPago] = useState('');

  // Registro State
  const [selectedPerfilId, setSelectedPerfilId] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nota, setNota] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const perf = await api.getGastoPerfiles();
      const reg = await api.getGastoRegistros();
      setPerfiles(perf);
      setRegistros(reg);
    } catch {
      showNotification('Error al cargar datos de gastos', 'error');
    }
  };

  const handleCreatePerfil = async (e) => {
    e.preventDefault();
    try {
      await api.createGastoPerfil({
        nombre: nombrePerfil,
        tipo: tipoPerfil,
        dia_pago: tipoPerfil === 'Fijo' && diaPago ? parseInt(diaPago) : null
      });
      showNotification('Perfil de gasto creado', 'success');
      setNombrePerfil('');
      setDiaPago('');
      loadData();
    } catch {
      showNotification('Error al crear perfil', 'error');
    }
  };

  const handleDeletePerfil = async (id) => {
    if (!window.confirm('¿Eliminar perfil? Se eliminarán también sus registros asociados.')) return;
    try {
      await api.deleteGastoPerfil(id);
      showNotification('Perfil eliminado', 'success');
      loadData();
    } catch {
      showNotification('Error al eliminar', 'error');
    }
  };

  const handleCreateRegistro = async (e) => {
    e.preventDefault();
    if (!selectedPerfilId) {
      showNotification('Selecciona un perfil', 'warning');
      return;
    }
    try {
      await api.createGastoRegistro({
        perfil_id: selectedPerfilId,
        monto: parseFloat(monto),
        fecha: fecha,
        nota: nota
      });
      showNotification('Gasto registrado', 'success');
      setMonto('');
      setNota('');
      loadData();
    } catch {
      showNotification('Error al registrar gasto', 'error');
    }
  };

  const handleDeleteRegistro = async (id) => {
    if (!window.confirm('¿Eliminar registro?')) return;
    try {
      await api.deleteGastoRegistro(id);
      showNotification('Registro eliminado', 'success');
      loadData();
    } catch {
      showNotification('Error al eliminar', 'error');
    }
  };

  if (!hasPermission('gastos_gestionar')) {
    return <div className="no-permission">No tienes permiso para gestionar gastos.</div>;
  }

  // Cálculos rápidos para resumen
  const totalGastos = registros.reduce((sum, r) => sum + (r.monto || 0), 0);
  const perfilesFijos = perfiles.filter(p => p.tipo === 'Fijo').length;
  const perfilesVariables = perfiles.filter(p => p.tipo === 'Variable').length;

  return (
    <div className="expenses-tab animate-fade-in">
      {/* ── Control Header ── */}
      <div className="expenses-header glass-panel">
        <span className="expenses-title">
          <CreditCard size={18} className="expenses-title-icon" />
          Gestión de Gastos Operativos
        </span>

        <div className="expenses-subtabs">
          <button 
            className={`exp-tab-btn ${activeTab === 'registros' ? 'active' : ''}`}
            onClick={() => setActiveTab('registros')}
          >
            <Wallet size={14} /> Registros de Pagos
          </button>
          <button 
            className={`exp-tab-btn ${activeTab === 'perfiles' ? 'active' : ''}`}
            onClick={() => setActiveTab('perfiles')}
          >
            <Tag size={14} /> Perfiles de Gasto ({perfiles.length})
          </button>
        </div>
      </div>

      {/* ── Stats Summary Banner ── */}
      <div className="expenses-summary">
        <div className="exp-stat-card">
          <div className="exp-stat-icon red">
            <DollarSign size={20} />
          </div>
          <div className="exp-stat-info">
            <span className="exp-stat-label">Total Gastos Registrados</span>
            <span className="exp-stat-val">${formatCurrency(totalGastos)}</span>
          </div>
        </div>

        <div className="exp-stat-card">
          <div className="exp-stat-icon amber">
            <Layers size={20} />
          </div>
          <div className="exp-stat-info">
            <span className="exp-stat-label">Perfiles Fijos</span>
            <span className="exp-stat-val">{perfilesFijos}</span>
          </div>
        </div>

        <div className="exp-stat-card">
          <div className="exp-stat-icon blue">
            <Tag size={20} />
          </div>
          <div className="exp-stat-info">
            <span className="exp-stat-label">Perfiles Variables</span>
            <span className="exp-stat-val">{perfilesVariables}</span>
          </div>
        </div>
      </div>

      {/* ── TAB 1: REGISTROS DE PAGOS (Layout de 2 columnas) ── */}
      {activeTab === 'registros' && (
        <div className="exp-grid-layout">
          {/* Izquierda: Formulario de Registro */}
          <div className="exp-form-panel">
            <span className="exp-form-title">
              <Plus size={16} /> Registrar Nuevo Pago
            </span>

            <form onSubmit={handleCreateRegistro} className="exp-form">
              <div className="exp-input-group">
                <label>Concepto / Perfil de Gasto</label>
                <select value={selectedPerfilId} onChange={e => setSelectedPerfilId(e.target.value)} required>
                  <option value="">Selecciona qué pagaste...</option>
                  {perfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.tipo})</option>
                  ))}
                </select>
              </div>

              <div className="exp-input-group">
                <label>Monto ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={monto} 
                  onChange={e => setMonto(e.target.value)} 
                  required 
                />
              </div>

              <div className="exp-input-group">
                <label>Fecha de Pago</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required />
              </div>

              <div className="exp-input-group">
                <label>Nota / Nº Factura (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Factura N° 1042 - Compra de tela" 
                  value={nota} 
                  onChange={e => setNota(e.target.value)} 
                />
              </div>

              <button type="submit" className="btn-action-primary exp-btn-submit">
                <CreditCard size={15} /> Registrar Pago
              </button>
            </form>
          </div>

          {/* Derecha: Lista de Registros */}
          <div className="exp-list-panel">
            <div className="exp-list-header">
              <span className="exp-list-title">
                <FileText size={16} /> Historial de Registros
              </span>
              <span className="exp-count-badge">{registros.length} pagos</span>
            </div>

            <div className="exp-items-container">
              {registros.length === 0 ? (
                <div className="exp-empty-state">
                  <CreditCard size={32} strokeWidth={1.2} />
                  <span>No hay registros de pagos aún.</span>
                </div>
              ) : (
                registros.map(r => {
                  const perfil = perfiles.find(p => p.id === r.perfil_id);
                  return (
                    <div key={r.id} className="exp-item-row">
                      <div className="exp-item-left">
                        <span className="exp-date-chip">
                          <Calendar size={12} />
                          {new Date(r.fecha).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}
                        </span>
                        <div className="exp-item-info">
                          <span className="exp-item-name">{perfil?.nombre || 'Gasto Desconocido'}</span>
                          {r.nota && <span className="exp-item-note">{r.nota}</span>}
                        </div>
                      </div>

                      <div className="exp-item-right">
                        {perfil?.tipo && (
                          <span className={`exp-type-badge ${perfil.tipo.toLowerCase()}`}>
                            {perfil.tipo}
                          </span>
                        )}
                        <span className="exp-item-amount">${formatCurrency(r.monto)}</span>
                        <button className="btn-icon danger" onClick={() => handleDeleteRegistro(r.id)} title="Eliminar registro">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PERFILES DE GASTO (Layout de 2 columnas) ── */}
      {activeTab === 'perfiles' && (
        <div className="exp-grid-layout">
          {/* Izquierda: Formulario de Perfil */}
          <div className="exp-form-panel">
            <span className="exp-form-title">
              <Plus size={16} /> Crear Perfil de Gasto
            </span>

            <form onSubmit={handleCreatePerfil} className="exp-form">
              <div className="exp-input-group">
                <label>Nombre del Perfil</label>
                <input 
                  type="text" 
                  placeholder="Ej: Madera Pino, Renta Local" 
                  value={nombrePerfil} 
                  onChange={e => setNombrePerfil(e.target.value)} 
                  required 
                />
              </div>

              <div className="exp-input-group">
                <label>Tipo de Gasto</label>
                <select value={tipoPerfil} onChange={e => setTipoPerfil(e.target.value)}>
                  <option value="Variable">Gasto Variable</option>
                  <option value="Fijo">Gasto Fijo</option>
                </select>
              </div>

              {tipoPerfil === 'Fijo' && (
                <div className="exp-input-group">
                  <label>Día de Pago del Mes (1-31)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="31" 
                    placeholder="Ej: 5 (Día 5 de cada mes)" 
                    value={diaPago} 
                    onChange={e => setDiaPago(e.target.value)} 
                  />
                </div>
              )}

              <button type="submit" className="btn-action-primary exp-btn-submit">
                <Plus size={15} /> Añadir Perfil
              </button>
            </form>
          </div>

          {/* Derecha: Lista de Perfiles */}
          <div className="exp-list-panel">
            <div className="exp-list-header">
              <span className="exp-list-title">
                <Tag size={16} /> Catálogo de Perfiles
              </span>
              <span className="exp-count-badge">{perfiles.length} perfiles</span>
            </div>

            <div className="exp-items-container">
              {perfiles.length === 0 ? (
                <div className="exp-empty-state">
                  <Tag size={32} strokeWidth={1.2} />
                  <span>No hay perfiles creados.</span>
                </div>
              ) : (
                perfiles.map(p => (
                  <div key={p.id} className="exp-item-row">
                    <div className="exp-item-left">
                      <div className="exp-item-info">
                        <span className="exp-item-name">{p.nombre}</span>
                        {p.dia_pago && <span className="exp-item-note">Cobro habitual: Día {p.dia_pago}</span>}
                      </div>
                    </div>

                    <div className="exp-item-right">
                      <span className={`exp-type-badge ${p.tipo.toLowerCase()}`}>
                        {p.tipo}
                      </span>
                      <button className="btn-icon danger" onClick={() => handleDeletePerfil(p.id)} title="Eliminar perfil">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;
