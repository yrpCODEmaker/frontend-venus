import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  TrendingUp, TrendingDown, DollarSign, Layers, RefreshCw,
  BarChart2, PieChart as PieIcon, ShoppingBag
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  Pie, PieChart as RePieChart, Legend
} from 'recharts';
import { formatCurrency } from '../utils/formatters';
import './FinanceDashboard.css';

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

// Tooltip personalizado para recharts
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '0.6rem 1rem',
        boxShadow: 'var(--shadow-md)',
        fontSize: '0.82rem',
        color: 'var(--color-text-dark)'
      }}>
        <strong>{label}</strong>
        <div style={{ color: '#6366f1', fontWeight: 700 }}>{payload[0].value} unid.</div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '0.6rem 1rem',
        boxShadow: 'var(--shadow-md)',
        fontSize: '0.82rem',
        color: 'var(--color-text-dark)'
      }}>
        <strong>{payload[0].name}</strong>
        <div style={{ color: payload[0].payload.fill, fontWeight: 700 }}>{payload[0].value} items</div>
      </div>
    );
  }
  return null;
};

function KPICard({ label, value, sub, colorClass, icon: Icon }) {
  return (
    <div className={`fin-kpi-card ${colorClass} animate-fade-in`}>
      <div className="fin-kpi-icon">
        <Icon size={20} />
      </div>
      <p className="fin-kpi-label">{label}</p>
      <div className="fin-kpi-value">${formatCurrency(value)}</div>
      {sub && <p className="fin-kpi-sub">{sub}</p>}
    </div>
  );
}

function FinanceDashboard() {
  const { hasPermission, showNotification } = useApp();
  const [metricas, setMetricas] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    handleDateRangeChange('this_month');
  }, []);

  useEffect(() => {
    if (startDate && endDate) loadMetricas();
  }, [startDate, endDate]);

  const handleDateRangeChange = (rangeType) => {
    setDateRange(rangeType);
    const today = new Date();
    if (rangeType === 'this_month') {
      setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
      setEndDate(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]);
    } else if (rangeType === 'last_month') {
      setStartDate(new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0]);
      setEndDate(new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0]);
    }
  };

  const loadMetricas = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMetricasFinancieras(startDate, endDate);
      setMetricas(data);
    } catch (error) {
      showNotification('Error al cargar métricas financieras', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasPermission('finanzas_ver')) {
    return <div className="no-permission">No tienes permiso para ver el panel de finanzas.</div>;
  }

  return (
    <div className="finance-dashboard-tab animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      
      {/* ── Barra de controles ── */}
      <div className="fin-header glass-panel" style={{ padding: '0.9rem 1.25rem' }}>
        <span className="fin-title">
          <TrendingUp size={18} className="fin-title-icon" />
          Métricas Financieras
        </span>

        {/* Chips de periodo */}
        <div className="fin-period-chips">
          {[
            { key: 'this_month', label: 'Este mes' },
            { key: 'last_month', label: 'Mes pasado' },
            { key: 'custom',     label: 'Personalizado' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`fin-chip${dateRange === key ? ' active' : ''}`}
              onClick={() => handleDateRangeChange(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="fin-custom-dates">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="fin-date-sep">→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        )}

        <button className="fin-refresh" onClick={loadMetricas} title="Actualizar">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Contenido ── */}
      {isLoading || !metricas ? (
        <div className="fin-loading glass-panel">
          <div className="fin-spinner" />
          <span>Calculando métricas…</span>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="fin-kpi-grid">
            <KPICard
              label="Ingresos Brutos"
              value={metricas.ingresos_facturas}
              colorClass="green"
              icon={TrendingUp}
            />
            <KPICard
              label="Gastos Operativos"
              value={metricas.gastos_operativos}
              colorClass="red"
              icon={TrendingDown}
            />
            <KPICard
              label="Total Nómina"
              value={metricas.nomina_sueldos_fijos + metricas.nomina_comisiones}
              sub={`Fijo: $${formatCurrency(metricas.nomina_sueldos_fijos)} · Comisiones: $${formatCurrency(metricas.nomina_comisiones)}`}
              colorClass="amber"
              icon={Layers}
            />
            <KPICard
              label="Ganancia Neta"
              value={metricas.ganancia_neta}
              colorClass="blue"
              icon={DollarSign}
            />
          </div>

          {/* ── Gráficos ── */}
          <div className="fin-charts-grid">
            {/* Gráfico 1: Top Muebles */}
            <div className="fin-chart-card">
              <div className="fin-chart-header">
                <BarChart2 size={16} className="fin-chart-icon" />
                <h4>Muebles más Fabricados</h4>
                <span>{metricas.items_procesados} procesados</span>
              </div>
              {metricas.top_muebles.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={metricas.top_muebles}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      tick={{ fontSize: 11, fill: 'var(--color-text-light)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'var(--color-surface-2)' }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                      {metricas.top_muebles.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="fin-empty">
                  <ShoppingBag size={32} strokeWidth={1.2} />
                  <span>Sin datos de producción aún</span>
                </div>
              )}
            </div>

            {/* Gráfico 2: Demanda por Área */}
            <div className="fin-chart-card">
              <div className="fin-chart-header">
                <PieIcon size={16} className="fin-chart-icon" />
                <h4>Demanda por Área</h4>
                <span>{metricas.top_areas.length} áreas</span>
              </div>
              {metricas.top_areas.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <RePieChart>
                    <Pie
                      data={metricas.top_areas}
                      cx="50%"
                      cy="45%"
                      outerRadius={90}
                      innerRadius={45}
                      dataKey="value"
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: 'var(--color-border)' }}
                    >
                      {metricas.top_areas.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="fin-empty">
                  <PieIcon size={32} strokeWidth={1.2} />
                  <span>Sin datos de área aún</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default FinanceDashboard;
