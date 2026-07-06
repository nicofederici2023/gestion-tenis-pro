import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationPrompt from '../components/NotificationPrompt';
import { Plus, MoreVertical, Edit2, Trash2, Download } from 'lucide-react';
import { usePwa } from '../context/PwaContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { isInstallable, installApp } = usePwa();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal / Menu state
  const [showModal, setShowModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupType, setNewGroupType] = useState('shared');

  const [activeGroupMenu, setActiveGroupMenu] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupType, setEditGroupType] = useState('shared');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (*)
        `)
        .eq('profile_id', user.id);

      if (error) throw error;
      setGroups(data.map(d => d.groups).filter(Boolean));
    } catch (error) {
      console.error('Error fetching groups:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [user]);

  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveGroupMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      // Create group
      const { data: group, error } = await supabase
        .from('groups')
        .insert([{
          name: newGroupName,
          description: newGroupDesc,
          group_type: newGroupType,
          creator_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Add as member
      await supabase
        .from('group_members')
        .insert([{
          group_id: group.id,
          profile_id: user.id
        }]);

      setShowModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupType('shared');
      fetchGroups(); // reload
    } catch (error) {
      console.error('Error creating group:', error.message);
    }
  };

  const handleEditGroup = async (e) => {
    e.preventDefault();
    if (!editingGroup) return;

    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: editGroupName,
          description: editGroupDesc,
          group_type: editGroupType
        })
        .eq('id', editingGroup.id)
        .eq('creator_id', user.id);

      if (error) throw error;
      setEditingGroup(null);
      fetchGroups();
    } catch (error) {
      console.error('Error updating group:', error.message);
    }
  };

  const handleDeleteGroup = async () => {
    if (!showDeleteConfirm) return;

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', showDeleteConfirm.id)
        .eq('creator_id', user.id);

      if (error) throw error;
      setShowDeleteConfirm(null);
      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error.message);
    }
  };

  return (
    <div>
      <div className="header mb-6" style={{ margin: '-1.5rem -1.5rem 1.5rem -1.5rem' }}>
        <h1 className="text-xl">Gastos</h1>
        <div className="flex gap-2">
          {isInstallable && (
            <button 
              onClick={installApp} 
              className="btn btn-secondary flex items-center justify-center" 
              style={{ width: 'auto', padding: '0.5rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none' }}
              title="Instalar App"
            >
              <Download size={20} />
            </button>
          )}
          <button 
            onClick={() => setShowModal(true)} 
            className="btn btn-primary" 
            style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
          >
            <Plus size={18} className="mr-1" /> Nuevo
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted">Cargando...</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted mb-4">No tienes ningún torneo o gasto registrado todavía.</p>
          <button onClick={() => setShowModal(true)} className="btn btn-secondary" style={{width: 'auto'}}>
            Crear tu primer torneo
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(group => {
            const isCreator = group.creator_id === user.id;
            return (
              <div key={group.id} style={{ position: 'relative' }}>
                <Link to={`/group/${group.id}`} style={{textDecoration: 'none', display: 'block'}}>
                  <div className="card" style={{ marginBottom: 0, paddingRight: '3.5rem' }}>
                    <h3>{group.name}</h3>
                    {group.description && <p className="text-sm text-muted mt-1">{group.description}</p>}
                    <div className="mt-3 text-xs text-muted flex items-center gap-2">
                      <span className="truncate">Creado el {new Date(group.created_at).toLocaleDateString()} {isCreator && ' • Creador'}</span>
                      {group.group_type === 'ledger' ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                          SOLO REGISTRO
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                          COMPARTIDO
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {isCreator && (
                  <div style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', zIndex: 5 }}>
                    <button
                      className="context-menu-trigger"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveGroupMenu(activeGroupMenu === group.id ? null : group.id);
                      }}
                    >
                      <MoreVertical size={20} />
                    </button>
                    
                    {activeGroupMenu === group.id && (
                      <div className="context-menu-dropdown" style={{ right: 0, top: '2.5rem' }}>
                        <button
                          className="context-menu-item"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingGroup(group);
                            setEditGroupName(group.name);
                            setEditGroupDesc(group.description || '');
                            setEditGroupType(group.group_type || 'shared');
                            setActiveGroupMenu(null);
                          }}
                        >
                          <Edit2 size={16} /> Editar
                        </button>
                        <button
                          className="context-menu-item danger"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowDeleteConfirm(group);
                            setActiveGroupMenu(null);
                          }}
                        >
                          <Trash2 size={16} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NotificationPrompt />

      {/* Modal Crear Gasto */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="card w-full animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 className="mb-3 text-lg font-semibold">Nuevo Torneo</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="input-group">
                <label>Nombre (ej. Torneo Interclubes)</label>
                <input 
                  type="text" 
                  className="input" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Descripción (Opcional)</label>
                <input 
                  type="text" 
                  className="input" 
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                />
              </div>
              <div className="input-group mt-2">
                <label className="mb-2 block">Tipo de Torneo</label>
                <div className="flex gap-2">
                  <div 
                    onClick={() => setNewGroupType('shared')}
                    className="flex-1 p-2 rounded-lg border cursor-pointer transition-all"
                    style={{ 
                      borderColor: newGroupType === 'shared' ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: newGroupType === 'shared' ? 'var(--primary-light)' : 'transparent'
                    }}
                  >
                    <div className="font-semibold text-xs mb-1 flex items-center gap-1.5" style={{ color: newGroupType === 'shared' ? 'var(--primary)' : 'var(--text-main)' }}>
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                      Compartido
                    </div>
                    <div className="text-[10px] text-muted leading-tight">Divide gastos automáticamente.</div>
                  </div>
                  <div 
                    onClick={() => setNewGroupType('ledger')}
                    className="flex-1 p-2 rounded-lg border cursor-pointer transition-all"
                    style={{ 
                      borderColor: newGroupType === 'ledger' ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: newGroupType === 'ledger' ? 'var(--primary-light)' : 'transparent'
                    }}
                  >
                    <div className="font-semibold text-xs mb-1 flex items-center gap-1.5" style={{ color: newGroupType === 'ledger' ? 'var(--primary)' : 'var(--text-main)' }}>
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                      Solo Registro
                    </div>
                    <div className="text-[10px] text-muted leading-tight">Como un libro contable.</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Gasto */}
      {editingGroup && (
        <div className="modal-overlay" onClick={() => setEditingGroup(null)}>
          <div className="card w-full animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 className="mb-3 text-lg font-semibold">Editar Torneo</h2>
            <form onSubmit={handleEditGroup}>
              <div className="input-group">
                <label>Nombre</label>
                <input 
                  type="text" 
                  className="input" 
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Descripción</label>
                <input 
                  type="text" 
                  className="input" 
                  value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                />
              </div>
              <div className="input-group mt-2">
                <label className="mb-2 block">Tipo de Torneo</label>
                <div className="flex gap-2">
                  <div 
                    onClick={() => setEditGroupType('shared')}
                    className="flex-1 p-2 rounded-lg border cursor-pointer transition-all"
                    style={{ 
                      borderColor: editGroupType === 'shared' ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: editGroupType === 'shared' ? 'var(--primary-light)' : 'transparent'
                    }}
                  >
                    <div className="font-semibold text-xs mb-1 flex items-center gap-1.5" style={{ color: editGroupType === 'shared' ? 'var(--primary)' : 'var(--text-main)' }}>
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                      Compartido
                    </div>
                    <div className="text-[10px] text-muted leading-tight">Divide gastos automáticamente.</div>
                  </div>
                  <div 
                    onClick={() => setEditGroupType('ledger')}
                    className="flex-1 p-2 rounded-lg border cursor-pointer transition-all"
                    style={{ 
                      borderColor: editGroupType === 'ledger' ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: editGroupType === 'ledger' ? 'var(--primary-light)' : 'transparent'
                    }}
                  >
                    <div className="font-semibold text-xs mb-1 flex items-center gap-1.5" style={{ color: editGroupType === 'ledger' ? 'var(--primary)' : 'var(--text-main)' }}>
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                      Solo Registro
                    </div>
                    <div className="text-[10px] text-muted leading-tight">Como un libro contable.</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingGroup(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="card w-full animate-fade-in" style={{ maxWidth: '400px' }}>
            <h2 className="mb-4 text-danger">¿Eliminar Torneo?</h2>
            <p className="text-sm text-muted mb-6">
              Esta acción eliminará de forma permanente el torneo <strong>{showDeleteConfirm.name}</strong>, todos sus detalles, saldos y participantes registrados. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteGroup} style={{ backgroundColor: 'var(--danger)', color: 'white' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
