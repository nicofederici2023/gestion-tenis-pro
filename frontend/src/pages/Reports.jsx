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
      </div>

      {groups.length === 0 ? (
        <div className="card text-center p-8">
          <AlertCircle size={48} className="text-muted mx-auto mb-4" />
          <h3 className="mb-2">No hay torneos registrados</h3>
          <p className="text-sm text-muted mb-4">Únete o crea un torneo en el inicio para comenzar a ver reportes.</p>
        </div>
      ) : (
        <>

          {/* Listado de Torneos */}
          <div className="reports-list">
            {groups.map(group => {
              const groupExpenses = expenses.filter(e => e.group_id === group.id);
              const totalCents = getGroupTotal(group.id);
              const isExpanded = !!expandedGroups[group.id];

              return (
                <div key={group.id} style={{ marginBottom: '1rem', backgroundColor: 'rgba(15, 20, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                  {/* Cabecera de la Tarjeta del Torneo */}
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'rgba(19, 27, 46, 0.95)', cursor: 'pointer', borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.1)' : 'none' }}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <Trophy size={16} className="text-success" />
                        <h3 style={{ fontWeight: 'bold', fontSize: '1rem', color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>{group.name}</h3>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>
                        {group.description || 'Sin descripción'}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Gasto (Neto)</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', margin: 0 }}>
                        {formatCurrency(totalCents, group.currency || 'ARS')}
                        {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                      </p>
                    </div>
                  </div>

                  {/* Detalle de Gastos */}
                  {isExpanded && (
                    <div>
                      {groupExpenses.length === 0 ? (
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>
                          No hay movimientos registrados en este torneo.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {groupExpenses.map((exp, idx) => {
                            const isIncome = exp.type === 'income';
                            const isEven = idx % 2 === 0;
                            const rowBg = isEven ? 'rgba(19, 27, 46, 0.95)' : 'rgba(23, 31, 50, 0.95)';
                            return (
                              <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: rowBg, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                                  <p style={{ fontWeight: '600', fontSize: '0.875rem', color: '#f8fafc', margin: '0 0 0.375rem 0', lineHeight: 1.2 }}>
                                    {cleanDescription(exp.description)}
                                  </p>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', fontSize: '0.6875rem', color: '#94a3b8' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '500' }}>
                                      <Calendar size={12} />
                                      {formatDateShort(exp.date)}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '500' }}>
                                      <User size={12} />
                                      {isIncome ? 'Cobró' : 'Pagó'} {exp.profiles?.full_name || 'Miembro'}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                  <span 
                                    style={{ fontWeight: 'bold', fontSize: '0.875rem', letterSpacing: '0.025em', color: isIncome ? 'var(--secondary)' : 'var(--text-main)' }}
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
