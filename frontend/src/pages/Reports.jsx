import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Trophy, Calendar, User, ChevronDown, ChevronUp, AlertCircle, Printer } from 'lucide-react';

export default function Reports() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all groups where user is member
      const { data: memberGroups, error: groupsError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (*)
        `)
        .eq('profile_id', user.id);

      if (groupsError) throw groupsError;

      const fetchedGroups = memberGroups ? memberGroups.map(d => d.groups).filter(Boolean) : [];
      setGroups(fetchedGroups);

      // Default all groups to expanded
      const initialExpanded = {};
      fetchedGroups.forEach(g => {
        initialExpanded[g.id] = true;
      });
      setExpandedGroups(initialExpanded);

      if (fetchedGroups.length > 0) {
        const groupIds = fetchedGroups.map(g => g.id);

        // 2. Fetch all expenses for these groups
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*, profiles:paid_by_id(full_name)')
          .in('group_id', groupIds)
          .order('date', { ascending: false });

        if (expensesError) throw expensesError;
        setExpenses(expensesData || []);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error('Error fetching report data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Helper to format currency
  const formatCurrency = (amountCents, currency = 'ARS') => {
    const amount = amountCents / 100;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Clean description by stripping receipt URLs
  const cleanDescription = (desc) => {
    if (!desc) return '';
    return desc.split(' || receipt:')[0];
  };

  // Short format for date: DD/MM/YY
  const formatDateShort = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year.substring(2)}`;
  };

  // Compute total net expenses by group (expenses - income)
  const getGroupTotal = (groupId) => {
    return expenses
      .filter(e => e.group_id === groupId)
      .reduce((sum, e) => {
        const isIncome = e.type === 'income';
        const amount = isIncome ? -e.amount_cents : e.amount_cents;
        return sum + amount;
      }, 0);
  };

  // Calculate global summary net totals by currency (expenses - income)
  const getGlobalTotals = () => {
    const totals = {};
    expenses.forEach(e => {
      const currency = e.currency || 'ARS';
      const isIncome = e.type === 'income';
      const amount = isIncome ? -e.amount_cents : e.amount_cents;
      totals[currency] = (totals[currency] || 0) + amount;
    });
    return totals;
  };

  // Expand all groups and trigger window print
  const handleExportPDF = () => {
    const allExpanded = {};
    groups.forEach(g => {
      allExpanded[g.id] = true;
    });
    setExpandedGroups(allExpanded);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const globalTotals = getGlobalTotals();

  if (loading) {
    return (
      <div className="reports-container">
        <div className="header-compact">
          <BarChart3 size={24} className="text-success" />
          <h1>Reportes de Gastos</h1>
        </div>
        <div className="loading-skeleton">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="header-compact mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={28} className="text-success" />
            <h1>Reportes de Gastos</h1>
          </div>
          {groups.length > 0 && (
            <button 
              onClick={handleExportPDF} 
              className="btn btn-secondary print-hide flex items-center gap-1"
              style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <Printer size={16} /> Exportar PDF
            </button>
          )}
        </div>
        <p className="text-sm text-muted">Resumen financiero consolidado de tus torneos de tenis.</p>
      </div>

      {groups.length === 0 ? (
        <div className="card text-center p-8">
          <AlertCircle size={48} className="text-muted mx-auto mb-4" />
          <h3 className="mb-2">No hay torneos registrados</h3>
          <p className="text-sm text-muted mb-4">Únete o crea un torneo en el inicio para comenzar a ver reportes.</p>
        </div>
      ) : (
        <>
          {/* Tarjetas de Resumen Global */}
          <div className="stats-grid mb-6">
            <div className="card stat-card">
              <span className="stat-label">Total Torneos</span>
              <span className="stat-value">{groups.length}</span>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Balance Neto Total</span>
              <div className="flex flex-col">
                {Object.keys(globalTotals).length === 0 ? (
                  <span className="stat-value">$ 0,00</span>
                ) : (
                  Object.entries(globalTotals).map(([currency, cents]) => (
                    <span key={currency} className="stat-value text-success">
                      {formatCurrency(cents, currency)}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Listado de Torneos */}
          <div className="reports-list">
            {groups.map(group => {
              const groupExpenses = expenses.filter(e => e.group_id === group.id);
              const totalCents = getGroupTotal(group.id);
              const isExpanded = !!expandedGroups[group.id];

              return (
                <div key={group.id} className="card group-report-card">
                  {/* Cabecera de la Tarjeta del Torneo */}
                  <div 
                    className="group-report-header"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy size={18} className="text-success" />
                        <h3 className="group-title">{group.name}</h3>
                      </div>
                      <p className="text-xs text-muted truncate max-w-xs">
                        {group.description || 'Sin descripción'}
                      </p>
                    </div>

                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-xs text-muted uppercase tracking-wider font-semibold">Total Gastado (Neto)</p>
                        <p className="text-sm font-bold text-success">
                          {formatCurrency(totalCents, group.currency || 'ARS')}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp size={20} className="text-muted print-hide" /> : <ChevronDown size={20} className="text-muted print-hide" />}
                    </div>
                  </div>

                  {/* Detalle de Gastos */}
                  {isExpanded && (
                    <div className="group-report-details mt-2 pt-2 border-t">
                      {groupExpenses.length === 0 ? (
                        <p className="text-xs text-muted text-center py-4">
                          No hay movimientos registrados en este torneo.
                        </p>
                      ) : (
                        <div className="flex flex-col">
                          {groupExpenses.map(exp => {
                            const isIncome = exp.type === 'income';
                            return (
                              <div key={exp.id} className="expense-report-item">
                                <div className="flex-1">
                                  <p className="expense-description font-medium text-sm">
                                    {cleanDescription(exp.description)}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-muted mt-1">
                                    <span className="flex items-center gap-1 expense-date">
                                      <Calendar size={12} />
                                      {formatDateShort(exp.date)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <User size={12} />
                                      {isIncome ? 'Cobró' : 'Pagó'} {exp.profiles?.full_name || 'Miembro'}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span 
                                    className="font-semibold text-sm"
                                    style={{ color: isIncome ? 'var(--secondary)' : 'var(--text-main)' }}
                                  >
                                    {isIncome ? '+' : '-'} {formatCurrency(exp.amount_cents, exp.currency || 'ARS')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
