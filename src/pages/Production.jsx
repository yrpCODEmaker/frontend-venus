import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Hammer, ReceiptText, Truck, CheckCircle2, PlayCircle, Clock, MapPin, User, Check, ArrowRight, Layers, AlertCircle, Image as ImageIcon, X, Filter, SlidersHorizontal, RefreshCw, HelpCircle, LayoutGrid, Grid2x2, Grid3x3 } from 'lucide-react';
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
  const [detailModalItem, setDetailModalItem] = useState(null); // Item para el modal de info oculta (?)

  // Densidad de grid (Por Ítems): 3 columnas (default), 4 ó 5
  const [gridCols, setGridCols] = useState(() => {
    const saved = localStorage.getItem('venus_production_grid_cols');
    const n = parseInt(saved, 10);
    return n >= 3 && n <= 5 ? n : 3;
  });
  const setGrid = (cols) => {
    setGridCols(cols);
    localStorage.setItem('venus_production_grid_cols', String(cols));
  };

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

  // Función para renderizar la tarjeta de un ítem individual
  const renderItemCard = (item) => {
    const imgUrl = extractImageUrl(item) || item.image_url;
    const hasValidImg = !!imgUrl;
    const supportImgs = getSupportImagesList(item).slice(0, 3);
    const p = getFormattedParams(item);

    return (
      <div key={item.id} className={`prod-card glass-panel status-${item.status}`}>
        {/* Imagen principal — izquierda, 42% ancho */}
        <div
          className="prod-card-img"
          onClick={() => hasValidImg && setLightboxImage({ url: imgUrl, title: `${item.nombre} (Imagen Principal)` })}
          title={hasValidImg ? 'Ver imagen en grande' : ''}
          style={{ cursor: hasValidImg ? 'pointer' : 'default' }}
        >
          {hasValidImg ? (
            <ProtectedImage src={imgUrl} alt={item.nombre} />
          ) : (
            <div className="prod-card-no-img"><ImageIcon size={36} /></div>
          )}
          {/* Badge de estado superpuesto sobre la imagen */}
          <span className={`prod-status-badge badge-${item.status}`}>
            {item.status === 'pendiente' && 'Pendiente'}
            {item.status === 'procesando' && 'Fab.'}
            {item.status === 'procesado' && 'Listo'}
          </span>
        </div>

        {/* Contenido derecho */}
        <div className="prod-card-body">
          {/* Nombre del producto */}
          <div className="prod-card-header-block">
            <h3 className="prod-card-name">{item.nombre}</h3>
          </div>

          {/* Parámetros (solo si no son null) */}
          <div className="prod-card-params-block">
            {p.material && (
              <p className="prod-param-line">
                <span className="prod-param-label">Material:</span> {p.material}
                {p.materialColor && <span className="prod-param-color"> · {p.materialColor}</span>}
              </p>
            )}
            {p.tela && (
              <p className="prod-param-line">
                <span className="prod-param-label">Tela:</span> {p.tela}
                {p.telaColor && <span className="prod-param-color"> · {p.telaColor}</span>}
              </p>
            )}
            {item.descripcion && (
              <p className="prod-param-desc" title={item.descripcion}>{item.descripcion}</p>
            )}
          </div>

          {/* Fila inferior: miniaturas + botón ? */}
          <div className="prod-card-thumbs-block">
            <div className="prod-ref-thumbs">
              {supportImgs.map((url, idx) => (
                <div
                  key={idx}
                  className="prod-ref-thumb"
                  onClick={() => setLightboxImage({ url, title: `${item.nombre} — Referencia #${idx + 1}` })}
                  title="Ver imagen de referencia"
                >
                  <ProtectedImage src={url} alt={`Ref ${idx + 1}`} />
                </div>
              ))}
              {/* Placeholders vacíos hasta completar 3 cuadros */}
              {Array.from({ length: Math.max(0, 3 - supportImgs.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="prod-ref-thumb prod-ref-empty" />
              ))}
              {/* Botón ? — abre modal con info oculta */}
              <button
                className="prod-ref-thumb prod-info-btn"
                onClick={() => setDetailModalItem(item)}
                title="Ver información completa del encargo"
              >
                <HelpCircle size={18} />
              </button>
            </div>
          </div>

          {/* Botón de acción de estado */}
          <div className="prod-card-action-block">
            {item.status === 'pendiente' && (
              <button
                className="btn-action-full btn-amber-full"
                onClick={() => updateItemStatus(item.id, 'procesando')}
                disabled={!hasPermission('fabricacion_modificar_estados')}
              >
                Iniciar fabricacion
              </button>
            )}
            {item.status === 'procesando' && (
              <button
                className="btn-action-full btn-green-full"
                onClick={() => updateItemStatus(item.id, 'procesado')}
                disabled={!hasPermission('fabricacion_modificar_estados')}
              >
                Marcar como Listo
              </button>
            )}
            {item.status === 'procesado' && (
              <div className="action-full-text text-success">
                Listo en taller
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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

        {/* Botones densidad de grid (solo visible en tab items) */}
        {activeTab === 'items' && (
          <div className="grid-density-toggle" style={{ marginLeft: 'auto' }}>
            <button className={`grid-density-btn${gridCols === 3 ? ' active' : ''}`} onClick={() => setGrid(3)} title="3 por fila">
              <LayoutGrid size={15} />
            </button>
            <button className={`grid-density-btn${gridCols === 4 ? ' active' : ''}`} onClick={() => setGrid(4)} title="4 por fila">
              <Grid2x2 size={15} />
            </button>
            <button className={`grid-density-btn${gridCols === 5 ? ' active' : ''}`} onClick={() => setGrid(5)} title="5 por fila">
              <Grid3x3 size={15} />
            </button>
          </div>
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

      {activeTab === 'items' && (
        <div className="production-view animate-fade-in">
          {/* Grid de tarjetas estilo catálogo */}
          <div className="production-items-grid" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
            {filteredItems.map(item => renderItemCard(item))}

            {filteredItems.length === 0 && (
              <div className="empty-state glass-panel" style={{ gridColumn: '1 / -1' }}>
                <p>No hay encargos de producción con este estado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Información Completa del Encargo (botón ?) */}
      {detailModalItem && createPortal(
        <div className="modal-overlay" onClick={() => setDetailModalItem(null)}>
          <div className="modal-content glass-panel animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>{detailModalItem.nombre}</h2>
              <button className="btn-icon" onClick={() => setDetailModalItem(null)}><X size={20} /></button>
            </div>
            <div className="modal-form" style={{ gap: '0.75rem' }}>
              {detailModalItem.factura_id && (
                <p><strong>Factura ID:</strong> #{detailModalItem.factura_id}</p>
              )}
              {getClientName(detailModalItem) && (
                <p><strong>Cliente:</strong> {getClientName(detailModalItem)}</p>
              )}
              {(() => { const p = getFormattedParams(detailModalItem); return (
                <>
                  {p.tipo && <p><strong>Tipo:</strong> {p.tipo}</p>}
                  {p.area && <p><strong>Área:</strong> {p.area}</p>}
                  {p.material && <p><strong>Material:</strong> {p.material}{p.materialColor ? ` · ${p.materialColor}` : ''}</p>}
                  {p.tela && <p><strong>Tela:</strong> {p.tela}{p.telaColor ? ` · ${p.telaColor}` : ''}</p>}
                </>
              ); })()}
              {detailModalItem.descripcion && (
                <p><strong>Descripción:</strong> {detailModalItem.descripcion}</p>
              )}
              {/* Todas las imágenes de apoyo */}
              {getSupportImagesList(detailModalItem).length > 0 && (
                <div>
                  <p><strong>Imágenes de apoyo:</strong></p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    {getSupportImagesList(detailModalItem).map((url, idx) => (
                      <div
                        key={idx}
                        style={{ width: 70, height: 70, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--color-border)' }}
                        onClick={() => { setDetailModalItem(null); setLightboxImage({ url, title: `${detailModalItem.nombre} — Apoyo #${idx + 1}` }); }}
                      >
                        <ProtectedImage src={url} alt={`Apoyo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
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

                  {/* Elementos mostrados con diseño de tarjeta completa */}
                  <div className="production-items-grid" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)`, marginTop: '1rem', marginBottom: '1rem' }}>
                    {factItems.map(it => renderItemCard(it))}
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
