import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Hammer, ReceiptText, Truck, CheckCircle2, PlayCircle, Clock, MapPin, User, Check, ArrowRight, Layers, AlertCircle, Image as ImageIcon } from 'lucide-react';
import ProtectedImage from '../components/ProtectedImage';
import { formatItemJSON } from '../utils/formatters';
import './Production.css';

function Production() {
  const { items = [], facturas = [], envios = [], clientes = [], updateItemStatus, updateEnvioStatus, dispatchInvoice, hasPermission } = useApp();
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'facturas' | 'envios'
  const [statusFilter, setStatusFilter] = useState('Todos');

  // Función para obtener el nombre completo del cliente con múltiples niveles de resolución
  const getClientName = (obj) => {
    if (obj?.cliente_nombre) {
      return `${obj.cliente_nombre} ${obj.cliente_apellido || ''}`.trim();
    }
    if (obj?.cliente?.nombre) {
      return `${obj.cliente.nombre} ${obj.cliente.apellido || ''}`.trim();
    }
    if (obj?.factura_id) {
      const fact = facturas.find(f => String(f.id) === String(obj.factura_id));
      if (fact) {
        if (fact.cliente_nombre) {
          return `${fact.cliente_nombre} ${fact.cliente_apellido || ''}`.trim();
        }
        if (fact.cliente?.nombre) {
          return `${fact.cliente.nombre} ${fact.cliente.apellido || ''}`.trim();
        }
        if (fact.cliente_id) {
          const cli = clientes.find(c => String(c.id) === String(fact.cliente_id));
          if (cli) return `${cli.nombre} ${cli.apellido || ''}`.trim();
        }
      }
    }
    if (obj?.cliente_id) {
      const cli = clientes.find(c => String(c.id) === String(obj.cliente_id));
      if (cli) return `${cli.nombre} ${cli.apellido || ''}`.trim();
    }
    return 'Cliente / Factura Rápida';
  };

  // Solo items de tipo encargo que no esten completados (area de trabajo activa)
  const workItems = (items || []).filter(i => i.tipo === 'encargo' && i.status !== 'completado');

  const pendingItems = workItems.filter(i => i.status === 'pendiente');
  const processingItems = workItems.filter(i => i.status === 'procesando');
  const doneItems = workItems.filter(i => i.status === 'procesado');

  // Solo envíos activos (Pendiente de Envío o En Ruta). Cuando se marca como Entregado, desaparece de esta vista.
  const activeEnvios = (envios || []).filter(e => e.estado !== 'Entregado' && e.estado !== 'entregado' && e.estado !== 'Completado');

  const filteredItems = statusFilter === 'Todos' 
    ? workItems
    : workItems.filter(i => i.status === statusFilter);

  return (
    <div className="page-container animate-fade-in">
      {/* Tarjetas de Estadísticas */}
      <div className="stats-row">
        <div 
          className={`stat-card glass-panel stat-all ${statusFilter === 'Todos' ? 'selected' : ''}`}
          onClick={() => { setActiveTab('items'); setStatusFilter('Todos'); }}
        >
          <div className="stat-icon-num">
            <Layers size={20} className="stat-icon" />
            <span className="stat-number">{items.length}</span>
          </div>
          <span className="stat-label">Todos</span>
        </div>

        <div 
          className={`stat-card glass-panel stat-pending ${statusFilter === 'pendiente' ? 'selected' : ''}`}
          onClick={() => { setActiveTab('items'); setStatusFilter('pendiente'); }}
        >
          <div className="stat-icon-num">
            <AlertCircle size={20} className="stat-icon text-amber" />
            <span className="stat-number text-amber">{pendingItems.length}</span>
          </div>
          <span className="stat-label">Pendientes</span>
        </div>

        <div 
          className={`stat-card glass-panel stat-processing ${statusFilter === 'procesando' ? 'selected' : ''}`}
          onClick={() => { setActiveTab('items'); setStatusFilter('procesando'); }}
        >
          <div className="stat-icon-num">
            <Hammer size={20} className="stat-icon text-blue" />
            <span className="stat-number text-blue">{processingItems.length}</span>
          </div>
          <span className="stat-label">En Fabricación</span>
        </div>

        <div 
          className={`stat-card glass-panel stat-done ${statusFilter === 'procesado' ? 'selected' : ''}`}
          onClick={() => { setActiveTab('items'); setStatusFilter('procesado'); }}
        >
          <div className="stat-icon-num">
            <CheckCircle2 size={20} className="stat-icon text-green" />
            <span className="stat-number text-green">{doneItems.length}</span>
          </div>
          <span className="stat-label">Listos</span>
        </div>

        <div 
          className={`stat-card glass-panel stat-envios ${activeTab === 'envios' ? 'selected' : ''}`}
          onClick={() => setActiveTab('envios')}
        >
          <div className="stat-icon-num">
            <Truck size={20} className="stat-icon text-purple" />
            <span className="stat-number text-purple">{activeEnvios.length}</span>
          </div>
          <span className="stat-label">Envíos Activos</span>
        </div>
      </div>

      {/* Tabs Secundarios */}
        <div className="tab-navigation glass-panel">
        <button 
          className={`tab-button ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          <Hammer size={18} /> Por Ítems Encargados ({filteredItems.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'facturas' ? 'active' : ''}`}
          onClick={() => setActiveTab('facturas')}
        >
          <ReceiptText size={18} /> Por Factura ({facturas.filter(f => (items || []).some(i => String(i.factura_id) === String(f.id) && i.tipo === 'encargo' && i.status !== 'completado')).length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'envios' ? 'active' : ''}`}
          onClick={() => setActiveTab('envios')}
        >
          <Truck size={18} /> Envíos ({activeEnvios.length})
        </button>
      </div>

      {/* VISTA 1: POR ÍTEMS */}
      {activeTab === 'items' && (
        <div className="production-view animate-fade-in">
          <div className="items-list-container">
            {filteredItems.map(item => {
              // El backend devuelve image_url ya resuelta con fallback al catalogo
              const imgUrl = item.image_url;
              const hasValidImg = !!imgUrl;

              return (
                <div key={item.id} className={`production-card glass-panel status-${item.status}`}>
                  <div className="item-main-content">
                    <div className="item-thumbnail-box">
                      {hasValidImg ? (
                        <ProtectedImage 
                          src={imgUrl} 
                          alt={item.nombre}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                          <ImageIcon size={48} />
                        </div>
                      )}
                    </div>

                    <div className="item-info-col">
                      <div className="item-header">
                        <div className="item-title-group">
                          <h3>{item.nombre}</h3>
                          <span className="item-fact-tag">Fact #{item.factura_id}</span>
                        </div>
                        <span className={`status-badge badge-${item.status}`}>
                          {item.status === 'pendiente' && 'Pendiente'}
                          {item.status === 'procesando' && 'En Fabricación'}
                          {item.status === 'procesado' && 'Listo'}
                        </span>
                      </div>

                      <div className="item-details">
                        <span className="chip-tag">Área: <strong>{Array.isArray(item.area) ? item.area.join(', ') : item.area}</strong></span>
                        <span className="chip-tag">Tipo: <strong>{item.tipo_mueble || 'Mueble'}</strong></span>
                        <span>🎨 Color: <strong>{formatItemJSON(item.color)}</strong></span>
                        <span>🧵 Tela/Material: <strong>{formatItemJSON(item.material)}</strong></span>
                        <span><User size={14} /> Cliente: <strong>{getClientName(item)}</strong></span>
                      </div>

                      {item.descripcion && (
                        <div className="item-order-desc">
                          <strong>📝 Detalle del Encargo:</strong> {item.descripcion}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="item-footer">
                    {item.status === 'pendiente' && (
                      <button 
                        className="btn-status-action btn-amber" 
                        onClick={() => updateItemStatus(item.id, 'procesando')}
                        disabled={!hasPermission('fabricacion_modificar_estados')}
                        title={!hasPermission('fabricacion_modificar_estados') ? 'Sin permiso para cambiar estado' : ''}
                      >
                        <PlayCircle size={16} /> Iniciar Fabricación
                      </button>
                    )}
                    {item.status === 'procesando' && (
                      <button 
                        className="btn-status-action btn-green" 
                        onClick={() => updateItemStatus(item.id, 'procesado')}
                        disabled={!hasPermission('fabricacion_modificar_estados')}
                        title={!hasPermission('fabricacion_modificar_estados') ? 'Sin permiso para cambiar estado' : ''}
                      >
                        <CheckCircle2 size={16} /> Marcar como Listo
                      </button>
                    )}
                    {item.status === 'procesado' && (
                      <span className="text-success"><Check size={16} /> Producto terminado y listo en taller</span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="empty-state glass-panel">
                <p>No hay encargos de producción con este estado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: POR FACTURA */}
      {activeTab === 'facturas' && (
        <div className="facturas-work-list animate-fade-in">
          {facturas
            .filter(fact => (items || []).some(
              i => String(i.factura_id) === String(fact.id) && 
                   i.tipo === 'encargo' && 
                   i.status !== 'completado'
            ))
            .map(fact => {
            const factItems = (items || []).filter(i => String(i.factura_id) === String(fact.id) && i.tipo === 'encargo');
            const total = factItems.length || 1;
            const completed = factItems.filter(i => i.status === 'procesado' || i.status === 'completado').length;
            const progressPercent = Math.round((completed / total) * 100);

            return (
              <div key={fact.id} className="factura-progress-card glass-panel">
                <div className="fact-card-header">
                  <div>
                    <h2>Factura #{fact.id}</h2>
                    <p><User size={14} /> {getClientName(fact)}</p>
                  </div>
                  <div className="progress-badge">
                    {completed}/{total} Listos ({progressPercent}%)
                  </div>
                </div>

                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>

                <div className="fact-items-mini-list">
                  {factItems.map(it => (
                    <div key={it.id} className="mini-item-chip">
                      <span className={`dot status-${it.status}`}></span>
                      <span>{it.nombre} ({it.color} / {it.material})</span>
                    </div>
                  ))}
                </div>

                <div className="fact-card-footer">
                  {completed === total && total > 0 ? (
                    <button 
                      className="btn-action-primary" 
                      onClick={() => dispatchInvoice(fact.id)}
                      disabled={!hasPermission('fabricacion_mandar_envio')}
                      title={!hasPermission('fabricacion_mandar_envio') ? 'Sin permiso para despachar envíos' : ''}
                    >
                      <Truck size={16} /> Enviar a Logística / Entregar
                    </button>
                  ) : (
                    <span className="text-muted"><Clock size={14} /> Trabajo en progreso en taller</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA 3: ENVÍOS */}
      {activeTab === 'envios' && (
        <div className="envios-list animate-fade-in">
          {activeEnvios.map(envio => (
            <div key={envio.id} className="envio-card glass-panel">
              <div className="envio-header">
                <div>
                  <h3>Factura #{envio.factura_id}</h3>
                  <p><User size={14} /> {getClientName(envio)}</p>
                </div>
                <span className="address-tag"><MapPin size={14} /> {envio.direccion_entrega}</span>
              </div>

              <div className="pipeline-container">
                <div className={`pipe-step ${envio.estado === 'Pendiente de Envío' ? 'current' : 'completed'}`}>
                  <span>1. En Espera</span>
                </div>
                <ArrowRight size={16} className="pipe-arrow" />
                <div className={`pipe-step ${envio.estado === 'En Ruta' ? 'current' : envio.estado === 'Entregado' ? 'completed' : ''}`}>
                  <span>2. En Ruta</span>
                </div>
                <ArrowRight size={16} className="pipe-arrow" />
                <div className={`pipe-step ${envio.estado === 'Entregado' ? 'completed current' : ''}`}>
                  <span>3. Entregado</span>
                </div>
              </div>

              <div className="envio-actions">
                {envio.estado === 'Pendiente de Envío' && (
                  <button 
                    className="btn-secondary" 
                    onClick={() => updateEnvioStatus(envio.id, 'En Ruta')}
                    disabled={!hasPermission('fabricacion_mandar_envio')}
                    title={!hasPermission('fabricacion_mandar_envio') ? 'Sin permiso para actualizar envío' : ''}
                  >
                    <Truck size={16} /> Enviar en Ruta
                  </button>
                )}
                {envio.estado === 'En Ruta' && (
                  <button 
                    className="btn-action-primary" 
                    onClick={() => updateEnvioStatus(envio.id, 'Entregado')}
                    disabled={!hasPermission('fabricacion_mandar_envio')}
                    title={!hasPermission('fabricacion_mandar_envio') ? 'Sin permiso para actualizar envío' : ''}
                  >
                    <CheckCircle2 size={16} /> Marcar como Entregado
                  </button>
                )}
                {envio.estado === 'Entregado' && (
                  <span className="text-success"><Check size={16} /> Entregado con Garantía activa</span>
                )}
              </div>
            </div>
          ))}

          {activeEnvios.length === 0 && (
            <div className="empty-state glass-panel">
              <p>No hay envíos pendientes ni en ruta en este momento.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Production;
