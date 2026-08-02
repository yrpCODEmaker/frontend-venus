import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from '../components/InvoicePDF';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, formatPhoneInput, formatItemJSON } from '../utils/formatters';
import { ShoppingCart, ReceiptText, Plus, Trash2, UserPlus, DollarSign, Search, Eye, CheckCircle, Truck, X, UserCheck, Zap, Loader2 } from 'lucide-react';
import './Invoices.css';

function Invoices() {
  const { 
    facturas, clientes, cart, removeFromCart, updateCartQuantity, clearCart,
    createInvoice, dispatchInvoice, addPago, declararPerdida, perdonarDeuda, createCliente, showNotification, hasPermission, config, items 
  } = useApp();

  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'list'
  const [search, setSearch] = useState('');

  // Selección de cliente interactiva
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [isSelectingClient, setIsSelectingClient] = useState(false);
  const [clientSearchText, setClientSearchText] = useState('');
  
  // Estado para detalles expandidos de item en modal
  const [expandedItemId, setExpandedItemId] = useState(null);

  // Facturación Rápida (Casilla y 3 campos)
  const [isFastBilling, setIsFastBilling] = useState(false);
  const [fastNombre, setFastNombre] = useState('');
  const [fastApellido, setFastApellido] = useState('');
  const [fastTelefono, setFastTelefono] = useState('');

  // Form para Nueva Factura
  const [montoPagado, setMontoPagado] = useState('');
  const [entregaDomicilio, setEntregaDomicilio] = useState(false);
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [garantiaHasta, setGarantiaHasta] = useState('1 Año');

  // Modal de Crear Cliente Rápido
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [newClienteNombre, setNewClienteNombre] = useState('');
  const [newClienteApellido, setNewClienteApellido] = useState('');
  const [newClienteTelefono, setNewClienteTelefono] = useState('');
  const [newClienteDomicilio, setNewClienteDomicilio] = useState('');

  // Modal de Detalle de Factura
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [notaAbono, setNotaAbono] = useState('');
  const totalCart = (cart || []).reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const restanteCart = Math.max(0, totalCart - (parseFloat(montoPagado) || 0));

  const getFullFactura = (factura) => {
    if (!factura) return null;
    let parsedIds = [];
    if (typeof factura.items_id === 'string') {
      if (factura.items_id.startsWith('[')) {
        try { parsedIds = JSON.parse(factura.items_id); } catch { parsedIds = []; }
      } else {
        parsedIds = factura.items_id.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(factura.items_id)) {
      parsedIds = factura.items_id;
    }
    const invoiceItems = (items || []).filter(it => parsedIds.includes(it.id) || parsedIds.includes(String(it.id)));
    return { ...factura, items: invoiceItems };
  };

  const fullSelectedFactura = getFullFactura(selectedFactura);

  const selectedClientObj = (clientes || []).find(c => String(c.id) === String(selectedClienteId));

  // --- Búsqueda y Filtrado de Clientes (con Debouncing y Backend) ---
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('');
  const [searchedClients, setSearchedClients] = useState(null);
  const [isSearchingClients, setIsSearchingClients] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedClientSearch(clientSearchText);
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [clientSearchText]);

  useEffect(() => {
    if (!debouncedClientSearch) {
      setSearchedClients(null);
      return;
    }
    const fetchClients = async () => {
      setIsSearchingClients(true);
      try {
        const results = await api.getClientes({ search: debouncedClientSearch, limit: 50 });
        setSearchedClients(results);
      } catch (err) {
        console.error("Error buscando clientes:", err);
      } finally {
        setIsSearchingClients(false);
      }
    };
    fetchClients();
  }, [debouncedClientSearch]);

  const displayedClients = searchedClients !== null 
    ? searchedClients 
    : (clientes || []).slice(0, 50);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      showNotification('El carrito está vacío. Agrega productos desde Catálogo o Stock.', 'error');
      return;
    }

    // Validación de cliente obligatoria (segun venus_workflow.md)
    if (!isFastBilling && !selectedClienteId) {
      showNotification(
        'Debes seleccionar un cliente registrado o activar la casilla "Facturación Rápida" para continuar.',
        'error'
      );
      return;
    }

    if (isFastBilling && !fastNombre.trim()) {
      showNotification('Por favor ingresa al menos el Nombre para Facturación Rápida.', 'error');
      return;
    }

    // Formatear ítems según esquema estricto FastAPI (tipo y subtotal requeridos)
    const formattedItems = cart.map(item => ({
      stock_id: item.isStock ? String(item.id) : null,
      catalogo_id: item.catalogo_id ? String(item.catalogo_id) : (item.id ? String(item.id) : null),
      nombre: item.nombre || 'Producto',
      cantidad: parseInt(item.cantidad) || 1,
      tipo: item.isStock ? 'stock' : 'encargo',
      subtotal: parseFloat(item.precio * item.cantidad) || 0,
      tela: item.tela || null,
      material: item.material || 'Por definir',
      descripcion: item.descripcion || '',
      area: Array.isArray(item.area) ? item.area.join(', ') : (item.area || 'Tapicería'),
      tipo_mueble: item.tipo_mueble || item.tipo || 'Mueble'
    }));

    // Estructura del cliente segun ClienteRapidoSchema del backend:
    // Siempre {nombre, apellido, telefono} con strings (nunca null)
    const clientPayload = isFastBilling ? {
      nombre: fastNombre.trim(),
      apellido: fastApellido.trim() || '',
      telefono: fastTelefono.trim() || ''
    } : null;  // Para factura normal, el cliente se identifica por cliente_id

    const invoicePayload = {
      cliente_id: (!isFastBilling && selectedClienteId) ? String(selectedClienteId) : null,
      cliente: clientPayload,
      total: parseFloat(totalCart) || 0,
      monto_pagado: parseFloat(montoPagado) || 0,
      items: formattedItems,
      entrega_domicilio: Boolean(entregaDomicilio),
      direccion_entrega: direccionEntrega || (selectedClientObj ? selectedClientObj.domicilio : ''),
      garantia_hasta: garantiaHasta || '1 Año',
      facturacion_rapida: isFastBilling ? 1 : 0
    };

    const success = await createInvoice(invoicePayload);
    if (success) {
      setSelectedClienteId('');
      setFastNombre('');
      setFastApellido('');
      setFastTelefono('');
      setIsFastBilling(false);
      setMontoPagado('');
      setEntregaDomicilio(false);
      setDireccionEntrega('');
      setActiveTab('list');
    }
  };


  const handleCreateFastClient = async (e) => {
    e.preventDefault();
    if (!newClienteNombre) return;
    const newClientPayload = {
      nombre: newClienteNombre,
      apellido: newClienteApellido || '',
      telefono: newClienteTelefono || '',
      domicilio: newClienteDomicilio || '',
      email: '',
      prioridad: false
    };

    const created = await createCliente(newClientPayload);
    if (created && (created.id || created._id)) {
      const createdId = created.id || created._id;
      setSelectedClienteId(createdId);
      setIsFastBilling(false);
      if (created.domicilio) {
        setDireccionEntrega(created.domicilio);
        setEntregaDomicilio(true);
      }
      showNotification(`Cliente "${created.nombre}" creado y seleccionado para esta factura`, 'success');
    }

    setNewClienteNombre('');
    setNewClienteApellido('');
    setNewClienteTelefono('');
    setNewClienteDomicilio('');
    setShowClienteModal(false);
  };

  const handleAddAbono = async (e) => {
    e.preventDefault();
    if (!selectedFactura || !montoAbono) return;
    await addPago(selectedFactura.id, montoAbono, notaAbono);
    setMontoAbono('');
    setNotaAbono('');
  };

  const handleDeclararPerdida = async () => {
    if (!selectedFactura) return;
    const confirm = window.confirm('¿Estás seguro de declarar esta factura como pérdida? Esta acción marcará que el cliente no pagará el resto.');
    if (!confirm) return;
    await declararPerdida(selectedFactura.id);
  };

  const handlePerdonarDeuda = async () => {
    if (!selectedFactura) return;
    const confirm = window.confirm('¿Estás seguro de perdonar la deuda restante de esta factura?');
    if (!confirm) return;
    await perdonarDeuda(selectedFactura.id);
  };

  const filteredFacturas = (facturas || []).filter(f => {
    const matchSearch = (f.id || '').toLowerCase().includes(search.toLowerCase()) ||
                        (f.cliente_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
                        (f.cliente_apellido || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="page-container animate-fade-in">
      {/* Navegación por pestañas */}
      <div className="tab-navigation glass-panel">
        <button 
          className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          <ShoppingCart size={18} /> Nueva Factura ({cart.length} ítems)
        </button>
        <button 
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <ReceiptText size={18} /> Historial de Facturas ({facturas.length})
        </button>
      </div>

      {/* PESTAÑA 1: NUEVA FACTURA / POS */}
      {activeTab === 'new' && (
        <div className="pos-container">
          <div className="pos-cart-panel glass-panel animate-fade-in">
            <h2>Ítems en Factura</h2>
            {cart.length === 0 ? (
              <div className="cart-empty">
                <ShoppingCart size={48} className="text-muted" />
                <p>El carrito está vacío.</p>
                <small>Ve al Catálogo o Stock para agregar ítems.</small>
              </div>
            ) : (
              <div className="cart-items-list">
                {cart.map((item, index) => (
                  <div key={index} className="cart-item-row">
                    <div className="cart-item-info">
                      <h4>{item.nombre}</h4>
                      <p>{item.tela ? `Tela: ${formatItemJSON(item.tela)} | ` : ''}Material: {formatItemJSON(item.material)}</p>
                      <span className="cart-item-price">${formatCurrency(item.precio)} c/u</span>
                    </div>

                    <div className="cart-item-actions">
                      <div className="qty-controls">
                        <button type="button" onClick={(e) => { e.stopPropagation(); updateCartQuantity(index, -1); }}>-</button>
                        <span>{item.cantidad}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); updateCartQuantity(index, 1); }}>+</button>
                      </div>
                      <span className="item-subtotal">${formatCurrency(item.precio * item.cantidad)}</span>
                      <button className="btn-remove" onClick={() => removeFromCart(index)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {cart.length > 0 && (
              <button className="btn-clear-cart" onClick={clearCart}>
                Vaciar Carrito
              </button>
            )}
          </div>

          <div className="pos-checkout-panel glass-panel animate-fade-in">
            <h2>Detalles del Cliente y Pago</h2>
            <form onSubmit={handleCreateInvoice} className="checkout-form">

              {/* SECCIÓN DE SELECCIÓN DE CLIENTE (CON BOTÓN Y PICKER BUSCABLE) */}
              {!isFastBilling && (
                <div className="input-group client-picker-box">
                  <div className="label-row">
                    <label>Cliente de Factura</label>
                    <button type="button" className="btn-link" onClick={() => setShowClienteModal(true)}>
                      <UserPlus size={14} /> Nuevo Cliente
                    </button>
                  </div>

                  {selectedClientObj ? (
                    <div className="client-selected-card animate-fade-in">
                      <div className="client-card-info">
                        <h4><UserCheck size={16} /> {selectedClientObj.nombre} {selectedClientObj.apellido}</h4>
                        <p>📞 {selectedClientObj.telefono || 'Sin teléfono'} {selectedClientObj.domicilio ? `| 🏠 ${selectedClientObj.domicilio}` : ''}</p>
                      </div>
                      <button type="button" className="btn-change-client" onClick={() => { setSelectedClienteId(''); setIsSelectingClient(true); }}>
                        Cambiar
                      </button>
                    </div>
                  ) : isSelectingClient ? (
                    <div className="client-picker-dropdown animate-fade-in">
                      <div className="client-picker-search">
                        <Search size={14} className="text-muted" />
                        <input 
                          type="text" 
                          placeholder="Buscar cliente por nombre o teléfono..." 
                          value={clientSearchText}
                          onChange={e => setClientSearchText(e.target.value)}
                          autoFocus
                        />
                      </div>

                      <div className="client-scroll-list">
                        {isSearchingClients && (
                          <div className="flex justify-center items-center p-4 text-gray-500">
                            <Loader2 size={20} className="animate-spin mr-2" />
                            Buscando...
                          </div>
                        )}
                        {!isSearchingClients && displayedClients.map(c => (
                          <div 
                            key={c.id} 
                            className="client-scroll-item"
                            onClick={() => {
                              setSelectedClienteId(c.id);
                              setIsSelectingClient(false);
                              if (c.domicilio) {
                                setDireccionEntrega(c.domicilio);
                              }
                            }}
                          >
                            <div>
                              <div className="client-item-name">{c.nombre} {c.apellido}</div>
                              <div className="client-item-phone">{c.telefono || 'Sin teléfono'}</div>
                            </div>
                            <span className="btn-pick-client">Seleccionar</span>
                          </div>
                        ))}

                        {!isSearchingClients && displayedClients.length === 0 && (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No se encontraron clientes registrados.
                          </div>
                        )}
                      </div>

                      <button type="button" className="btn-cancel-picker" onClick={() => setIsSelectingClient(false)}>
                        Cancelar Selección
                      </button>
                    </div>
                  ) : (
                    <div className="client-picker-actions">
                      <button 
                        type="button" 
                        className="btn-select-client-trigger"
                        onClick={() => setIsSelectingClient(true)}
                      >
                        <Search size={16} /> Seleccionar Cliente Registrado
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CASILLA FACTURACIÓN RÁPIDA */}
              <div className="checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={isFastBilling} 
                    onChange={e => {
                      setIsFastBilling(e.target.checked);
                      if (e.target.checked) {
                        setSelectedClienteId('');
                        setIsSelectingClient(false);
                      }
                    }} 
                  />
                  <strong>⚡ Facturación Rápida (Cliente Ocasional)</strong>
                </label>
              </div>

              {/* CAMPOS DE LLENADO DE FACTURACIÓN RÁPIDA (NOMBRE, APELLIDO, TELÉFONO) */}
              {isFastBilling && (
                <div className="fast-billing-fields animate-fade-in">
                  <div className="fast-billing-header">
                    <Zap size={14} /> Datos Rápidos del Cliente
                  </div>
                  
                  <div className="input-group">
                    <label>Nombre del Cliente *</label>
                    <input 
                      type="text" 
                      value={fastNombre} 
                      onChange={e => setFastNombre(e.target.value)} 
                      placeholder="Ej: Juan"
                      required={isFastBilling}
                    />
                  </div>

                  <div className="form-row">
                    <div className="input-group">
                      <label>Apellido</label>
                      <input 
                        type="text" 
                        value={fastApellido} 
                        onChange={e => setFastApellido(e.target.value)} 
                        placeholder="Ej: Pérez"
                      />
                    </div>

                    <div className="input-group">
                      <label>Número Telefónico</label>
                      <input 
                        type="text" 
                        value={fastTelefono} 
                        onChange={e => setFastTelefono(formatPhoneInput(e.target.value))} 
                        placeholder="Ej: 809-555-0000"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="input-group">
                <label>Garantía</label>
                <select value={garantiaHasta} onChange={e => setGarantiaHasta(e.target.value)}>
                  <option value="1 Año">1 Año de Garantía</option>
                  <option value="6 Meses">6 Meses de Garantía</option>
                  <option value="Sin Garantía">Sin Garantía</option>
                </select>
              </div>

              <div className="checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={entregaDomicilio} 
                    onChange={e => setEntregaDomicilio(e.target.checked)} 
                  />
                  Requiere Entrega a Domicilio
                </label>
              </div>

              {entregaDomicilio && (
                <div className="input-group animate-fade-in">
                  <label>Dirección de Entrega</label>
                  <input 
                    type="text" 
                    value={direccionEntrega} 
                    onChange={e => setDireccionEntrega(e.target.value)} 
                    placeholder="Ej: Av. Churchill #105"
                    required
                  />
                </div>
              )}

              <div className="checkout-totals">
                <div className="total-row">
                  <span>Monto Total</span>
                  <span className="total-amount">${formatCurrency(totalCart)}</span>
                </div>

                <div className="input-group">
                  <label>Abono / Pago Inicial ($)</label>
                  <input 
                    type="text" 
                    value={formatCurrencyInput(montoPagado)} 
                    onChange={e => setMontoPagado(parseCurrencyInput(e.target.value))} 
                    placeholder="0" 
                  />
                </div>

                <div className="total-row rest">
                  <span>Balance Pendiente</span>
                  <span className="rest-amount">${formatCurrency(restanteCart)}</span>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-action-primary btn-emit" 
                disabled={cart.length === 0 || !hasPermission('facturas_emitir')}
                title={!hasPermission('facturas_emitir') ? 'No tienes permiso para emitir facturas' : ''}
              >
                <DollarSign size={18} /> Emitir Factura
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE FACTURAS */}
      {activeTab === 'list' && (
        <div className="facturas-history animate-fade-in">
          <div className="filter-bar glass-panel">
            <div className="search-box">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Buscar factura por Folio o Cliente..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
          </div>

          <div className="facturas-table-container glass-panel">
            <table className="facturas-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Balance</th>
                  <th>Garantía</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredFacturas.map(fact => {
                  const pendiente = Math.max(0, (fact.total || 0) - (fact.monto_pagado || 0));
                  return (
                    <tr key={fact.id}>
                      <td><strong>#{fact.id}</strong></td>
                      <td>{fact.cliente_nombre} {fact.cliente_apellido}</td>
                      <td>${formatCurrency(fact.total)}</td>
                      <td className="text-success">${formatCurrency(fact.monto_pagado)}</td>
                      <td className={pendiente > 0 ? "text-amber" : "text-muted"}>${formatCurrency(pendiente)}</td>
                      <td><span className="garantia-badge">{fact.garantia_hasta || '1 Año'}</span></td>
                      <td>
                        <button className="btn-table-action" onClick={() => setSelectedFactura(fact)}>
                          <Eye size={16} /> Ver / Abonar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredFacturas.length === 0 && (
              <div className="empty-state">
                <p>No hay facturas registradas con esos criterios.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nuevo Cliente Rápido via React Portal */}
      {showClienteModal && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <h2>Registrar Nuevo Cliente</h2>
              <button className="btn-icon" onClick={() => setShowClienteModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateFastClient} className="modal-form">
              <div className="form-row">
                <div className="input-group">
                  <label>Nombre</label>
                  <input type="text" value={newClienteNombre} onChange={e => setNewClienteNombre(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Apellido</label>
                  <input type="text" value={newClienteApellido} onChange={e => setNewClienteApellido(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label>Teléfono</label>
                <input type="text" value={newClienteTelefono} onChange={e => setNewClienteTelefono(formatPhoneInput(e.target.value))} />
              </div>
              <div className="input-group">
                <label>Domicilio</label>
                <input type="text" value={newClienteDomicilio} onChange={e => setNewClienteDomicilio(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowClienteModal(false)}>Cancelar</button>
                <button type="submit" className="btn-action-primary">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Detalle de Factura / Abono via React Portal */}
      {fullSelectedFactura && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2>Factura #{fullSelectedFactura.id}</h2>
                
                <PDFDownloadLink 
                  document={<InvoicePDF factura={fullSelectedFactura} companyInfo={config?.company_info} />} 
                  fileName={`Factura_Venus_${fullSelectedFactura.id}.pdf`}
                  className="btn-action-primary"
                  style={{ textDecoration: 'none', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  {({ loading }) => (loading ? 'Generando PDF...' : 'Descargar PDF')}
                </PDFDownloadLink>
              </div>
              <button className="btn-icon" onClick={() => setSelectedFactura(null)}><X size={20} /></button>
            </div>

            <div className="factura-modal-body">
              <p><strong>Cliente:</strong> {fullSelectedFactura.cliente_nombre} {fullSelectedFactura.cliente_apellido}</p>
              
              <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Artículos:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  {fullSelectedFactura.items && fullSelectedFactura.items.length > 0 ? (
                    fullSelectedFactura.items.map(it => (
                      <div key={it.id} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <div 
                          style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: '0.25rem 0' }}
                          onClick={() => setExpandedItemId(expandedItemId === it.id ? null : it.id)}
                        >
                          <div>
                            <strong>{it.cantidad}x {it.nombre}</strong> <br/>
                            <small style={{ color: 'var(--text-secondary)' }}>Haz clic para ver detalles</small>
                          </div>
                          <div style={{ fontWeight: 600 }}>${formatCurrency(it.subtotal)}</div>
                        </div>
                        
                        {expandedItemId === it.id && (
                          <div className="item-detail-accordion" style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary-color)' }}>
                            <p style={{ margin: '0 0 0.25rem 0' }}><strong>Descripción:</strong> {it.descripcion || 'Sin descripción'}</p>
                            <p style={{ margin: '0 0 0.25rem 0' }}><strong>Área / Tipo:</strong> {Array.isArray(it.area) ? it.area.join(', ') : it.area} / {it.tipo_mueble || it.tipo}</p>
                            {it.tela && <p style={{ margin: '0 0 0.25rem 0' }}><strong>Tela:</strong> {formatItemJSON(it.tela)}</p>}
                            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Material:</strong> {formatItemJSON(it.material)}</p>
                            
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr', gap: '0.25rem' }}>
                              <span><strong>Creado:</strong> {it.created_at ? new Date(it.created_at).toLocaleDateString() : 'N/A'}</span>
                              <span><strong>En Producción:</strong> {it.fecha_procesando ? new Date(it.fecha_procesando).toLocaleDateString() : 'Aún no'}</span>
                              <span><strong>Terminado:</strong> {it.fecha_procesado ? new Date(it.fecha_procesado).toLocaleDateString() : 'Aún no'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No hay artículos disponibles o aún no se han cargado.</p>
                  )}
                </div>
              </div>

              <p><strong>Total Factura:</strong> ${formatCurrency(fullSelectedFactura.total)}</p>
              <p><strong>Total Abonado:</strong> ${formatCurrency(fullSelectedFactura.monto_pagado)}</p>
              <p><strong>Balance Pendiente:</strong> ${formatCurrency(Math.max(0, (fullSelectedFactura.total || 0) - (fullSelectedFactura.monto_pagado || 0)))}</p>

              {fullSelectedFactura.declarado_perdida === 1 && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-sm)', border: '1px solid #fca5a5' }}>
                  <strong>⚠️ Factura Declarada como Pérdida</strong> (Cliente inactivo/desaparecido)
                </div>
              )}

              {fullSelectedFactura.declarado_perdonado === 1 && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac' }}>
                  <strong>✅ Deuda Perdonada</strong> (Saldo restante cubierto internamente)
                </div>
              )}

              {!fullSelectedFactura.declarado_perdida && !fullSelectedFactura.declarado_perdonado && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  {hasPermission('facturas_declarar_perdida') && Math.max(0, (fullSelectedFactura.total || 0) - (fullSelectedFactura.monto_pagado || 0)) > 0 && (
                    <button type="button" className="btn-action-secondary" onClick={handleDeclararPerdida} style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}>
                      Declarar Pérdida
                    </button>
                  )}
                  {hasPermission('facturas_perdonar_deuda') && Math.max(0, (fullSelectedFactura.total || 0) - (fullSelectedFactura.monto_pagado || 0)) > 0 && (
                    <button type="button" className="btn-action-secondary" onClick={handlePerdonarDeuda} style={{ color: '#15803d', borderColor: '#15803d' }}>
                      Perdonar Deuda
                    </button>
                  )}
                </div>
              )}

              {!fullSelectedFactura.declarado_perdida && !fullSelectedFactura.declarado_perdonado && (
                <form onSubmit={handleAddAbono} className="abono-form" style={{ marginTop: '1rem' }}>
                  <h4>Registrar Nuevo Abono</h4>
                  <div className="input-group">
                    <label>Monto a Abonar ($)</label>
                    <input 
                      type="text" 
                      value={formatCurrencyInput(montoAbono)} 
                      onChange={e => setMontoAbono(parseCurrencyInput(e.target.value))} 
                      placeholder="Ej: 5,000" 
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label>Nota / Método</label>
                    <input 
                      type="text" 
                      value={notaAbono} 
                      onChange={e => setNotaAbono(e.target.value)} 
                      placeholder="Ej: Efectivo / Transferencia" 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn-action-primary"
                    disabled={!hasPermission('facturas_emitir')}
                    title={!hasPermission('facturas_emitir') ? 'No tienes permiso para registrar abonos' : ''}
                  >
                    <DollarSign size={16} /> Guardar Abono
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Invoices;
