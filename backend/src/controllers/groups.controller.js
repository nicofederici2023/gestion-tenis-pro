const { supabase, createAuthClient } = require('../config/supabase');
const { recalculateGroupBalances } = require('../services/balances.service');

const createGroup = async (req, res) => {
  try {
    const { name, description, currency, budget_cents, group_type } = req.body;
    
    // Create group
    const { data: group, error } = await supabase
      .from('groups')
      .insert([{
        name,
        description,
        currency: currency || 'ARS',
        budget_cents,
        group_type: group_type || 'shared',
        creator_id: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    // Add creator as member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert([{
        group_id: group.id,
        profile_id: req.user.id
      }]);

    if (memberError) throw memberError;

    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getGroups = async (req, res) => {
  try {
    // Get groups where the user is a member
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups (*)
      `)
      .eq('profile_id', req.user.id);

    if (error) throw error;
    
    const groups = data.map(item => item.groups);
    res.status(200).json(groups);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, ensure the user is a member
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('profile_id', req.user.id)
      .single();
      
    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied or group not found' });
    }

    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        creator:profiles!groups_creator_id_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, currency, budget_cents, group_type } = req.body;

    const { data, error } = await supabase
      .from('groups')
      .update({ name, description, currency, budget_cents, group_type: group_type || 'shared' })
      .eq('id', id)
      .eq('creator_id', req.user.id) // Only creator can update
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)
      .eq('creator_id', req.user.id); // Only creator can delete

    if (error) throw error;
    res.status(200).json({ message: 'Group deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const joinGroup = async (req, res) => {
  try {
    const { id } = req.params;
    
    // En un escenario real esto podría requerir un link de invitación con token.
    // Aquí asumimos que si el ID es válido, se une.
    const { error } = await supabase
      .from('group_members')
      .insert([{
        group_id: id,
        profile_id: req.user.id
      }]);

    if (error) throw error;
    res.status(200).json({ message: 'Joined group successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        joined_at,
        profiles (id, full_name, email, photo_url)
      `)
      .eq('group_id', id);

    if (error) throw error;
    res.status(200).json(data.map(m => m.profiles));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const addMemberByEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'El correo electrónico es requerido' });
    }

    // 1. Buscar perfil por email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, photo_url')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      return res.status(404).json({ error: 'El usuario con ese correo no está registrado en la aplicación' });
    }

    // 2. Verificar si ya es miembro
    const { data: existingMember, error: existingMemberError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (existingMemberError) throw existingMemberError;

    if (existingMember) {
      return res.status(400).json({ error: 'El usuario ya pertenece a este grupo' });
    }

    // 3. Añadir al grupo
    const { error: insertError } = await supabase
      .from('group_members')
      .insert([{
        group_id: id,
        profile_id: profile.id
      }]);

    if (insertError) throw insertError;

    res.status(201).json({ message: 'Miembro añadido con éxito', profile });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const addLocalMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    // 1. Generate a direct UUID for the local/phantom member (Bypassing Supabase Auth)
    const crypto = require('crypto');
    const localUserId = crypto.randomUUID();

    // 2. Create profile with email = null to flag it as a local/phantom member
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: localUserId,
        email: null, // null marks local member
        full_name: full_name.trim()
      }]);

    if (profileError) throw profileError;

    // 4. Add to group_members
    const { error: memberError } = await supabase
      .from('group_members')
      .insert([{
        group_id: id,
        profile_id: localUserId
      }]);

    if (memberError) throw memberError;

    res.status(201).json({
      message: 'Miembro local añadido con éxito',
      profile: { id: localUserId, full_name: full_name.trim(), email: null }
    });
  } catch (error) {
    console.error('Error adding local member:', error.message);
    res.status(400).json({ error: error.message });
  }
};

const linkLocalMember = async (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'El correo electrónico es requerido' });
    }

    // 1. Find the real profile
    const { data: realProfile, error: realProfileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (realProfileError) throw realProfileError;

    if (!realProfile) {
      return res.status(404).json({ error: 'El correo ingresado no pertenece a ningún usuario registrado' });
    }

    if (realProfile.id === memberId) {
      return res.status(400).json({ error: 'No puedes vincular un perfil local a sí mismo' });
    }

    // 2. Check if real profile is already a member of this group
    const { data: realMembership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('profile_id', realProfile.id)
      .maybeSingle();

    // 3. Handle group membership transfer
    if (realMembership) {
      // Real member already exists in the group, just delete the phantom's membership row
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('profile_id', memberId);
    } else {
      // Real member is not in the group, replace the phantom membership with the real membership
      const { error: updateMemError } = await supabase
        .from('group_members')
        .update({ profile_id: realProfile.id })
        .eq('group_id', groupId)
        .eq('profile_id', memberId);

      if (updateMemError) throw updateMemError;
    }

    // 4. Update expenses paid by the phantom to the real profile
    const { error: updatePaidError } = await supabase
      .from('expenses')
      .update({ paid_by_id: realProfile.id })
      .eq('group_id', groupId)
      .eq('paid_by_id', memberId);

    if (updatePaidError) throw updatePaidError;

    // 5. Update expense shares (splits)
    // Find expenses in the group
    const { data: groupExpenses } = await supabase
      .from('expenses')
      .select('id')
      .eq('group_id', groupId);

    const expenseIds = groupExpenses ? groupExpenses.map(e => e.id) : [];

    if (expenseIds.length > 0) {
      // Handle potential duplicate shares by finding where real member already has a share
      const { data: realShares } = await supabase
        .from('expense_shares')
        .select('expense_id')
        .in('expense_id', expenseIds)
        .eq('profile_id', realProfile.id);

      const realShareExpenseIds = realShares ? realShares.map(s => s.expense_id) : [];

      if (realShareExpenseIds.length > 0) {
        // Delete phantom shares for those expenses to avoid unique key violation
        await supabase
          .from('expense_shares')
          .delete()
          .in('expense_id', realShareExpenseIds)
          .eq('profile_id', memberId);
      }

      // Update remaining phantom shares to the real profile
      const { error: updateShareError } = await supabase
        .from('expense_shares')
        .update({ profile_id: realProfile.id })
        .in('expense_id', expenseIds)
        .eq('profile_id', memberId);

      if (updateShareError) throw updateShareError;
    }

    // 6. Delete the phantom profile
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', memberId);

    if (deleteProfileError) throw deleteProfileError;

    // 7. Recalculate group balances
    await recalculateGroupBalances(groupId);

    res.status(200).json({
      message: 'Miembro local vinculado y fusionado con éxito',
      realProfile
    });
  } catch (error) {
    console.error('Error linking local member:', error.message);
    res.status(400).json({ error: error.message });
  }
};

const editLocalMember = async (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;
    const { full_name } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    // Ensure the requester is the group creator
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('creator_id')
      .eq('id', groupId)
      .single();
    
    if (groupError || !group) throw new Error('Grupo no encontrado');
    if (group.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el creador del grupo puede editar miembros locales' });
    }

    // We can only edit if it's a local member (email is null)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', memberId)
      .single();

    if (profileError || !profile) throw new Error('Perfil no encontrado');
    if (profile.email !== null) {
      return res.status(400).json({ error: 'No se puede editar el nombre de un usuario registrado con correo' });
    }

    // Update name
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: full_name.trim() })
      .eq('id', memberId);

    if (updateError) throw updateError;

    res.status(200).json({ message: 'Miembro local actualizado con éxito' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteMember = async (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;

    // Ensure the requester is the group creator
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('creator_id')
      .eq('id', groupId)
      .single();
    
    if (groupError || !group) throw new Error('Grupo no encontrado');
    if (group.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el creador del grupo puede eliminar miembros' });
    }

    if (memberId === group.creator_id) {
      return res.status(400).json({ error: 'El creador del grupo no puede ser eliminado' });
    }

    // Ensure the user has no unpaid expenses or pending balances
    // Since removing a user might break the balances, we just remove them from group_members. 
    // Wait, if we delete the member from group_members, their expenses might still exist or cascade delete.
    // Our DB schema: group_members has NO cascade to expenses.
    // We can delete their membership
    const { error: deleteMemError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('profile_id', memberId);

    if (deleteMemError) throw deleteMemError;

    // Check if it's a local member (no email), if they are in NO other groups, we can delete the profile
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', memberId).single();
    if (profile && profile.email === null) {
      const { data: otherGroups } = await supabase.from('group_members').select('id').eq('profile_id', memberId);
      if (!otherGroups || otherGroups.length === 0) {
        await supabase.from('profiles').delete().eq('id', memberId);
      }
    }

    await recalculateGroupBalances(groupId);

    res.status(200).json({ message: 'Miembro eliminado con éxito' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  getGroupMembers,
  addMemberByEmail,
  addLocalMember,
  linkLocalMember,
  editLocalMember,
  deleteMember
};

