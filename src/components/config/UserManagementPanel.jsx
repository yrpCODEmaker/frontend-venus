import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Users, Plus, Shield, ShieldOff, Edit, Trash2, X, Check, Eye } from 'lucide-react';

function UserManagementPanel() {
  const { showNotification, user } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', prefix: '' });
  const [permissions, setPermissions] = useState({});
  const [visibility, setVisibility] = useState(''); // Comma separated prefixes

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminUsers();
      setUsers(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (username) => {
    if (username === user?.username) {
      showNotification('No puedes desactivar tu propio usuario', 'error');
      return;
    }
    try {
      await api.toggleAdminUser(username);
      showNotification(`Estado de ${username} actualizado`, 'success');
      loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (username) => {
    if (username === user?.username) {
      showNotification('No puedes eliminar tu propio usuario', 'error');
      return;
    }
    if (!window.confirm(`¿Estás seguro de eliminar a ${username}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteAdminUser(username);
      showNotification(`Usuario ${username} eliminado`, 'success');
      loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const openNewModal = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', prefix: '' });
    setPermissions({});
    setVisibility('');
    setShowModal(true);
  };

  const openEditModal = async (u) => {
    setEditingUser(u);
    setFormData({ username: u.username, password: '', prefix: u.prefix || '' });
    
    if (u.rol !== 'admin') {
      try {
        const perms = await api.getAdminUserPermissions(u.username);
        setPermissions(perms);
        setVisibility((perms.prefijos_visibles || []).join(', '));
      } catch (err) {
        console.error(err);
        setPermissions({});
        setVisibility('');
      }
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update user prefix or password
        if (formData.password || formData.prefix !== editingUser.prefix) {
          const payload = {};
          if (formData.password) payload.password = formData.password;
          if (formData.prefix !== editingUser.prefix) payload.prefix = formData.prefix;
          if (Object.keys(payload).length > 0) {
            await api.updateAdminUser(editingUser.username, payload);
          }
        }
        
        // Update permissions if not admin
        if (editingUser.rol !== 'admin') {
          await api.updateAdminUserPermissions(editingUser.username, permissions);
          
          const prefArray = visibility.split(',').map(s => s.trim()).filter(s => s);
          await api.patchAdminUserDataVisibility(editingUser.username, { prefijos_visibles: prefArray });
        }

        showNotification('Usuario actualizado exitosamente', 'success');
      } else {
        // Create new user
        if (!formData.username || !formData.password) {
          showNotification('Faltan campos obligatorios', 'error');
          return;
        }
        const payload = {
          username: formData.username,
          password: formData.password
        };
        if (formData.prefix && formData.prefix.trim()) {
          payload.prefix = formData.prefix.trim();
        }
        await api.createAdminUser(payload);
        showNotification('Usuario creado exitosamente. Edítalo para asignar permisos.', 'success');
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const togglePermission = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="user-management animate-fade-in">
      <div className="um-header">
        <div>
          <h2>Gestión de Usuarios</h2>
          <p className="text-muted">Administra los accesos y permisos granulares de tu equipo.</p>
        </div>
        <button className="btn-action-primary" onClick={openNewModal}>
          <Plus size={18} /> Nuevo Empleado
        </button>
      </div>

      <div className="um-table-container glass-panel">
        {loading ? (
          <div className="p-4 text-center text-muted">Cargando usuarios...</div>
        ) : (
          <table className="um-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Prefijo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.username}>
                  <td>
                    <strong>{u.username}</strong>
                    {u.username === user?.username && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Tú</span>}
                  </td>
                  <td>{u.rol === 'admin' ? '👑 Admin' : 'Empleado'}</td>
                  <td>{u.prefix ? <span className="chip-tag">{u.prefix}</span> : '-'}</td>
                  <td>
                    <span className={`status-badge ${u.activo ? 'badge-procesado' : 'badge-pendiente'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="btn-icon" 
                      onClick={() => handleToggleActive(u.username)}
                      title={u.activo ? "Desactivar" : "Activar"}
                      disabled={u.username === user?.username}
                    >
                      {u.activo ? <ShieldOff size={16} /> : <Shield size={16} />}
                    </button>
                    <button className="btn-icon" onClick={() => openEditModal(u)} title="Editar permisos/datos">
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn-icon text-red" 
                      onClick={() => handleDelete(u.username)}
                      title="Eliminar usuario"
                      disabled={u.rol === 'admin'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan="5" className="text-center p-4">No hay usuarios registrados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel um-modal animate-fade-in">
            <div className="modal-header">
              <h2>{editingUser ? `Editar Usuario: ${editingUser.username}` : 'Crear Nuevo Usuario'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              {!editingUser && (
                <div className="input-group">
                  <label>Nombre de Usuario (Login)</label>
                  <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                </div>
              )}
              
              <div className="form-row">
                <div className="input-group">
                  <label>{editingUser ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}</label>
                  <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
                </div>
                <div className="input-group">
                  <label>Prefijo (Opcional - Auto-generado)</label>
                  <input 
                    type="text" 
                    value={formData.prefix} 
                    onChange={e => setFormData({ ...formData, prefix: e.target.value })} 
                    placeholder="Ej: Auto / P" 
                  />
                </div>
              </div>

              {editingUser && editingUser.rol !== 'admin' && (
                <div className="permissions-matrix">
                  <h3>Permisos de Acceso</h3>
                  
                  <div className="perm-group">
                    <h4>Facturación</h4>
                    <label><input type="checkbox" checked={!!permissions.facturas_ver} onChange={() => togglePermission('facturas_ver')} /> Ver Historial</label>
                    <label><input type="checkbox" checked={!!permissions.facturas_emitir} onChange={() => togglePermission('facturas_emitir')} /> Emitir y Abonar</label>
                    <label><input type="checkbox" checked={!!permissions.facturas_modificar} onChange={() => togglePermission('facturas_modificar')} /> Modificar/Eliminar</label>
                  </div>

                  <div className="perm-group">
                    <h4>Producción y Envíos</h4>
                    <label><input type="checkbox" checked={!!permissions.fabricacion_ver_estados} onChange={() => togglePermission('fabricacion_ver_estados')} /> Ver Trabajos</label>
                    <label><input type="checkbox" checked={!!permissions.fabricacion_modificar_estados} onChange={() => togglePermission('fabricacion_modificar_estados')} /> Cambiar Estados</label>
                    <label><input type="checkbox" checked={!!permissions.fabricacion_mandar_envio} onChange={() => togglePermission('fabricacion_mandar_envio')} /> Despachar Envíos</label>
                  </div>

                  <div className="perm-group">
                    <h4>Inventario (Stock)</h4>
                    <label><input type="checkbox" checked={!!permissions.stock_crear} onChange={() => togglePermission('stock_crear')} /> Registrar Ingreso</label>
                    <label><input type="checkbox" checked={!!permissions.stock_modificar} onChange={() => togglePermission('stock_modificar')} /> Modificar Cantidades</label>
                    <label><input type="checkbox" checked={!!permissions.stock_eliminar} onChange={() => togglePermission('stock_eliminar')} /> Eliminar</label>
                  </div>

                  <div className="perm-group">
                    <h4>Catálogo (Modelos Base)</h4>
                    <label><input type="checkbox" checked={!!permissions.catalogo_crear} onChange={() => togglePermission('catalogo_crear')} /> Crear Modelos</label>
                  </div>
                  
                  <div className="perm-group">
                    <h4>Clientes</h4>
                    <label><input type="checkbox" checked={!!permissions.clientes_crear} onChange={() => togglePermission('clientes_crear')} /> Crear Clientes</label>
                  </div>

                  <div className="perm-group full-width">
                    <h4>Visibilidad de Datos</h4>
                    <label>
                      <input type="checkbox" checked={!!permissions.puede_ver_datos_de_otros} onChange={() => togglePermission('puede_ver_datos_de_otros')} /> 
                      Ver facturas/datos generados por todos los usuarios
                    </label>
                    {!permissions.puede_ver_datos_de_otros && (
                      <div className="input-group mt-2">
                        <label>Prefijos visibles adicionales (separados por coma)</label>
                        <input type="text" value={visibility} onChange={e => setVisibility(e.target.value)} placeholder="Ej: TR, SN" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {editingUser && editingUser.rol === 'admin' && (
                <div className="admin-notice">
                  <Shield size={32} />
                  <p>Este usuario es un administrador y tiene acceso total al sistema.</p>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-action-primary"><Check size={16} /> Guardar Usuario</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default UserManagementPanel;
