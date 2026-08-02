import React, { useState } from 'react';
import { TrendingUp, Users, CreditCard } from 'lucide-react';
import FinanceDashboard from './FinanceDashboard';
import Payroll from './Payroll';
import Expenses from './Expenses';
import { useApp } from '../context/AppContext';
import './Finance.css';

function Finance() {
  const { hasPermission } = useApp();
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'expenses' | 'payroll'

  // Si no tiene ningún permiso de finanzas
  if (!hasPermission('finanzas_ver') && !hasPermission('gastos_gestionar') && !hasPermission('nominas_gestionar')) {
    return <div className="page-container"><div className="no-permission">No tienes permisos para acceder a Finanzas.</div></div>;
  }

  return (
    <div className="finance-page page-container animate-fade-in">
      <div className="finance-page-header">
        <h1><TrendingUp /> Finanzas y Control</h1>
        <div className="fin-main-tabs">
          {hasPermission('finanzas_ver') && (
            <button 
              className={`fin-main-tab ${activeTab === 'metrics' ? 'active' : ''}`} 
              onClick={() => setActiveTab('metrics')}
            >
              <TrendingUp size={16} />
              Métricas
            </button>
          )}
          {hasPermission('gastos_gestionar') && (
            <button 
              className={`fin-main-tab ${activeTab === 'expenses' ? 'active' : ''}`} 
              onClick={() => setActiveTab('expenses')}
            >
              <CreditCard size={16} />
              Gastos
            </button>
          )}
          {hasPermission('nominas_gestionar') && (
            <button 
              className={`fin-main-tab ${activeTab === 'payroll' ? 'active' : ''}`} 
              onClick={() => setActiveTab('payroll')}
            >
              <Users size={16} />
              Nómina
            </button>
          )}
        </div>
      </div>

      <div className="finance-content">
        {activeTab === 'metrics' && hasPermission('finanzas_ver') && <FinanceDashboard />}
        {activeTab === 'expenses' && hasPermission('gastos_gestionar') && <Expenses />}
        {activeTab === 'payroll' && hasPermission('nominas_gestionar') && <Payroll />}
      </div>
    </div>
  );
}

export default Finance;
