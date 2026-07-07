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
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="card flex flex-col justify-center items-center text-center p-6 border-2" style={{ borderColor: 'rgba(204, 255, 0, 0.3)', backgroundColor: 'var(--surface)', backgroundImage: 'linear-gradient(145deg, rgba(204, 255, 0, 0.05) 0%, rgba(204, 255, 0, 0.15) 100%)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-sm" style={{ backgroundColor: 'var(--secondary-light)', color: 'var(--secondary)' }}>
                <BarChart3 size={24} />
              </div>
              <span className="text-sm font-medium mb-1" style={{ color: 'var(--text-main)' }}>Balance Neto Total</span>
              <div className="flex flex-col">
                {Object.keys(globalTotals).length === 0 ? (
                  <span className="text-3xl font-bold" style={{ color: 'var(--secondary)' }}>$ 0,00</span>
                ) : (
                  Object.entries(globalTotals).map(([currency, cents]) => (
                    <span key={currency} className="text-3xl font-bold" style={{ color: 'var(--secondary)' }}>
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
                <div key={group.id} className="mb-4 bg-[#0f1423] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                  {/* Cabecera de la Tarjeta del Torneo */}
                  <div 
                    className="flex justify-between items-center p-4 bg-[#131b2e] cursor-pointer hover:bg-[#1a233a] transition-colors"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy size={16} className="text-success" />
                        <h3 className="font-bold text-base text-gray-100 leading-tight">{group.name}</h3>
                      </div>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">
                        {group.description || 'Sin descripción'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Gasto (Neto)</p>
                      <p className="text-sm font-bold text-success flex items-center justify-end gap-1">
                        {formatCurrency(totalCents, group.currency || 'ARS')}
                        {isExpanded ? <ChevronUp size={16} className="text-gray-400 ml-1" /> : <ChevronDown size={16} className="text-gray-400 ml-1" />}
                      </p>
                    </div>
                  </div>

                  {/* Detalle de Gastos */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800/50">
                      {groupExpenses.length === 0 ? (
                        <p className="text-xs text-muted text-center py-6">
                          No hay movimientos registrados en este torneo.
                        </p>
                      ) : (
                        <div className="flex flex-col">
                          {groupExpenses.map(exp => {
                            const isIncome = exp.type === 'income';
                            return (
                              <div key={exp.id} className="grid grid-cols-[1fr_auto] gap-4 p-4 border-b border-gray-800/50 last:border-0 even:bg-[#131b2e] odd:bg-[#171f32] hover:bg-[#1a233a] transition-colors">
                                <div>
                                  <p className="font-semibold text-sm text-gray-100 mb-1.5 leading-tight">
                                    {cleanDescription(exp.description)}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                                    <span className="flex items-center gap-1 font-medium">
                                      <Calendar size={12} />
                                      {formatDateShort(exp.date)}
                                    </span>
                                    <span className="flex items-center gap-1 font-medium">
                                      <User size={12} />
                                      {isIncome ? 'Cobró' : 'Pagó'} {exp.profiles?.full_name || 'Miembro'}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right flex items-center">
                                  <span 
                                    className="font-bold text-sm tracking-wide"
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
