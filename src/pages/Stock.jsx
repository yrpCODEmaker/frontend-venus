import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Plus, Search, Filter, ShoppingCart, Package, PlusCircle, MinusCircle, X, Image as ImageIcon } from 'lucide-react';
import ProtectedImage from '../components/ProtectedImage';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';
import './Stock.css';

function Stock() {
  const { stock = [], catalogo = [], config = {}, addToCart, addStockItem, adjustStockCount, showNotification, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [failedImages, setFailedImages] = useState({});

  const safeMaterialesBase = config?.materiales || ['Madera Pino', 'Madera Caoba', 'MDF', 'Metal', 'Cristal'];
  const safeTelasOptions = ['Ninguna (Sin Tela)', ...(config?.telas || ['Lino', 'Terciopelo', 'Sintético', 'Cuero', 'Yute'])];
  const safeColoresTela = config?.colores || ['Rojo', 'Azul', 'Verde', 'Gris', 'Beige', 'Negro', 'Blanco'];
  const safeColoresMat = ['None (Natural)', ...safeColoresTela];
  const safeAreas = config?.areas || ['Tapicería', 'Ebanistería'];

  // Form state
  const [catalogoId, setCatalogoId] = useState(catalogo[0]?.id || '');
  const [materialBase, setMaterialBase] = useState(safeMaterialesBase[0]);
  const [colorMaterial, setColorMaterial] = useState(safeColoresMat[0]);
  const [tipoTela, setTipoTela] = useState(safeTelasOptions[0]);
  const [colorTela, setColorTela] = useState(safeColoresTela[0]);
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [precio, setPrecio] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const areasList = ['Todos', ...safeAreas];

  const handleImageError = (id) => {
    setFailedImages(prev => ({ ...prev, [id]: true }));
  };

  // Retorna string legible o null si no hay dato real
  const formatProp = (val) => {
    if (!val) return null;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        const result = parsed.filter(v => v && !String(v).startsWith('Natural') && !String(v).startsWith('None')).join(' · ');
        return result || null;
      }
      if (parsed.base || parsed.material) {
        return (parsed.base || parsed.material) + (parsed.tela ? ` / ${parsed.tela}` : '');
      }
      return null;
    } catch(e) {
      return val || null;
    }
  };

  // Para mostrar todos los valores incluyendo el color natural
  const formatPropFull = (val) => {
    if (!val) return null;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        const result = parsed.filter(Boolean).join(' · ');
        return result || null;
      }
    } catch(e) {}
    return val || null;
  };

  const filteredStock = (stock || []).filter(item => {
    const matchCantidad = (item.cantidad || 0) > 0;
    const matchSearch = (item.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
                        (item.tela || item.color || '').toLowerCase().includes(search.toLowerCase()) ||
                        (item.material || '').toLowerCase().includes(search.toLowerCase());
    const itemAreas = Array.isArray(item.area) ? item.area : [];
    const matchArea = selectedArea === 'Todos' || itemAreas.includes(selectedArea);
    return matchCantidad && matchSearch && matchArea;
  });

  const resetForm = () => {
    setCatalogoId(catalogo[0]?.id || '');
    setMaterialBase(safeMaterialesBase[0]);
    setColorMaterial(safeColoresMat[0]);
    setTipoTela(safeTelasOptions[0]);
    setColorTela(safeColoresTela[0]);
    setDescripcion('');
    setCantidad('1');
    setPrecio(catalogo[0]?.precio_base || '');
    setImageFile(null);
    setImagePreview(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!catalogoId || !precio) {
      showNotification('Por favor selecciona modelo y precio', 'error');
      return;
    }

    const selectedModel = catalogo.find(c => String(c.id) === String(catalogoId));
    
    // Consolidar Material y Tela como arreglos JSON
    let materialArray = [materialBase];
    const matColorStr = colorMaterial && !colorMaterial.startsWith('None') ? colorMaterial : 'Natural (None)';
    materialArray.push(matColorStr);

    let telaArray = null;
    if (tipoTela && !tipoTela.startsWith('Ninguna')) {
      telaArray = [tipoTela];
      if (colorTela) telaArray.push(colorTela);
    }

    const finalMaterial = JSON.stringify(materialArray);
    const finalTela = telaArray ? JSON.stringify(telaArray) : null;

    const success = await addStockItem({
      catalogo_id: catalogoId,
      nombre: selectedModel ? selectedModel.nombre : 'Producto Stock',
      tela: finalTela,
      material: finalMaterial,
      descripcion,
      cantidad: parseInt(cantidad) || 1,
      precio: parseFloat(precio) || 0,
      area: selectedModel ? selectedModel.area : 'Tapicería',
      tipo: selectedModel ? selectedModel.tipo : 'Mueble'
    }, imageFile);

    if (success) {
      handleCloseModal();
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Bar de Filtros con Botón de Acción integrado */}
      <div className="filter-bar glass-panel">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por modelo, color o material..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <div className="filter-group">
          <Filter size={16} />
          <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
            {areasList.map(a => <option key={a} value={a}>Área: {a}</option>)}
          </select>
          <button 
            className="btn-action-primary" 
            onClick={handleOpenModal}
            disabled={!hasPermission('stock_crear')}
            title={!hasPermission('stock_crear') ? 'Sin permiso para registrar stock' : ''}
          >
            <Plus size={18} /> Registrar Stock
          </button>
        </div>
      </div>

      {/* Grid de Stock */}
      <div className="stock-grid">
        {filteredStock.map(item => {
          const hasImage = item.image_url && !failedImages[item.id];
          // Calcular ancho de columna imagen según aspect_ratio real
          const CARD_HEIGHT = 200;
          const parseRatio = (ar) => {
            if (!ar) return null;
            if (typeof ar === 'number') return ar;
            if (typeof ar === 'string' && ar.includes(':')) {
              const [w, h] = ar.split(':').map(Number);
              return (w && h) ? w / h : null;
            }
            const n = parseFloat(ar);
            return isNaN(n) ? null : n;
          };
          const ratio = parseRatio(item.aspect_ratio);
          const imgColStyle = ratio
            ? { flex: `0 0 ${Math.round(CARD_HEIGHT * ratio)}px`, width: `${Math.round(CARD_HEIGHT * ratio)}px` }
            : { flex: '0 0 47%' };
          return (
            <div key={item.id} className="stock-card glass-panel">
              {/* Columna Imagen — ancho calculado por aspect_ratio real */}
              <div className="stock-image-col" style={imgColStyle}>
                {hasImage ? (
                  <ProtectedImage 
                    src={item.image_url} 
                    alt={item.nombre} 
                    onError={() => handleImageError(item.id)} 
                  />
                ) : (
                  <div className="image-placeholder">
                    <ImageIcon size={44} />
                  </div>
                )}
                {Array.isArray(item.area) && item.area.length > 0 ? (
                  item.area.map((a, idx) => (
                    <span key={idx} className="badge-stock-area">{a}</span>
                  ))
                ) : (
                  <span className="badge-stock-area">Stock</span>
                )}
                <div className="quantity-badge">
                  <Package size={12} /> {item.cantidad} disps.
                </div>
              </div>

              {/* Columna Contenido */}
              <div className="stock-body">
                {/* Nombre */}
                <div className="stock-section-name">
                  <h3 className="stock-title">{item.nombre || item.catalogo_nombre || 'Mueble'}</h3>
                </div>

                {/* Info: material, tela, precio, descripción */}
                <div className="stock-section-info">
                  {(() => {
                    const matLabel = formatPropFull(item.material);
                    const telaLabel = formatPropFull(item.tela || item.color);
                    return (
                      <>
                        {matLabel && <p className="stock-info-line"><strong>Material:</strong> {matLabel}</p>}
                        <p className="stock-info-line"><strong>Tela:</strong> {telaLabel || 'Sin Tela'}</p>
                        <p className="stock-info-price">RD: ${formatCurrency(item.precio)}</p>
                        {item.descripcion && <p className="stock-info-desc" title={item.descripcion}>{item.descripcion}</p>}
                      </>
                    );
                  })()}
                </div>

                {/* Botón vender */}
                <div className="stock-section-main">
                  <button 
                    className="btn-card-primary"
                    onClick={() => addToCart(item, true)}
                    disabled={item.cantidad <= 0 || !hasPermission('facturas_emitir')}
                    title={!hasPermission('facturas_emitir') ? 'Sin permiso para vender (facturar)' : ''}
                  >
                    <ShoppingCart size={14} /> {item.cantidad > 0 ? 'Vender Stock' : 'Agotado'}
                  </button>
                </div>
              </div>
            </div>

          );
        })}

        {filteredStock.length === 0 && (
          <div className="empty-state glass-panel">
            <p>No hay artículos de stock registrados con los filtros aplicados.</p>
          </div>
        )}
      </div>

      {/* Modal Registrar Stock renderizado via React Portal */}
      {showModal && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <h2>Registrar Ingreso a Stock</h2>
              <button className="btn-icon" onClick={handleCloseModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveStock} className="modal-form">
              <div className="input-group">
                <label>Seleccionar Modelo del Catálogo</label>
                <select value={catalogoId} onChange={e => {
                  setCatalogoId(e.target.value);
                  const found = catalogo.find(c => String(c.id) === String(e.target.value));
                  if (found) setPrecio(found.precio_base);
                }}>
                  {catalogo.map(c => <option key={c.id} value={c.id}>{c.nombre} (${c.precio_base})</option>)}
                </select>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Material Base</label>
                  <select value={materialBase} onChange={e => setMaterialBase(e.target.value)}>
                    {safeMaterialesBase.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label>Color Material Base</label>
                  <select value={colorMaterial} onChange={e => setColorMaterial(e.target.value)}>
                    {safeColoresMat.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Tipo de Tela</label>
                  <select value={tipoTela} onChange={e => setTipoTela(e.target.value)}>
                    {safeTelasOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label>Color Tela</label>
                  <select 
                    value={colorTela} 
                    onChange={e => setColorTela(e.target.value)}
                    disabled={tipoTela && tipoTela.startsWith('Ninguna')}
                  >
                    {safeColoresTela.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Cantidad Inicial</label>
                  <input 
                    type="number" 
                    value={cantidad} 
                    onChange={e => setCantidad(e.target.value)} 
                    min="1"
                    required 
                  />
                </div>

                <div className="input-group">
                  <label>Precio Venta ($)</label>
                  <input 
                    type="text" 
                    value={formatCurrencyInput(precio)} 
                    onChange={e => setPrecio(parseCurrencyInput(e.target.value))} 
                    placeholder="Ej: 45,000" 
                    required 
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Notas / Descripción de variante</label>
                <input 
                  type="text" 
                  value={descripcion} 
                  onChange={e => setDescripcion(e.target.value)} 
                  placeholder="Ej: Patas doradas, cojines extra" 
                />
              </div>

              <div className="input-group">
                <label>Foto propia de la variante (Opcional - Hereda la del catálogo)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
                  }} 
                />
                {imagePreview && (
                  <div className="preview-box-container">
                    <div className="preview-box">
                      <img src={imagePreview} alt="Preview Stock" />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit" className="btn-action-primary">Guardar en Inventario</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Stock;
