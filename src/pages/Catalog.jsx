import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Plus, Search, Filter, ShoppingCart, Image as ImageIcon, X, Trash2, SlidersHorizontal, Pencil, PackageSearch, LayoutGrid, Grid2x2, Grid3x3 } from 'lucide-react';
import ProtectedImage from '../components/ProtectedImage';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';
import './Catalog.css';

function Catalog() {
  const { catalogo = [], config = {}, addToCart, addCatalogItem, updateCatalogItem, deleteCatalogItem, showNotification, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('Todos');
  const [selectedTipo, setSelectedTipo] = useState('Todos');
  const [failedImages, setFailedImages] = useState({});

  // Densidad de grid: 3 columnas (default), 4 ó 5. Se guarda en localStorage.
  const [gridCols, setGridCols] = useState(() => {
    const saved = localStorage.getItem('venus_catalog_grid_cols');
    const n = parseInt(saved, 10);
    return n >= 3 && n <= 5 ? n : 3;
  });
  const setGrid = (cols) => {
    setGridCols(cols);
    localStorage.setItem('venus_catalog_grid_cols', String(cols));
  };

  // Modal Nuevo Modelo al Catálogo
  const [showModal, setShowModal] = useState(false);
  // Listas configuradas dinámicamente desde la BD
  const safeAreas = config?.areas || ['Tapicería', 'Ebanistería', 'Pintura', 'Costura'];
  const safeTipos = config?.tipos || ['Sofá', 'Cama', 'Comedor', 'Mesa', 'Sillón'];
  const safeMaterialesBase = ['Ninguno', ...(config?.materiales || ['Madera Pino', 'Madera Caoba', 'MDF', 'Metal', 'Cristal']).filter(m => m.toLowerCase() !== 'ninguno')];
  const safeTelasOptions = ['Ninguno', ...(config?.telas || ['Lino', 'Terciopelo', 'Sintético', 'Cuero', 'Yute']).filter(t => t.toLowerCase() !== 'ninguno' && t.toLowerCase() !== 'ninguna (sin tela)')];
  const safeColoresTela = ['Ninguno', ...(config?.colores || ['Rojo', 'Azul', 'Verde', 'Gris', 'Beige', 'Negro', 'Blanco']).filter(c => c.toLowerCase() !== 'ninguno')];
  const safeColoresMat = safeColoresTela;

  // Form state Modelo al Catálogo (Creación o Edición Versionada)
  const [editingModelId, setEditingModelId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [selectedAreas, setSelectedAreas] = useState([safeAreas[0] || 'Tapicería']);
  const [tipo, setTipo] = useState(safeTipos[0] || 'Sofá');
  const [precioBase, setPrecioBase] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Modal Personalización de Encargo
  const [selectedModel, setSelectedModel] = useState(null);
  const [orderMaterial, setOrderMaterial] = useState('');
  const [orderMaterialColor, setOrderMaterialColor] = useState('Ninguno');
  const [orderTela, setOrderTela] = useState('');
  const [orderTelaColor, setOrderTelaColor] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderDesc, setOrderDesc] = useState('');
  const [orderQty, setOrderQty] = useState('1');
  const [orderImageFile, setOrderImageFile] = useState(null);
  const [orderImagePreview, setOrderImagePreview] = useState(null);
  const [supportImagesFiles, setSupportImagesFiles] = useState([]);
  const [supportImagesPreviews, setSupportImagesPreviews] = useState([]);

  const areasList = ['Todos', ...safeAreas];
  const tiposList = ['Todos', ...safeTipos];

  const handleImageError = (id) => {
    setFailedImages(prev => ({ ...prev, [id]: true }));
  };

  const filteredCatalogo = (catalogo || []).filter(item => {
    const matchSearch = item.nombre?.toLowerCase().includes(search.toLowerCase());
    const itemAreas = Array.isArray(item.area) ? item.area : [];
    const matchArea = selectedArea === 'Todos' || itemAreas.includes(selectedArea);
    const matchTipo = selectedTipo === 'Todos' || item.tipo === selectedTipo;
    return matchSearch && matchArea && matchTipo;
  });

  const resetNewModelForm = () => {
    setEditingModelId(null);
    setNombre('');
    setPrecioBase('');
    setImageFile(null);
    setImagePreview(null);
    setSelectedAreas([safeAreas[0] || 'Tapicería']);
    setTipo(safeTipos[0] || 'Sofá');
  };

  const handleOpenNewModelModal = () => {
    resetNewModelForm();
    setShowModal(true);
  };

  const handleOpenEditModelModal = (model) => {
    setEditingModelId(model.id);
    setNombre(model.nombre || '');
    setTipo(model.tipo || safeTipos[0] || 'Sofá');
    setPrecioBase(model.precio_base !== undefined ? model.precio_base.toString() : '');
    
    // Parsear múltiples áreas de la string del modelo (ej. "Ebanistería, Tapicería")
    const modelAreas = Array.isArray(model.area) && model.area.length > 0 ? model.area : [safeAreas[0] || 'Tapicería'];
    setSelectedAreas(modelAreas);
    
    setImageFile(null);
    setImagePreview(model.image_url || null);
    setShowModal(true);
  };

  const handleCloseNewModelModal = () => {
    resetNewModelForm();
    setShowModal(false);
  };

  const handleOpenOrderModal = (model) => {
    setSelectedModel(model);
    setOrderMaterial(safeMaterialesBase[1] || safeMaterialesBase[0] || 'Ninguno');
    setOrderMaterialColor('Ninguno');
    setOrderTela(safeTelasOptions[1] || safeTelasOptions[0] || 'Ninguno');
    setOrderTelaColor('Ninguno');
    setOrderPrice(model.precio_base !== undefined ? model.precio_base.toString() : '');
    setOrderDesc('');
    setOrderQty('1');
    setOrderImageFile(null);
    setOrderImagePreview(null);
    setSupportImagesFiles([]);
    setSupportImagesPreviews([]);
  };

  const handleCloseOrderModal = () => {
    setSelectedModel(null);
  };

  const handleOrderImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setOrderImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setOrderImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSupportImagesChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSupportImagesFiles(prev => [...prev, ...files]);
      files.forEach(f => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setSupportImagesPreviews(prev => [...prev, ev.target.result]);
        };
        reader.readAsDataURL(f);
      });
    }
  };

  const handleRemoveSupportImage = (index) => {
    setSupportImagesFiles(prev => prev.filter((_, i) => i !== index));
    setSupportImagesPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveCatalog = async (e) => {
    e.preventDefault();
    if (!nombre || !precioBase) {
      showNotification('Por favor completa nombre y precio base', 'error');
      return;
    }
    if (selectedAreas.length === 0) {
      showNotification('Selecciona al menos una área de fabricación', 'error');
      return;
    }

    const payload = {
      nombre,
      area: selectedAreas,
      tipo,
      precio_base: parseFloat(precioBase) || 0
    };

    let success = false;
    if (editingModelId) {
      success = await updateCatalogItem(editingModelId, payload, imageFile);
    } else {
      success = await addCatalogItem(payload, imageFile);
    }

    if (success) {
      handleCloseNewModelModal();
    }
  };

  const handleDeleteModel = async () => {
    if (!editingModelId) return;
    const confirm = window.confirm("¿Estás seguro de que deseas eliminar este modelo de forma lógica?");
    if (confirm) {
      const success = await deleteCatalogItem(editingModelId);
      if (success) {
        handleCloseNewModelModal();
      }
    }
  };

  const handleConfirmOrder = (e) => {
    e.preventDefault();
    if (!selectedModel) return;

    const isMatNinguno = !orderMaterial || orderMaterial.toLowerCase() === 'ninguno';
    const isMatColorNinguno = !orderMaterialColor || orderMaterialColor.toLowerCase() === 'ninguno';

    let finalMaterial = null;
    if (!isMatNinguno) {
      const matArray = [orderMaterial];
      if (!isMatColorNinguno) {
        matArray.push(orderMaterialColor);
      }
      finalMaterial = JSON.stringify(matArray);
    }

    const isTelaNinguno = !orderTela || orderTela.toLowerCase().startsWith('ningun');
    const isTelaColorNinguno = !orderTelaColor || orderTelaColor.toLowerCase() === 'ninguno';

    let finalTela = null;
    if (!isTelaNinguno) {
      const telaArray = [orderTela];
      if (!isTelaColorNinguno) {
        telaArray.push(orderTelaColor);
      }
      finalTela = JSON.stringify(telaArray);
    }

    const finalPrice = parseFloat(orderPrice) || selectedModel.precio_base || 0;

    addToCart({
      ...selectedModel,
      material: finalMaterial,
      tela: finalTela,
      precio: finalPrice,
      precio_base: finalPrice,
      descripcion: orderDesc,
      cantidad: parseInt(orderQty) || 1,
      image_preview: orderImagePreview || selectedModel.image_url || '',
      image_file: orderImageFile,
      imagenes_apoyo_files: supportImagesFiles,
      imagenes_apoyo_previews: supportImagesPreviews
    }, false);

    handleCloseOrderModal();
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Encabezado del Módulo */}
      <div className="module-header glass-panel">
        <h1>
          <PackageSearch size={22} className="module-header-icon" />
          Catálogo de Productos
        </h1>
      </div>

      {/* Bar de Filtros con Botón de Acción integrado */}
      <div className="filter-bar glass-panel">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por modelo..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <div className="filter-group">
          <Filter size={16} />
          <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
            {areasList.map(a => <option key={a} value={a}>Área: {a}</option>)}
          </select>
          <select value={selectedTipo} onChange={e => setSelectedTipo(e.target.value)}>
            {tiposList.map(t => <option key={t} value={t}>Tipo: {t}</option>)}
          </select>

          {/* Botones de densidad de grid */}
          <div className="grid-density-toggle">
            <button
              className={`grid-density-btn${gridCols === 3 ? ' active' : ''}`}
              onClick={() => setGrid(3)}
              title="3 por fila (vista grande)"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`grid-density-btn${gridCols === 4 ? ' active' : ''}`}
              onClick={() => setGrid(4)}
              title="4 por fila"
            >
              <Grid2x2 size={16} />
            </button>
            <button
              className={`grid-density-btn${gridCols === 5 ? ' active' : ''}`}
              onClick={() => setGrid(5)}
              title="5 por fila (vista compacta)"
            >
              <Grid3x3 size={16} />
            </button>
          </div>

          <button 
            className="btn-action-primary" 
            onClick={handleOpenNewModelModal}
            disabled={!hasPermission('catalogo_crear')}
            title={!hasPermission('catalogo_crear') ? 'Sin permiso para crear modelos' : ''}
          >
            <Plus size={18} /> Nuevo Modelo Base
          </button>
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="catalog-grid" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
        {filteredCatalogo.map(item => {
          const hasImage = item.image_url && !failedImages[item.id];
          const itemAreasList = Array.isArray(item.area) && item.area.length > 0 ? item.area : ['General'];
          // Calcular ancho de columna imagen: alto_tarjeta(200px) × ratio_aspecto
          // El contenedor se ajusta a la imagen real → sin recorte, sin barras
          return (
            <div key={item.id} className="catalog-card glass-panel">
              {/* Columna Imagen — 42% del ancho del card, escala proporcional */}
              <div className="card-image-col">
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
                <div className="area-badges-container">
                  {itemAreasList.map((a, idx) => (
                    <span key={idx} className="badge-area">{a}</span>
                  ))}
                </div>
              </div>

              {/* Columna Contenido */}
              <div className="card-body">
                {/* Sección 1: Nombre */}
                <div className="card-section-name">
                  <h3 className="card-title">{item.nombre}</h3>
                </div>

                {/* Sección 2: Tipo y Precio */}
                <div className="card-section-info">
                  <p className="card-subtitle">Tipo: {item.tipo}</p>
                  <div className="card-price-row">
                    <span className="price-label">RD:</span>
                    <span className="price-value">${formatCurrency(item.precio_base)}</span>
                  </div>
                </div>

                {/* Sección 3: Editar */}
                <div className="card-section-edit">
                  <button
                    className="btn-card-secondary"
                    onClick={() => handleOpenEditModelModal(item)}
                    disabled={!hasPermission('catalogo_modificar')}
                    title={!hasPermission('catalogo_modificar') ? 'Sin permiso para modificar' : 'Editar modelo'}
                  >
                    <Pencil size={14} /> Editar Parámetros
                  </button>
                </div>

                {/* Sección 4: Personalizar Encargo */}
                <div className="card-section-main">
                  <button 
                    className="btn-card-primary"
                    onClick={() => handleOpenOrderModal(item)}
                    disabled={!hasPermission('facturas_emitir')}
                    title={!hasPermission('facturas_emitir') ? 'Sin permiso para encargar/facturar' : ''}
                  >
                    <SlidersHorizontal size={14} /> Personalizar Encargo
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredCatalogo.length === 0 && (
          <div className="empty-state glass-panel">
            <p>No se encontraron modelos en el catálogo.</p>
          </div>
        )}
      </div>

      {/* Modal 1: Nuevo / Editar Modelo Base al Catálogo */}
      {showModal && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <h2>{editingModelId ? 'Editar Modelo del Catálogo (Nueva Versión)' : 'Agregar Modelo Base al Catálogo'}</h2>
              <button className="btn-icon" onClick={handleCloseNewModelModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveCatalog} className="modal-form">
              <div className="input-group">
                <label>Nombre del Modelo</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={e => setNombre(e.target.value)} 
                  placeholder="Ej: Sofá Cama Ejecutivo" 
                  required 
                />
              </div>

              <div className="input-group">
                <label>Áreas de Fabricación (Selecciona una o varias)</label>
                <div className="checkbox-group-grid">
                  {safeAreas.map(a => {
                    const isChecked = selectedAreas.includes(a);
                    return (
                      <label key={a} className="checkbox-chip">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAreas([...selectedAreas, a]);
                            } else {
                              setSelectedAreas(selectedAreas.filter(x => x !== a));
                            }
                          }}
                        />
                        <span>{a}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Tipo de Mueble</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)}>
                    {safeTipos.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label>Precio Base ($)</label>
                  <input 
                    type="text" 
                    value={formatCurrencyInput(precioBase)} 
                    onChange={e => setPrecioBase(parseCurrencyInput(e.target.value))} 
                    placeholder="Ej: 45,000" 
                    required 
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Imagen de Catálogo (.jpeg, .png, etc.)</label>
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
                      <img src={imagePreview} alt="Preview" />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  {editingModelId && hasPermission('catalogo_eliminar') && (
                    <button type="button" className="btn-danger" onClick={handleDeleteModel} style={{ backgroundColor: '#dc3545', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Eliminar Modelo</button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={handleCloseNewModelModal}>Cancelar</button>
                  <button type="submit" className="btn-action-primary">Guardar Modelo</button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 2: Personalizar Encargo para Taller/Producción */}
      {selectedModel && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <div>
                <h2>Personalizar Encargo</h2>
                <p style={{ color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                  Modelo: {selectedModel.nombre} (Precio Base: ${formatCurrency(selectedModel.precio_base)})
                </p>
              </div>
              <button className="btn-icon" onClick={handleCloseOrderModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleConfirmOrder} className="modal-form">
              {/* FILA 1: MATERIAL Y COLOR DE MATERIAL */}
              <div className="form-row">
                <div className="input-group">
                  <label>Material Base</label>
                  <select value={orderMaterial} onChange={e => setOrderMaterial(e.target.value)}>
                    {safeMaterialesBase.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label>Color del Material Base</label>
                  <select 
                    value={orderMaterialColor} 
                    onChange={e => setOrderMaterialColor(e.target.value)}
                    disabled={!orderMaterial || orderMaterial.toLowerCase() === 'ninguno'}
                  >
                    {safeColoresMat.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* FILA 2: TIPO DE TELA Y COLOR DE TELA */}
              <div className="form-row">
                <div className="input-group">
                  <label>Tipo de Tela</label>
                  <select value={orderTela} onChange={e => setOrderTela(e.target.value)}>
                    {safeTelasOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label>Color de la Tela</label>
                  <select 
                    value={orderTelaColor} 
                    onChange={e => setOrderTelaColor(e.target.value)}
                    disabled={!orderTela || orderTela.toLowerCase().startsWith('ningun')}
                  >
                    {safeColoresTela.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* FILA 3: PRECIO PERSONALIZADO Y CANTIDAD */}
              <div className="form-row">
                <div className="input-group">
                  <label>Precio Personalizado ($)</label>
                  <input 
                    type="text" 
                    value={formatCurrencyInput(orderPrice)} 
                    onChange={e => setOrderPrice(parseCurrencyInput(e.target.value))} 
                    placeholder="Ingrese precio..." 
                    required 
                  />
                  <small style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                    Pre-escrito con precio base (${formatCurrency(selectedModel.precio_base)}). Puedes modificarlo según el material/tela.
                  </small>
                </div>

                <div className="input-group">
                  <label>Cantidad</label>
                  <input 
                    type="number" 
                    value={orderQty} 
                    onChange={e => setOrderQty(e.target.value)} 
                    min="1" 
                    required 
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Descripción / Especificaciones del Encargo</label>
                <textarea 
                  value={orderDesc} 
                  onChange={e => setOrderDesc(e.target.value)} 
                  placeholder="Ej: Patas de madera nogal, costura reforzada acanalada, cliente requiere 2 cojines adicionales."
                  rows="3"
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-dark)',
                    padding: '0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div className="input-group">
                <label>Imagen Principal de Referencia (Reemplaza foto del catálogo en Taller)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleOrderImageChange} 
                />
                {orderImagePreview && (
                  <div className="preview-box-container">
                    <div className="preview-box">
                      <img src={orderImagePreview} alt="Referencia Encargo" />
                    </div>
                    <button type="button" className="btn-remove-image" onClick={() => { setOrderImageFile(null); setOrderImagePreview(null); }}>
                      <Trash2 size={14} /> Eliminar foto principal
                    </button>
                  </div>
                )}
              </div>

              <div className="input-group">
                <label>Imágenes de Apoyo (Texturas, Patrones, Pintura - Múltiples fotos)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={handleSupportImagesChange} 
                />
                {supportImagesPreviews.length > 0 && (
                  <div className="support-previews-grid">
                    {supportImagesPreviews.map((prev, idx) => (
                      <div key={idx} className="support-preview-item">
                        <img src={prev} alt={`Apoyo ${idx + 1}`} />
                        <button 
                          type="button" 
                          className="btn-remove-support-img" 
                          onClick={() => handleRemoveSupportImage(idx)}
                          title="Eliminar foto de apoyo"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseOrderModal}>Cancelar</button>
                <button type="submit" className="btn-action-primary">
                  <ShoppingCart size={18} /> Agregar Encargo al Carrito
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Catalog;
