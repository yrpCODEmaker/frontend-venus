import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Users, DollarSign, Plus, Trash2, Edit2, Phone, Calendar, Award, X, UserCheck, Layers
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import './Payroll.css';

function Payroll() {
  const { hasPermission, showNotification, catalogo } = useApp();
  const [empleados, setEmpleados] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState(null);

  // Form State
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState('');
  const [salarioFijo, setSalarioFijo] = useState('');
  const [diaCobro, setDiaCobro] = useState('');
  const [ganaComision, setGanaComision] = useState(false);

  // Comisiones Modal State
  const [showComisionesModal, setShowComisionesModal] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const [comisiones, setComisiones] = useState([]);
  const [selectedCatalogoId, setSelectedCatalogoId] = useState('');
  const [montoComision, setMontoComision] = useState('');

  useEffect(() => {
    loadEmpleados();
  }, []);

  const loadEmpleados = async () => {
    try {
      setIsLoading(true);
      const data = await api.getEmpleados();
      setEmpleados(data);
    } catch (error) {
      showNotification('Error al cargar empleados', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmpleado = async (e) => {
    e.preventDefault();
    try {
      const data = {
        nombre, telefono, rol,
        salario_fijo: parseFloat(salarioFijo) || 0,
        gana_comision: ganaComision,
        dia_cobro: diaCobro ? parseInt(diaCobro) : null
      };

      if (editingEmpleado) {
        await api.updateEmpleado(editingEmpleado.id, data);
        showNotification('Empleado actualizado', 'success');
      } else {
        await api.createEmpleado(data);
        showNotification('Empleado creado', 'success');
      }
      setShowModal(false);
      loadEmpleados();
    } catch (error) {
      showNotification('Error al guardar empleado', 'error');
    }
  };

  const openModal = (emp = null) => {
    setEditingEmpleado(emp);
    setNombre(emp?.nombre || '');
    setTelefono(emp?.telefono || '');
    setRol(emp?.rol || '');
    setSalarioFijo(emp?.salario_fijo || '');
    setDiaCobro(emp?.dia_cobro || '');
    setGanaComision(emp?.gana_comision || false);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar empleado?')) return;
    try {
      await api.deleteEmpleado(id);
      showNotification('Empleado eliminado', 'success');
      loadEmpleados();
    } catch {
      showNotification('Error al eliminar', 'error');
    }
  };

  const openComisionesModal = async (emp) => {
    setSelectedEmpleado(emp);
    setShowComisionesModal(true);
    try {
      const data = await api.getComisiones(emp.id);
      setComisiones(data);
    } catch {
      showNotification('Error al cargar comisiones', 'error');
    }
  };

  const handleAddComision = async () => {
    if (!selectedCatalogoId || !montoComision) return;
    try {
      await api.createComision(selectedEmpleado.id, {
        catalogo_id: selectedCatalogoId,
        monto: parseFloat(montoComision)
      });
      showNotification('Comisión añadida', 'success');
      const data = await api.getComisiones(selectedEmpleado.id);
      setComisiones(data);
      setSelectedCatalogoId('');
      setMontoComision('');
    } catch {
      showNotification('Error al añadir comisión (Posible duplicado)', 'error');
    }
  };

  const handleDeleteComision = async (id) => {
    try {
      await api.deleteComision(id);
      const data = await api.getComisiones(selectedEmpleado.id);
      setComisiones(data);
    } catch {
      showNotification('Error al eliminar', 'error');
    }
  };

  if (!hasPermission('nominas_gestionar')) {
    return <div className="no-permission">No tienes permiso para gestionar nóminas.</div>;
  }

  // Stats para el resumen
  const totalSalariosFijos = empleados.reduce((sum, e) => sum + (e.salario_fijo || 0), 0);
  const conComisionCount = empleados.filter(e => e.gana_comision).length;

  return (
    <div className="payroll-tab animate-fade-in">
      {/* ── Control Header ── */}
      <div className="payroll-header glass-panel">
        <span className="payroll-title">
          <Users size={18} className="payroll-title-icon" />
          Gestión de Nómina y Personal ({empleados.length})
        </span>

        <button className="btn-action-primary" onClick={() => openModal()}>
          <Plus size={16} /> Nuevo Empleado
        </button>
      </div>

      {/* ── Summary Banner ── */}
      <div className="payroll-summary">
        <div className="pay-stat-card">
          <div className="pay-stat-icon purple">
            <Users size={20} />
          </div>
          <div className="pay-stat-info">
            <span className="pay-stat-label">Total Empleados</span>
            <span className="pay-stat-val">{empleados.length}</span>
          </div>
        </div>

        <div className="pay-stat-card">
          <div className="pay-stat-icon green">
            <DollarSign size={20} />
          </div>
          <div className="pay-stat-info">
            <span className="pay-stat-label">Nómina Fija Mensual</span>
            <span className="pay-stat-val">${formatCurrency(totalSalariosFijos)}</span>
          </div>
        </div>

        <div className="pay-stat-card">
          <div className="pay-stat-icon amber">
            <Award size={20} />
          </div>
          <div className="pay-stat-info">
            <span className="pay-stat-label">Personal con Comisión</span>
            <span className="pay-stat-val">{conComisionCount}</span>
          </div>
        </div>
      </div>

      {/* ── Employees Grid ── */}
      {isLoading ? (
        <div className="fin-loading glass-panel">
          <div className="fin-spinner" />
          <span>Cargando plantilla de empleados…</span>
        </div>
      ) : empleados.length === 0 ? (
        <div className="exp-empty-state glass-panel">
          <Users size={40} strokeWidth={1.2} />
          <span>No hay empleados registrados en el sistema.</span>
        </div>
      ) : (
        <div className="empleados-grid">
          {empleados.map(emp => {
            const initial = emp.nombre ? emp.nombre.charAt(0).toUpperCase() : '?';
            return (
              <div key={emp.id} className="empleado-card glass-panel">
                {/* Header card */}
                <div className="emp-card-top">
                  <div className="emp-avatar">{initial}</div>
                  <div className="emp-main-info">
                    <span className="emp-name">{emp.nombre}</span>
                    <span className="emp-role-badge">{emp.rol || 'Sin Puesto'}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="emp-card-details">
                  <div className="emp-detail-row">
                    <span className="emp-detail-label"><Phone size={13} /> Teléfono</span>
                    <span className="emp-detail-value">{emp.telefono || 'N/A'}</span>
                  </div>

                  <div className="emp-detail-row">
                    <span className="emp-detail-label"><DollarSign size={13} /> Salario Fijo</span>
                    <span className="emp-detail-value salary">${formatCurrency(emp.salario_fijo)}</span>
                  </div>

                  <div className="emp-detail-row">
                    <span className="emp-detail-label"><Calendar size={13} /> Día de Cobro</span>
                    <span className="emp-detail-value">{emp.dia_cobro ? `Día ${emp.dia_cobro}` : 'No fijado'}</span>
                  </div>

                  {emp.gana_comision && (
                    <div className="emp-detail-row" style={{ marginTop: '0.2rem' }}>
                      <span className="emp-commission-tag">
                        <Award size={12} /> Comisión activa
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="empleado-actions">
                  <button className="btn-icon" onClick={() => openModal(emp)} title="Editar datos">
                    <Edit2 size={15} />
                  </button>

                  {emp.gana_comision && (
                    <button className="btn-emp-comm" onClick={() => openComisionesModal(emp)}>
                      <DollarSign size={14} /> Comisiones
                    </button>
                  )}

                  <button className="btn-icon danger" onClick={() => handleDelete(emp.id)} title="Eliminar empleado">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Empleado ── */}
      {showModal && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <h2>{editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveEmpleado} className="modal-form">
              <div className="input-group">
                <label>Nombre Completo</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Juan Pérez" required />
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Teléfono</label>
                  <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: 809-555-0101" />
                </div>
                <div className="input-group">
                  <label>Rol / Puesto</label>
                  <input type="text" value={rol} onChange={e => setRol(e.target.value)} placeholder="Ej: Tapicero, Cortador" />
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Salario Fijo (Mensual)</label>
                  <input type="number" value={salarioFijo} onChange={e => setSalarioFijo(e.target.value)} placeholder="0.00" />
                </div>
                <div className="input-group">
                  <label>Día de Cobro (1-31)</label>
                  <input type="number" min="1" max="31" value={diaCobro} onChange={e => setDiaCobro(e.target.value)} placeholder="Ej: 15" />
                </div>
              </div>

              <div className="input-group-checkbox">
                <label>
                  <input type="checkbox" checked={ganaComision} onChange={e => setGanaComision(e.target.checked)} />
                  Gana Comisión por Fabricación
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-action-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-action-primary">Guardar Empleado</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Comisiones ── */}
      {showComisionesModal && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <h2>Comisiones de {selectedEmpleado?.nombre}</h2>
              <button className="btn-icon" onClick={() => setShowComisionesModal(false)}><X size={18} /></button>
            </div>

            <div className="add-comision-form">
              <select value={selectedCatalogoId} onChange={e => setSelectedCatalogoId(e.target.value)}>
                <option value="">Selecciona Mueble del Catálogo...</option>
                {catalogo.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>
                ))}
              </select>
              <input type="number" placeholder="Monto ($)" value={montoComision} onChange={e => setMontoComision(e.target.value)} />
              <button className="btn-action-primary" onClick={handleAddComision}>Añadir</button>
            </div>

            <div className="comisiones-list">
              {comisiones.length === 0 ? (
                <div className="exp-empty-state" style={{ padding: '1.5rem' }}>
                  <span>Sin comisiones configuradas para este empleado.</span>
                </div>
              ) : (
                comisiones.map(com => {
                  const mueble = catalogo.find(c => c.id === com.catalogo_id);
                  return (
                    <div key={com.id} className="comision-item">
                      <span>{mueble?.nombre || 'Mueble'} — <strong>${formatCurrency(com.monto)}</strong></span>
                      <button className="btn-icon danger" onClick={() => handleDeleteComision(com.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-action-secondary" onClick={() => setShowComisionesModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Payroll;
