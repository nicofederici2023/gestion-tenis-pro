import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Receipt, Users, Calculator, Plus, ArrowRightLeft, Edit2, Trash2, Link2, Camera, Eye, Check, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses'); // expenses, balances, members
  const [loading, setLoading] = useState(true);

  // Modal de añadir gasto
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expType, setExpType] = useState('expense');
  const [selectedSplitMembers, setSelectedSplitMembers] = useState([]);

  // Modal de editar gasto
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState('expense');
  const [editSelectedSplitMembers, setEditSelectedSplitMembers] = useState([]);

  // Confirmar eliminación de gasto
  const [showDeleteExpenseConfirm, setShowDeleteExpenseConfirm] = useState(null);

  // Invitaciones de miembros
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Miembros locales ("Fantasmas")
  const [localName, setLocalName] = useState('');
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editMemberName, setEditMemberName] = useState('');

  // Vinculación de miembros
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingMember, setLinkingMember] = useState(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  // Comprobantes / Tickets
  const [receiptBase64, setReceiptBase64] = useState('');
  const [receiptMimeType, setReceiptMimeType] = useState('');
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState('');

  const [editReceiptBase64, setEditReceiptBase64] = useState('');
  const [editReceiptMimeType, setEditReceiptMimeType] = useState('');
  const [editReceiptPreviewUrl, setEditReceiptPreviewUrl] = useState('');
  const [editReceiptRemoved, setEditReceiptRemoved] = useState(false);

  const [viewingReceiptUrl, setViewingReceiptUrl] = useState('');

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const fetchGroupData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Group
      const { data: grpData } = await supabase.from('groups').select('*').eq('id', id).single();
      setGroup(grpData);

      // 2. Fetch Members (including email to detect local/phantom members)
      const { data: memData } = await supabase.from('group_members').select('profiles(id, full_name, email)').eq('group_id', id);
      setMembers(memData ? memData.map(m => m.profiles).filter(Boolean) : []);

      // 3. Fetch Expenses (including expense shares to determine split participants)
      const { data: expData } = await supabase
        .from('expenses')
        .select('*, profiles:paid_by_id(full_name), expense_shares(profile_id, share_type)')
        .eq('group_id', id)
        .order('created_at', { ascending: false });
      setExpenses(expData || []);

      // 4. Fetch Balances
      const { data: balData } = await supabase.from('balances')
        .select('*, debtor:profiles!balances_debtor_id_fkey(full_name), creditor:profiles!balances_creditor_id_fkey(full_name)')
        .eq('group_id', id);
      setBalances(balData || []);

      // 5. Fetch optimized settlements from backend
      const setRes = await fetch(`${API_URL}/api/groups/${id}/balances/settlement`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (setRes.ok) {
        const setData = await setRes.json();
        setSettlements(setData || []);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openExpenseModal = () => {
    setSelectedSplitMembers(members.map(m => m.id));
    setExpType('expense');
    setReceiptBase64('');
    setReceiptMimeType('');
    setReceiptPreviewUrl('');
    setShowExpenseModal(true);
  };

  const handleCheckboxChange = (memberId) => {
    if (selectedSplitMembers.includes(memberId)) {
      if (selectedSplitMembers.length > 1) {
        setSelectedSplitMembers(selectedSplitMembers.filter(id => id !== memberId));
      }
    } else {
      setSelectedSplitMembers([...selectedSplitMembers, memberId]);
    }
  };

  const openEditExpenseModal = (expense) => {
    setEditingExpense(expense);
    
    let desc = expense.description;
    let existingReceiptUrl = '';
    if (desc.includes(' || receipt:')) {
      const parts = desc.split(' || receipt:');
      desc = parts[0];
      existingReceiptUrl = parts[1];
    }
    
    setEditDesc(desc);
    setEditAmount((expense.amount_cents / 100).toString());
    setEditType(expense.type || 'expense');
    setEditReceiptBase64('');
    setEditReceiptMimeType('');
    setEditReceiptPreviewUrl(existingReceiptUrl);
    setEditReceiptRemoved(false);
    
    // Extraer los miembros incluidos en la división del gasto actual (excluyendo settlement_recipients)
    const activeParticipants = expense.expense_shares
      ? expense.expense_shares.filter(s => s.share_type !== 'settlement_recipient').map(s => s.profile_id)
      : [];
    setEditSelectedSplitMembers(activeParticipants);
    setShowEditModal(true);
  };

  const handleEditCheckboxChange = (memberId) => {
    if (editSelectedSplitMembers.includes(memberId)) {
      if (editSelectedSplitMembers.length > 1) {
        setEditSelectedSplitMembers(editSelectedSplitMembers.filter(id => id !== memberId));
      }
    } else {
      setEditSelectedSplitMembers([...editSelectedSplitMembers, memberId]);
    }
  };

  const handleFileChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      if (isEdit) {
        setEditReceiptBase64(base64String);
        setEditReceiptMimeType(file.type);
        setEditReceiptPreviewUrl(reader.result);
        setEditReceiptRemoved(false);
      } else {
        setReceiptBase64(base64String);
        setReceiptMimeType(file.type);
        setReceiptPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const amountCents = Math.round(parseFloat(expAmount) * 100);
      
      const response = await fetch(`${API_URL}/api/groups/${id}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          description: expDesc,
          amount_cents: amountCents,
          currency: 'ARS',
          split_among: selectedSplitMembers,
          receipt_base64: receiptBase64 || undefined,
          receipt_mime_type: receiptMimeType || undefined,
          type: expType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create expense via backend API');
      }
      
      setShowExpenseModal(false);
      setExpDesc('');
      setExpAmount('');
      setReceiptBase64('');
      setReceiptMimeType('');
      setReceiptPreviewUrl('');
      fetchGroupData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditExpense = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;

    try {
      const amountCents = Math.round(parseFloat(editAmount) * 100);
      
      const response = await fetch(`${API_URL}/api/groups/${id}/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          description: editDesc,
          amount_cents: amountCents,
          currency: 'ARS',
          split_among: editSelectedSplitMembers,
          receipt_base64: editReceiptBase64 ? editReceiptBase64 : (editReceiptRemoved ? null : undefined),
          receipt_mime_type: editReceiptMimeType || undefined,
          type: editType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update expense via backend API');
      }

      setShowEditModal(false);
      setEditingExpense(null);
      setEditReceiptBase64('');
      setEditReceiptMimeType('');
      setEditReceiptPreviewUrl('');
      setEditReceiptRemoved(false);
      fetchGroupData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpense = async () => {
    if (!showDeleteExpenseConfirm) return;

    try {
      const response = await fetch(`${API_URL}/api/groups/${id}/expenses/${showDeleteExpenseConfirm.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }

      setShowDeleteExpenseConfirm(null);
      fetchGroupData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettleDebt = async (settlement) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${id}/balances/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          debtor_id: settlement.from,
          creditor_id: settlement.to,
          amount_cents: settlement.amount_cents
        })
      });

      if (!response.ok) {
        throw new Error('Failed to settle debt via backend API');
      }

      fetchGroupData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    try {
      const response = await fetch(`${API_URL}/api/groups/${id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Error al añadir miembro');
      }

      setInviteSuccess(`¡${resData.profile.full_name || inviteEmail} añadido con éxito!`);
      setInviteEmail('');
      fetchGroupData();
    } catch (err) {
      setInviteError(err.message);
    }
  };

  const handleAddLocalMember = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLocalSuccess('');
    try {
      const response = await fetch(`${API_URL}/api/groups/${id}/members/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ full_name: localName })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Error al añadir miembro local');
      }

      setLocalSuccess(`¡${resData.profile.full_name} añadido con éxito!`);
      setLocalName('');
      fetchGroupData();
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleEditMemberSubmit = async (memberId) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${id}/members/${memberId}/local`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ full_name: editMemberName })
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.error || 'Error al actualizar miembro');
      }
      setEditingMemberId(null);
      fetchGroupData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este miembro? Esto podría afectar los saldos si tiene pagos o deudas.')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/groups/${id}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.error || 'Error al eliminar miembro');
      }
      fetchGroupData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLinkLocalMember = async (e) => {
    e.preventDefault();
    setLinkError('');
    setLinkSuccess('');
    if (!linkingMember) return;

    try {
      const response = await fetch(`${API_URL}/api/groups/${id}/members/${linkingMember.id}/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: linkEmail })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Error al vincular miembro local');
      }

      setLinkSuccess(`¡Vínculo completado con éxito con ${resData.realProfile.full_name}!`);
      setLinkEmail('');
      setTimeout(() => {
        setShowLinkModal(false);
        setLinkingMember(null);
        setLinkSuccess('');
      }, 1500);
      fetchGroupData();
    } catch (err) {
      setLinkError(err.message);
    }
  };

  if (loading) return <div className="p-4 text-center">Cargando...</div>;
  if (!group) return <div className="p-4 text-center">Gasto no encontrado</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 mt-2">
        <button onClick={() => navigate(-1)} className="btn btn-secondary p-2 w-auto border-none shadow-none text-muted hover:text-primary bg-transparent">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold flex-1 leading-tight">{group.name}</h1>
      </div>

      <div className="tabs">
        <div className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
          <Receipt size={18} className="mx-auto mb-1" />
          Gastos
        </div>
        {group.group_type !== 'ledger' && (
          <div className={`tab ${activeTab === 'balances' ? 'active' : ''}`} onClick={() => setActiveTab('balances')}>
            <Calculator size={18} className="mx-auto mb-1" />
            Saldos
          </div>
        )}
        <div className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          <Users size={18} className="mx-auto mb-1" />
          Miembros
        </div>
      </div>

      <div className="content-area">
        {activeTab === 'expenses' && (
          <div>
            <div className="flex gap-2 mb-4 print-hide">
              <button className="btn btn-primary" onClick={openExpenseModal} style={{ flex: 2 }}>
                <Plus size={18} /> Añadir Gasto / Ingreso
              </button>
              <button className="btn btn-secondary" onClick={() => window.print()} style={{ flex: 1 }}>
                Exportar PDF
              </button>
            </div>
            
            {expenses.length === 0 ? (
              <p className="text-muted text-center py-4">No hay movimientos aún.</p>
            ) : (
              <div style={{ backgroundColor: 'rgba(15, 20, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                {expenses.map((exp, idx) => {
                  const isSettlement = exp.description.startsWith('Liquidación:');
                  const canModify = exp.paid_by_id === user.id;
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? 'rgba(19, 27, 46, 0.95)' : 'rgba(23, 31, 50, 0.95)';

                  if (isSettlement) {
                    return (
                      <div key={exp.id} className="expense-list-item" style={{ backgroundColor: rowBg, borderBottom: '1px solid rgba(255,255,255,0.1)', borderLeft: '4px solid var(--secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="print-hide">
                            <ArrowRightLeft size={18} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--secondary)', margin: 0 }}>{exp.description}</h3>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Pago registrado el {new Date(exp.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', color: 'var(--secondary)' }}>
                            ${(exp.amount_cents / 100).toFixed(2)}
                          </div>
                          {canModify && (
                            <button
                              onClick={() => setShowDeleteExpenseConfirm(exp)}
                              className="text-gray-400 hover:text-danger transition-colors p-1 print-hide"
                              title="Eliminar liquidación"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  let desc = exp.description;
                  let receiptUrl = '';
                  if (desc.includes(' || receipt:')) {
                    const parts = desc.split(' || receipt:');
                    desc = parts[0];
                    receiptUrl = parts[1];
                  }

                  const isIncome = exp.type === 'income';

                  return (
                    <div key={exp.id} className="expense-list-item" style={{ backgroundColor: rowBg, borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, paddingRight: '0.5rem', alignItems: 'center' }}>
                          {receiptUrl && (
                            <div className="print-hide" onClick={() => setViewingReceiptUrl(receiptUrl)} title="Ver comprobante" style={{ flexShrink: 0, cursor: 'pointer' }}>
                               <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', overflow: 'hidden', position: 'relative' }}>
                                 <img 
                                   src={receiptUrl} 
                                   alt="Comprobante" 
                                   style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                 />
                                 <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', backgroundColor: 'rgba(15, 20, 35, 0.9)', borderRadius: '50%', padding: '2px', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--primary)' }}>
                                   <Receipt size={12} />
                                 </div>
                               </div>
                            </div>
                          )}
                          <div>
                            <h3 style={{ fontWeight: '600', fontSize: '0.875rem', color: '#f8fafc', marginBottom: '2px', lineHeight: '1.2' }}>{desc}</h3>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                              {isIncome ? 'Cobró' : 'Pagó'} {exp.profiles?.full_name || 'Miembro'}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '1rem', color: isIncome ? 'var(--secondary)' : 'var(--text-main)' }}>
                            {isIncome ? '+' : '-'} ${(exp.amount_cents / 100).toFixed(2)}
                          </div>
                          {canModify && (
                            <div className="print-hide" style={{ display: 'flex', gap: '0.75rem' }}>
                              <button
                                onClick={() => openEditExpenseModal(exp)}
                                title="Editar"
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '2px', cursor: 'pointer' }}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setShowDeleteExpenseConfirm(exp)}
                                title="Eliminar"
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '2px', cursor: 'pointer' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'balances' && (
          <div className="card">
            <div className="mb-6">
              <h2 className="mb-2 text-lg">Plan de Liquidación Óptimo 💡</h2>
              <p className="text-sm text-muted mb-4">Pagos mínimos recomendados para saldar todas las deudas.</p>
              <div className="flex flex-col gap-2">
                {settlements.length === 0 ? (
                  <p className="text-muted text-center py-4 bg-white/5 rounded-lg text-sm">¡Todos están al día! No hay transacciones pendientes 🎉</p>
                ) : null}
                {settlements.map((setl, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between items-center p-4 border rounded-xl bg-white shadow-sm mb-2 gap-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', backgroundColor: '#fee2e2', color: '#991b1b' }}>
                        {setl.from_profile?.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <ArrowRightLeft size={16} className="text-gray-300" />
                      <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', backgroundColor: '#dcfce7', color: '#166534' }}>
                        {setl.to_profile?.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted leading-tight">Transferencia sugerida</span>
                        <span className="font-semibold text-sm mt-0.5" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span className="text-danger">{setl.from_profile?.full_name || 'Alguien'}</span>
                          <span className="text-muted font-normal text-xs">a</span>
                          <span className="text-success">{setl.to_profile?.full_name || 'Alguien'}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                      <div className="font-bold text-lg" style={{ whiteSpace: 'nowrap' }}>
                        ${(setl.amount_cents / 100).toFixed(2)}
                      </div>
                      <button 
                        onClick={() => handleSettleDebt(setl)}
                        className="btn btn-primary text-sm flex items-center gap-1 shrink-0" 
                        style={{ width: 'auto', padding: '0.5rem 1rem' }}
                      >
                        <Check size={16} /> Saldar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100/10 pt-6 mt-6">
              <h2 className="mb-3 text-lg text-muted">Historial / Saldos Cruzados</h2>
              <div className="flex flex-col gap-2">
                {balances.length === 0 ? <p className="text-muted text-center py-2 text-sm">Sin saldos cruzados.</p> : null}
                {balances.map(bal => (
                  <div key={bal.id} className="flex justify-between items-center p-3 border rounded-lg mb-2" style={{ backgroundColor: 'var(--surface-dim)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b' }}>
                          {bal.debtor?.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#166534' }}>
                          {bal.creditor?.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      </div>
                      <div className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span className="font-medium text-danger">{bal.debtor?.full_name}</span>
                        <span className="text-muted text-xs">le debe a</span>
                        <span className="font-medium text-success">{bal.creditor?.full_name}</span>
                      </div>
                    </div>
                    <div className="font-bold text-gray-700">
                      ${(bal.amount_cents / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="card">
            <h2 className="text-lg mb-4">Participantes ({members.length})</h2>
            
            {/* Formulario miembro registrado */}
            <form onSubmit={handleAddMember} className="mb-4 pb-4 border-b border-gray-100">
              <label className="block text-sm font-medium mb-1.5 text-muted">Añadir miembro por correo electrónico</label>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="ejemplo@correo.com" 
                  className="input" 
                  value={inviteEmail} 
                  onChange={e => setInviteEmail(e.target.value)} 
                  required 
                  style={{ flex: 1 }} 
                />
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }}>
                  + Añadir
                </button>
              </div>
              {inviteSuccess && <p className="text-xs text-success mt-2 font-medium">{inviteSuccess}</p>}
              {inviteError && <p className="text-xs text-danger mt-2 font-medium">{inviteError}</p>}
            </form>

            {/* Formulario miembro local (fantasma) */}
            <form onSubmit={handleAddLocalMember} className="mb-6 pb-6 border-b border-gray-100">
              <label className="block text-sm font-medium mb-1.5 text-muted">Crear participante temporal (Local - sin correo)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nombre (ej. Sofía)" 
                  className="input" 
                  value={localName} 
                  onChange={e => setLocalName(e.target.value)} 
                  required 
                  style={{ flex: 1 }} 
                />
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }}>
                  + Crear local
                </button>
              </div>
              {localSuccess && <p className="text-xs text-success mt-2 font-medium">{localSuccess}</p>}
              {localError && <p className="text-xs text-danger mt-2 font-medium">{localError}</p>}
            </form>

            <ul className="list-none">
              {members.map(m => {
                const isCreator = group.creator_id === user.id;
                const canModify = isCreator && m.id !== user.id;
                const isLocal = !m.email;
                return (
                <li key={m.id} className="py-2 border-b border-gray-100 last:border-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', backgroundColor: 'var(--primary)', color: 'white' }}>
                      {m.full_name?.charAt(0).toUpperCase()}
                    </div>
                    {editingMemberId === m.id ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleEditMemberSubmit(m.id); }} className="flex gap-2">
                        <input type="text" value={editMemberName} onChange={e => setEditMemberName(e.target.value)} className="input px-2 text-sm" style={{height:'32px'}} required />
                        <button type="submit" className="btn btn-primary flex items-center justify-center shrink-0" style={{height:'32px', width:'32px', padding:0}}><Check size={16}/></button>
                        <button type="button" onClick={() => setEditingMemberId(null)} className="btn btn-secondary flex items-center justify-center shrink-0" style={{height:'32px', width:'32px', padding:0}}><X size={16}/></button>
                      </form>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="truncate">{m.full_name} {m.id === user.id ? '(Vos)' : ''}</span>
                        {isLocal && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: '600' }}>
                            Local
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isLocal && !editingMemberId && (
                      <button
                        onClick={() => { setLinkingMember(m); setShowLinkModal(true); }}
                        className="btn btn-secondary text-xs flex items-center gap-1"
                        style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem', border: '1px solid var(--primary)', color: 'var(--primary)', height: 'auto' }}
                        title="Vincular con una cuenta de correo"
                      >
                        <Link2 size={12} /> Vincular
                      </button>
                    )}
                    {canModify && !editingMemberId && (
                       <>
                         {isLocal && (
                           <button onClick={() => { setEditingMemberId(m.id); setEditMemberName(m.full_name); }} className="text-muted hover:text-primary" style={{background:'none', border:'none', padding:2, cursor:'pointer'}}><Edit2 size={16} /></button>
                         )}
                         <button onClick={() => handleDeleteMember(m.id)} className="text-muted hover:text-danger" style={{background:'none', border:'none', padding:2, cursor:'pointer'}}><Trash2 size={16} /></button>
                       </>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Modal Registrar Gasto */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="card w-full animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}>
            <h2 className="mb-3 text-lg font-semibold">Registrar {expType === 'income' ? 'Ingreso' : 'Gasto'}</h2>
            <form onSubmit={handleAddExpense}>
              <div className="input-group">
                <label className="mb-2 block">Tipo de Movimiento</label>
                <div className="flex gap-2 p-1 rounded-xl mb-2" style={{ backgroundColor: 'rgba(15, 20, 35, 0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    type="button"
                    onClick={() => setExpType('expense')}
                    style={{ 
                      flex: 1, padding: '0.5rem 0', fontSize: '0.875rem', fontWeight: '600', borderRadius: '0.5rem', cursor: 'pointer', border: 'none', outline: 'none', transition: 'all 0.2s',
                      backgroundColor: expType === 'expense' ? 'var(--primary)' : 'transparent',
                      color: expType === 'expense' ? 'white' : 'var(--text-muted)',
                      boxShadow: expType === 'expense' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                    }}
                  >
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpType('income')}
                    style={{ 
                      flex: 1, padding: '0.5rem 0', fontSize: '0.875rem', fontWeight: '600', borderRadius: '0.5rem', cursor: 'pointer', border: 'none', outline: 'none', transition: 'all 0.2s',
                      backgroundColor: expType === 'income' ? 'var(--success)' : 'transparent',
                      color: expType === 'income' ? 'white' : 'var(--text-muted)',
                      boxShadow: expType === 'income' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                    }}
                  >
                    Ingreso
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label>Descripción</label>
                <input type="text" className="input" value={expDesc} onChange={e => setExpDesc(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Monto Total ($)</label>
                <input type="number" step="0.01" className="input" value={expAmount} onChange={e => setExpAmount(e.target.value)} required />
              </div>

              {group.group_type !== 'ledger' && (
                <div className="input-group">
                  <label className="mb-2 block font-medium text-sm">Dividir entre:</label>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '0.75rem' }}>
                    {members.map(member => {
                      const isChecked = selectedSplitMembers.includes(member.id);
                      return (
                        <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(member.id)}
                          />
                          <span>{member.full_name} {member.id === user.id ? '(Vos)' : ''}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="input-group">
                <label className="mb-2 block font-medium text-sm">Comprobante / Ticket (Opcional)</label>
                <div className="flex flex-col gap-2 items-center justify-center p-4 border border-dashed rounded-xl bg-gray-50" style={{ borderColor: 'var(--border)' }}>
                  {receiptPreviewUrl ? (
                    <div className="relative w-full flex flex-col items-center">
                      <img 
                        src={receiptPreviewUrl} 
                        alt="Comprobante" 
                        className="rounded-lg mb-3 border shadow-sm" 
                        style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary text-xs" 
                        onClick={() => { setReceiptBase64(''); setReceiptMimeType(''); setReceiptPreviewUrl(''); }}
                        style={{ width: 'auto', padding: '4px 8px', color: 'var(--danger)', borderColor: 'var(--danger)', height: 'auto' }}
                      >
                        Quitar foto
                      </button>
                    </div>
                  ) : (
                    <label className="btn btn-secondary w-full flex justify-center items-center cursor-pointer" style={{ margin: 0, padding: '0.85rem' }}>
                      <Camera size={20} className="mr-2" />
                      <span>Tomar o Subir Foto</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, false)} 
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted mb-4 text-center">
                {group.group_type === 'ledger' 
                  ? `El ${expType === 'income' ? 'ingreso' : 'gasto'} quedará registrado en el torneo.` 
                  : `El ${expType === 'income' ? 'ingreso' : 'gasto'} se dividirá en partes iguales entre los ${selectedSplitMembers.length} miembros seleccionados.`}
              </p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={group.group_type !== 'ledger' && selectedSplitMembers.length === 0}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Gasto */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="card w-full animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}>
            <h2 className="mb-3 text-lg font-semibold">Editar {editType === 'income' ? 'Ingreso' : 'Gasto'}</h2>
            <form onSubmit={handleEditExpense}>
              <div className="input-group">
                <label className="mb-2 block">Tipo de Movimiento</label>
                <div className="flex gap-2 p-1 rounded-xl mb-2 border" style={{ backgroundColor: 'var(--surface-dim)', borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setEditType('expense')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors`}
                    style={{ 
                      backgroundColor: editType === 'expense' ? 'var(--primary)' : 'transparent',
                      color: editType === 'expense' ? 'white' : 'var(--text-muted)',
                      boxShadow: editType === 'expense' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('income')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors`}
                    style={{ 
                      backgroundColor: editType === 'income' ? 'var(--success)' : 'transparent',
                      color: editType === 'income' ? 'white' : 'var(--text-muted)',
                      boxShadow: editType === 'income' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Ingreso
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label>Descripción</label>
                <input type="text" className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Monto Total ($)</label>
                <input type="number" step="0.01" className="input" value={editAmount} onChange={e => setEditAmount(e.target.value)} required />
              </div>

              {group.group_type !== 'ledger' && (
                <div className="input-group">
                  <label className="mb-2 block font-medium text-sm">Dividir entre:</label>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '0.75rem' }}>
                    {members.map(member => {
                      const isChecked = editSelectedSplitMembers.includes(member.id);
                      return (
                        <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => handleEditCheckboxChange(member.id)}
                          />
                          <span>{member.full_name} {member.id === user.id ? '(Vos)' : ''}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="input-group">
                <label className="mb-2 block font-medium text-sm">Comprobante / Ticket</label>
                <div className="flex flex-col gap-2 items-center justify-center p-4 border border-dashed rounded-xl bg-gray-50" style={{ borderColor: 'var(--border)' }}>
                  {editReceiptPreviewUrl && !editReceiptRemoved ? (
                    <div className="relative w-full flex flex-col items-center">
                      <img 
                        src={editReceiptPreviewUrl} 
                        alt="Comprobante" 
                        className="rounded-lg mb-3 border shadow-sm" 
                        style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary text-xs" 
                        onClick={() => { setEditReceiptBase64(''); setEditReceiptMimeType(''); setEditReceiptPreviewUrl(''); setEditReceiptRemoved(true); }}
                        style={{ width: 'auto', padding: '4px 8px', color: 'var(--danger)', borderColor: 'var(--danger)', height: 'auto' }}
                      >
                        Quitar foto
                      </button>
                    </div>
                  ) : (
                    <label className="btn btn-secondary w-full flex justify-center items-center cursor-pointer" style={{ margin: 0, padding: '0.85rem' }}>
                      <Camera size={20} className="mr-2" />
                      <span>Tomar o Subir Foto</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, true)} 
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted mb-4 text-center">
                {group.group_type === 'ledger' 
                  ? `El ${editType === 'income' ? 'ingreso' : 'gasto'} quedará registrado en el torneo.` 
                  : `El ${editType === 'income' ? 'ingreso' : 'gasto'} se dividirá en partes iguales entre los ${editSelectedSplitMembers.length} miembros seleccionados.`}
              </p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); setEditingExpense(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={group.group_type !== 'ledger' && editSelectedSplitMembers.length === 0}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación de Gasto */}
      {showDeleteExpenseConfirm && (
        <div className="modal-overlay">
          <div className="card w-full animate-fade-in" style={{ maxWidth: '400px' }}>
            <h2 className="mb-4 text-danger">¿Eliminar Gasto?</h2>
            <p className="text-sm text-muted mb-6">
              ¿Estás seguro de que deseas eliminar <strong>"{showDeleteExpenseConfirm.description}"</strong>? {group.group_type !== 'ledger' && "Esto recalculará y restablecerá todas las deudas de los participantes."}
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteExpenseConfirm(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteExpense} style={{ backgroundColor: 'var(--danger)', color: 'white' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vincular Miembro Local */}
      {showLinkModal && linkingMember && (
        <div className="modal-overlay">
          <div className="card w-full animate-fade-in" style={{ maxWidth: '400px' }}>
            <h2 className="mb-2">Vincular Miembro Local</h2>
            <p className="text-sm text-muted mb-4">
              Vincula a <strong>{linkingMember.full_name}</strong> con una cuenta de correo real. Todo su historial de deudas y pagos se transferirá a esa cuenta de forma permanente.
            </p>
            <form onSubmit={handleLinkLocalMember}>
              <div className="input-group">
                <label>Correo Electrónico del Usuario Registrado</label>
                <input 
                  type="email" 
                  className="input" 
                  value={linkEmail} 
                  onChange={e => setLinkEmail(e.target.value)} 
                  placeholder="usuario@correo.com"
                  required 
                />
              </div>
              {linkSuccess && <p className="text-xs text-success mb-2 font-medium">{linkSuccess}</p>}
              {linkError && <p className="text-xs text-danger mb-2 font-medium">{linkError}</p>}
              <div className="flex gap-2 mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowLinkModal(false); setLinkingMember(null); setLinkEmail(''); setLinkError(''); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Vincular y Fusionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Comprobante */}
      {viewingReceiptUrl && (
        <div className="modal-overlay" onClick={() => setViewingReceiptUrl('')}>
          <div className="card w-full animate-fade-in relative flex flex-col items-center p-6" style={{ maxWidth: '500px', maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" 
              onClick={() => setViewingReceiptUrl('')}
              style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              &times;
            </button>
            <h2 className="mb-4 text-center">Constancia de Gasto</h2>
            <img 
              src={viewingReceiptUrl} 
              alt="Comprobante de gasto" 
              className="w-full rounded-lg object-contain border max-h-[60vh] mb-4" 
            />
            <button 
              className="btn btn-secondary" 
              onClick={() => setViewingReceiptUrl('')}
              style={{ width: '100%' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
