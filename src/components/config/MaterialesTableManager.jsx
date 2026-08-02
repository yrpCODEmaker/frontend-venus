import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2, Tag, Palette, RefreshCw, Layers } from 'lucide-react';
import './MaterialesTableManager.css';

export default function MaterialesTableManager() {
  const { showNotification } = useApp();
  const [materialesList, setMaterialesList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form para crear nueva fila/categoría
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoria, setNewCategoria] = useState('');
  const [newElementosInput, setNewElementosInput] = useState('');
  const [newColorInput, setNewColorInput] = useState('');

  // Input temporal por fila para añadir elementos
  const [tempElemInput, setTempElemInput] = useState({});
  // Input temporal por fila para añadir color
  const [tempColorInput, setTempColorInput] = useState({});

  const loadMateriales = async () => {
    setLoading(true);
    try {
      const data = await api.getMateriales();
      setMaterialesList(Array.isArray(data) ? data : []);
    } catch (err) {
      showNotification('Error al cargar la tabla de materiales', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMateriales();
  }, []);

  const handleCreateRow = async (e) => {
    e.preventDefault();
    if (!newCategoria.trim()) {
      showNotification('Debes ingresar un nombre de categoría', 'error');
      return;
    }

    const elementosArr = newElementosInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    let colorVal = null;
    if (newColorInput.trim()) {
      const colorArr = newColorInput.split(',').map(s => s.trim()).filter(Boolean);
      colorVal = colorArr.length > 1 ? colorArr : colorArr[0] || null;
    }

    try {
      const created = await api.createMaterial({
        categoria: newCategoria.trim(),
        elementos: elementosArr,
        color: colorVal
      });
      showNotification(`Categoría '${created.categoria}' agregada`, 'success');
      setNewCategoria('');
      setNewElementosInput('');
      setNewColorInput('');
      setShowAddModal(false);
      loadMateriales();
    } catch (err) {
      showNotification('Error al crear la categoría', 'error');
    }
  };

  const handleAddElementToRow = async (row) => {
    const val = (tempElemInput[row.id] || '').trim();
    if (!val) return;

    const currentElems = Array.isArray(row.elementos) ? row.elementos : [];
    if (currentElems.includes(val)) {
      showNotification('Este elemento ya existe en la categoría', 'error');
      return;
    }

    const updatedElems = [...currentElems, val];
    try {
      await api.updateMaterial(row.id, { elementos: updatedElems });
      setMaterialesList(prev => prev.map(m => m.id === row.id ? { ...m, elementos: updatedElems } : m));
      setTempElemInput(prev => ({ ...prev, [row.id]: '' }));
      showNotification(`Elemento '${val}' añadido`, 'success');
    } catch (err) {
      showNotification('Error al agregar el elemento', 'error');
    }
  };

  const handleRemoveElementFromRow = async (row, elemToRemove) => {
    const currentElems = Array.isArray(row.elementos) ? row.elementos : [];
    const updatedElems = currentElems.filter(e => e !== elemToRemove);
    try {
      await api.updateMaterial(row.id, { elementos: updatedElems });
      setMaterialesList(prev => prev.map(m => m.id === row.id ? { ...m, elementos: updatedElems } : m));
      showNotification(`Elemento eliminado`, 'info');
    } catch (err) {
      showNotification('Error al eliminar el elemento', 'error');
    }
  };

  const handleAddColorToRow = async (row) => {
    const val = (tempColorInput[row.id] || '').trim();
    if (!val) return;

    let currentColors = [];
    if (Array.isArray(row.color)) {
      currentColors = [...row.color];
    } else if (typeof row.color === 'string' && row.color.toLowerCase() !== 'none') {
      currentColors = [row.color];
    }

    if (currentColors.includes(val)) {
      showNotification('Este color ya está registrado', 'error');
      return;
    }

    const updatedColors = [...currentColors, val];
    try {
      await api.updateMaterial(row.id, { color: updatedColors });
      setMaterialesList(prev => prev.map(m => m.id === row.id ? { ...m, color: updatedColors } : m));
      setTempColorInput(prev => ({ ...prev, [row.id]: '' }));
      showNotification(`Color '${val}' agregado`, 'success');
    } catch (err) {
      showNotification('Error al actualizar el color', 'error');
    }
  };

  const handleRemoveColorFromRow = async (row, colorToRemove) => {
    let currentColors = [];
    if (Array.isArray(row.color)) {
      currentColors = [...row.color];
    } else if (typeof row.color === 'string') {
      currentColors = [row.color];
    }

    const updatedColors = currentColors.filter(c => c !== colorToRemove);
    const finalVal = updatedColors.length === 0 ? null : (updatedColors.length === 1 ? updatedColors[0] : updatedColors);

    try {
      await api.updateMaterial(row.id, { color: finalVal });
      setMaterialesList(prev => prev.map(m => m.id === row.id ? { ...m, color: finalVal } : m));
      showNotification('Color eliminado', 'info');
    } catch (err) {
      showNotification('Error al actualizar color', 'error');
    }
  };

  const handleDeleteRow = async (id, catName) => {
    if (!window.confirm(`¿Estás seguro de eliminar la categoría '${catName}'?`)) return;
    try {
      await api.deleteMaterial(id);
      setMaterialesList(prev => prev.filter(m => m.id !== id));
      showNotification(`Categoría '${catName}' eliminada`, 'info');
    } catch (err) {
      showNotification('Error al eliminar la fila', 'error');
    }
  };

  return (
    <div className="materiales-manager glass-panel animate-fade-in">
      <div className="manager-header">
        <div>
          <h2><Layers size={20} /> Gestión de Materiales y Catálogos Auxiliares</h2>
          <p className="text-muted">Tabla de base de datos (`materiales`) para categorías, telas, materiales, tipos de mueble y áreas.</p>
        </div>
        <div className="manager-actions">
          <button className="btn-secondary" onClick={loadMateriales} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refrescar
          </button>
          <button className="btn-action-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Nueva Categoría
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE MATERIALES */}
      <div className="table-responsive">
        <table className="materiales-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Categoría</th>
              <th>Elementos (Lista)</th>
              <th>Color</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {materialesList.map(row => {
              const isTelaOrMat = ['telas', 'materiales'].includes(row.categoria.toLowerCase());
              const colorDisplayList = Array.isArray(row.color)
                ? row.color
                : (typeof row.color === 'string' && row.color.toLowerCase() !== 'none' ? [row.color] : []);

              return (
                <tr key={row.id}>
                  <td className="row-id"><code>{row.id}</code></td>
                  <td className="row-cat">
                    <span className={`cat-badge cat-${row.categoria.toLowerCase()}`}>
                      <Tag size={12} /> {row.categoria}
                    </span>
                  </td>
                  <td className="row-elements">
                    <div className="chips-container">
                      {(row.elementos || []).map((elem, idx) => (
                        <span key={idx} className="element-chip">
                          {elem}
                          <button 
                            className="chip-remove" 
                            title="Eliminar elemento"
                            onClick={() => handleRemoveElementFromRow(row, elem)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="add-chip-input">
                      <input 
                        type="text" 
                        placeholder="Añadir elemento..."
                        value={tempElemInput[row.id] || ''}
                        onChange={e => setTempElemInput({ ...tempElemInput, [row.id]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleAddElementToRow(row)}
                      />
                      <button onClick={() => handleAddElementToRow(row)} title="Agregar elemento">
                        <Plus size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="row-color">
                    {isTelaOrMat ? (
                      <div>
                        {colorDisplayList.length > 0 ? (
                          <div className="chips-container">
                            {colorDisplayList.map((c, idx) => (
                              <span key={idx} className="color-chip">
                                <Palette size={11} /> {c}
                                <button 
                                  className="chip-remove" 
                                  onClick={() => handleRemoveColorFromRow(row, c)}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-tag">None (Predeterminado)</span>
                        )}
                        <div className="add-chip-input mt-1">
                          <input 
                            type="text" 
                            placeholder="Añadir color..."
                            value={tempColorInput[row.id] || ''}
                            onChange={e => setTempColorInput({ ...tempColorInput, [row.id]: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleAddColorToRow(row)}
                          />
                          <button onClick={() => handleAddColorToRow(row)} title="Agregar color">
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-tag">None</span>
                    )}
                  </td>
                  <td className="row-actions">
                    <button 
                      className="btn-danger-icon" 
                      title="Eliminar categoría"
                      onClick={() => handleDeleteRow(row.id, row.categoria)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {materialesList.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="empty-table-msg">
                  No hay categorías de materiales registradas en la base de datos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL NUEVA CATEGORÍA */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <h3><Plus size={18} /> Nueva Categoría de Materiales</h3>
            <form onSubmit={handleCreateRow}>
              <div className="input-group">
                <label>Nombre de Categoría</label>
                <input 
                  type="text" 
                  placeholder="ej. Materiales, Telas, Cojines..." 
                  value={newCategoria} 
                  onChange={e => setNewCategoria(e.target.value)} 
                  required 
                />
              </div>

              <div className="input-group">
                <label>Elementos Iniciales (separados por coma)</label>
                <input 
                  type="text" 
                  placeholder="ej. Pino, Caoba, Roble, Cedro" 
                  value={newElementosInput} 
                  onChange={e => setNewElementosInput(e.target.value)} 
                />
              </div>

              <div className="input-group">
                <label>Colores Iniciales (Opcional - por defecto None)</label>
                <input 
                  type="text" 
                  placeholder="ej. Rojo, Azul, Verde (o dejar en blanco para None)" 
                  value={newColorInput} 
                  onChange={e => setNewColorInput(e.target.value)} 
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-action-primary">
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
