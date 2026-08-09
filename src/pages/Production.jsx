import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Hammer, ReceiptText, Truck, CheckCircle2, PlayCircle, Clock, MapPin, User, Check, ArrowRight, Layers, AlertCircle, Image as ImageIcon, X, Filter, SlidersHorizontal, RefreshCw } from 'lucide-react';
import ProtectedImage from '../components/ProtectedImage';
import { extractImageUrl, getApiBaseUrl } from '../services/api';
import { formatItemJSON, formatArea, formatMaterialAndTela, cleanFieldValue } from '../utils/formatters';
import './Production.css';

function Production() {
  const { items = [], facturas = [], envios = [], clientes = [], updateItemStatus, updateEnvioStatus, dispatchInvoice, hasPermission } = useApp();
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'facturas' | 'envios'
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [areaFilter, setAreaFilter] = useState('Todos');
  const [tipoFilter, setTipoFilter] = useState('Todos');
  const [lightboxImage, setLightboxImage] = useState(null);

  const getSupportImagesList = (item) => {
    if (!item) return [];
    const backendOrigin = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
    let raw = item.imagenes_apoyo || item.imagenes_apoyo_previews || item.support_images;
    if (!raw) return [];
    let list = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
        else if (typeof parsed === 'string') list = [parsed];
      } catch {
        if (raw.trim()) list = [raw.trim()];
      }
    }
    if (list.length === 0 && Array.isArray(item.imagenes_apoyo_previews)) {
      list = item.imagenes_apoyo_previews;
    }
    return list
      .filter(img => typeof img === 'string' && img.trim() !== '')
      .map(img => {
        if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('blob:') || img.startsWith('data:')) return img;
        return `${backendOrigin}/${img.replace(/^\/+/, '')}`;
      });
  };

  // Formatear los 4 parámetros principales (Área, Tipo, Material + Color, Tela + Color)
  const getFormattedParams = (item) => {
    const area = formatArea(item.area);
    const tipo = item.tipo_mueble || (item.tipo !== 'encargo' && item.tipo !== 'stock' ? item.tipo : null);

    const parseValueAndColor = (valStr) => {
      const clean = cleanFieldValue(valStr);
      if (!clean) return { value: '', color: '' };
      if (clean.includes(',')) {
        const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
        return { value: parts[0] || '', color: parts[1] || '' };
      }
      return { value: clean, color: '' };
    };

    const matParsed = parseValueAndColor(item.material);
    const telaParsed = parseValueAndColor(item.tela);
    const standaloneColor = cleanFieldValue(item.color);

    let matColor = matParsed.color;
    let telaColor = telaParsed.color;

    if (standaloneColor) {
      if (!matColor && matParsed.value && !telaParsed.value) {
        matColor = standaloneColor;
      } else if (!telaColor && telaParsed.value) {
        telaColor = standaloneColor;
      } else if (!matColor && matParsed.value) {
        matColor = standaloneColor;
      }
    }

    return {
      area,
      tipo,
      material: matParsed.value,
      materialColor: matColor,
      tela: telaParsed.value,
      telaColor: telaColor,
    };
  };

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

  // Áreas únicas presentes en el trabajo activo
  const availableAreas = Array.from(new Set(
    workItems.flatMap(i => {
      if (!i.area) return [];
      if (Array.isArray(i.area)) return i.area;
      if (typeof i.area === 'string') {
        try {
          const parsed = JSON.parse(i.area);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        return i.area.split(',').map(a => a.trim()).filter(Boolean);
      }
      return [];
    })
  )).sort();

  // Tipos de elemento (mueble) únicos presentes en el trabajo activo
  const availableTipos = Array.from(new Set(
    workItems.map(i => i.tipo_mueble || i.tipo).filter(Boolean)
  )).sort();

  const pendingItems = workItems.filter(i => i.status === 'pendiente');
  const processingItems = workItems.filter(i => i.status === 'procesando');
  const doneItems = workItems.filter(i => i.status === 'procesado');

  // Solo envíos activos (Pendiente de Envío o En Ruta)
  const activeEnvios = (envios || []).filter(e => e.estado !== 'Entregado' && e.estado !== 'entregado' && e.estado !== 'Completado');

  const filteredItems = workItems.filter(item => {
    // 1. Filtro por Estado
    if (statusFilter !== 'Todos' && item.status !== statusFilter) {
      return false;
    }

    // 2. Filtro por Área de trabajo
    if (areaFilter !== 'Todos') {
      const areaStr = Array.isArray(item.area) ? item.area.join(', ') : String(item.area || '');
      if (!areaStr.toLowerCase().includes(areaFilter.toLowerCase())) {
        return false;
      }
    }

    // 3. Filtro por Tipo de Elemento
    if (tipoFilter !== 'Todos') {
      const itemTipo = item.tipo_mueble || item.tipo || '';
      if (itemTipo.toLowerCase() !== tipoFilter.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

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
      </div>

      {/* Barra de Filtros por Área y Tipo de Elemento */}
      <div className="production-filters-bar glass-panel">
        <div className="filter-group">
          <Filter size={16} className="filter-icon" />
          <label>Área de Trabajo:</label>
          <select 
            value={areaFilter} 
            onChange={(e) => setAreaFilter(e.target.value)}
            className="filter-select"
          >
            <option value="Todos">Todas las Áreas</option>
            {availableAreas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <SlidersHorizontal size={16} className="filter-icon" />
          <label>Tipo de Elemento:</label>
          <select 
            value={tipoFilter} 
            onChange={(e) => setTipoFilter(e.target.value)}
            className="filter-select"
          >
            <option value="Todos">Todos los Tipos</option>
            {availableTipos.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>

        {(areaFilter !== 'Todos' || tipoFilter !== 'Todos') && (
          <button 
            className="btn-reset-filters"
            onClick={() => { setAreaFilter('Todos'); setTipoFilter('Todos'); }}
          >
            <RefreshCw size={12} /> Limpiar Filtros
          </button>
        )}
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
              // Resolver imagen del ítem (con fallback inteligente a image_id o catálogo)
              const imgUrl = extractImageUrl(item) || item.image_url;
              const hasValidImg = !!imgUrl;

              return (
                <div key={item.id} className={`production-card glass-panel status-${item.status}`}>
                  <div className="item-main-content">
                    <div 
                      className="item-thumbnail-box clickable" 
                      onClick={() => hasValidImg && setLightboxImage({ url: imgUrl, title: `${item.nombre} (Imagen Principal)` })}
                      title={hasValidImg ? "Haz clic para ver imagen principal en grande" : ""}
                    >
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

                      {(() => {
                        const p = getFormattedParams(item);
                        return (
                          <div className="item-specs-grid">
                            {p.area && (
                              <div className="spec-badge">
                                <span className="spec-label">Área:</span>
                                <span className="spec-value">{p.area}</span>
                              </div>
                            )}
                            {p.tipo && (
                              <div className="spec-badge">
                                <span className="spec-label">Tipo:</span>
                                <span className="spec-value">{p.tipo}</span>
                              </div>
                            )}
                            {p.material && (
                              <div className="spec-badge spec-material">
                                <span className="spec-label">Material:</span>
                                <span className="spec-value">{p.material}</span>
                                {p.materialColor && (
                                  <>
                                    <span className="spec-sublabel">Color:</span>
                                    <span className="spec-subvalue">{p.materialColor}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {p.tela && (
                              <div className="spec-badge spec-tela">
                                <span className="spec-label">Tela:</span>
                                <span className="spec-value">{p.tela}</span>
                                {p.telaColor && (
                                  <>
                                    <span className="spec-sublabel">Color:</span>
                                    <span className="spec-subvalue">{p.telaColor}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {getClientName(item) && (
                              <div className="spec-badge spec-client">
                                <User size={13} className="spec-icon" />
                                <span className="spec-label">Cliente:</span>
                                <span className="spec-value">{getClientName(item)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {item.descripcion && (
                        <div className="item-order-desc">
                          <strong>📝 Detalle del Encargo:</strong> {item.descripcion}
                        </div>
                      )}

                      {/* Imágenes de Apoyo (Texturas, Patrones, Pintura) */}
                      {(() => {
                        const supportImgs = getSupportImagesList(item);
                        if (supportImgs.length === 0) return null;
                        return (
                          <div className="support-images-container">
                            <span className="support-images-title">🎨 Imágenes de Apoyo (Texturas / Patrones):</span>
                            <div className="support-images-row">
                              {supportImgs.map((url, idx) => (
                                <div 
                                  key={idx} 
                                  className="support-image-item" 
                                  onClick={() => setLightboxImage({ url, title: `${item.nombre} — Imagen de Apoyo #${idx + 1}` })}
                                  title="Haz clic para ampliar imagen de apoyo"
                                >
                                  <ProtectedImage src={url} alt={`Apoyo ${idx + 1}`} />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
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
              const inProgress = factItems.filter(i => i.status === 'procesando').length;
              const progressPercent = Math.round((completed / total) * 100);

              // Determinar estado general de la factura
              let factStatus = 'pendiente';
              if (completed === total && total > 0) {
                factStatus = 'listo';
              } else if (inProgress > 0 || completed > 0) {
                factStatus = 'procesando';
              }

              return (
                <div key={fact.id} className={`factura-progress-card glass-panel fact-card-status-${factStatus}`}>
                  <div className="fact-card-header">
                    <div className="fact-title-info">
                      <div className="fact-id-badge-row">
                        <h2>Factura #{fact.id}</h2>
                        <span className={`status-badge-fact status-badge-${factStatus}`}>
                          {factStatus === 'pendiente' && 'Pendiente de Fabricación'}
                          {factStatus === 'procesando' && 'En Proceso'}
                          {factStatus === 'listo' && 'Listo'}
                        </span>
                      </div>
                      <p className="fact-client-name"><User size={14} /> {getClientName(fact)}</p>
                    </div>

                    <div className="progress-badge">
                      {completed}/{total} Listos ({progressPercent}%)
                    </div>
                  </div>

                  <div className="progress-track">
                    <div className={`progress-fill progress-fill-${factStatus}`} style={{ width: `${progressPercent}%` }}></div>
                  </div>

                  {/* Lista ultra básica y limpia de elementos */}
                  <div className="fact-items-mini-list">
                    {factItems.map(it => (
                      <div key={it.id} className={`mini-item-chip status-${it.status}`}>
                        <span className={`dot status-${it.status}`}></span>
                        <span className="mini-item-name">
                          <strong>{it.nombre}</strong>
                          <small style={{ opacity: 0.8, marginLeft: '0.3rem' }}>
                            ({it.status === 'pendiente' ? 'Pendiente' : it.status === 'procesando' ? 'En Proceso' : 'Listo'})
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="fact-card-footer">
                    {factStatus === 'listo' ? (
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

          {facturas.filter(fact => (items || []).some(
            i => String(i.factura_id) === String(fact.id) && i.tipo === 'encargo' && i.status !== 'completado'
          )).length === 0 && (
            <div className="empty-state glass-panel">
              <p>No hay facturas con encargos activos en este momento.</p>
            </div>
          )}
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

      {/* Lightbox / Visualizador de Imagen en Grande */}
      {lightboxImage && createPortal(
        <div className="lightbox-overlay animate-fade-in" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="lightbox-header">
              <h3>{lightboxImage.title || 'Visualizador de Imagen'}</h3>
              <button className="btn-close-lightbox" onClick={() => setLightboxImage(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="lightbox-body">
              <ProtectedImage src={lightboxImage.url} alt="Imagen Ampliada" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Production;
