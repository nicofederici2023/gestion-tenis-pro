const { supabase } = require('../config/supabase');
const { recalculateGroupBalances } = require('../services/balances.service');

const uploadReceiptToSupabase = async (base64Data, mimeType, expenseId) => {
  try {
    // 1. Decode base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 2. Define file extension from mimeType
    let ext = 'jpg';
    if (mimeType && mimeType.includes('png')) ext = 'png';
    else if (mimeType && mimeType.includes('pdf')) ext = 'pdf';
    
    const fileName = `receipt_${expenseId}_${Date.now()}.${ext}`;

    // 3. Upload buffer to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, buffer, {
        contentType: mimeType || 'image/jpeg',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 4. Get public URL
    const { data } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    console.error('Failed to upload receipt:', err.message);
    return null;
  }
};

const createExpense = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { description, amount_cents, currency, date, split_among, receipt_base64, receipt_mime_type, type } = req.body;

    // 1. Insert expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert([{
        group_id: groupId,
        paid_by_id: req.user.id,
        description,
        amount_cents,
        currency: currency || 'ARS',
        date: date || new Date().toISOString().split('T')[0],
        type: type || 'expense'
      }])
      .select()
      .single();

    if (expenseError) throw expenseError;

    // 2. Upload receipt if base64 data is present
    let finalDescription = description;
    if (receipt_base64) {
      const publicUrl = await uploadReceiptToSupabase(receipt_base64, receipt_mime_type, expense.id);
      if (publicUrl) {
        finalDescription = `${description} || receipt:${publicUrl}`;
        // Update database with description appending the receipt URL
        const { error: updateDescError } = await supabase
          .from('expenses')
          .update({ description: finalDescription })
          .eq('id', expense.id);

        if (!updateDescError) {
          expense.description = finalDescription;
        }
      }
    }

    // 3. Insert expense shares
    if (split_among && split_among.length > 0) {
      const sharesToInsert = split_among.map(profileId => ({
        expense_id: expense.id,
        profile_id: profileId,
        share_type: profileId === req.user.id ? 'paid_and_split' : 'split' 
      }));

      const { error: sharesError } = await supabase
        .from('expense_shares')
        .insert(sharesToInsert);

      if (sharesError) throw sharesError;
    }

    // 4. Recalculate balances
    await recalculateGroupBalances(groupId);

    // 5. Simulate Notification
    console.log(`[NOTIFICATION] Sending email to participants of expense: ${finalDescription}`);

    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


const getExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        paid_by:profiles!expenses_paid_by_id_fkey(id, full_name),
        shares:expense_shares(profile_id, share_type)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false }); // Sort by creation order to keep payments at the top/bottom correctly

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        shares:expense_shares(profile_id, share_type)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount_cents, currency, date, split_among, receipt_base64, receipt_mime_type, type } = req.body;

    // 1. Get old expense to verify ownership and get group_id & description
    const { data: oldExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('group_id, paid_by_id, description')
      .eq('id', id)
      .single();

    if (fetchError || !oldExpense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    if (oldExpense.paid_by_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para editar este gasto' });
    }

    // 2. Determine final description (preserve, update, or remove receipt)
    let finalDescription = description;
    if (receipt_base64) {
      const publicUrl = await uploadReceiptToSupabase(receipt_base64, receipt_mime_type, id);
      if (publicUrl) {
        finalDescription = `${description} || receipt:${publicUrl}`;
      }
    } else if (receipt_base64 === null) {
      // Receipt removed explicitly
      finalDescription = description;
    } else {
      // Preserve old receipt if it existed
      const oldDesc = oldExpense.description || '';
      if (oldDesc.includes(' || receipt:')) {
        const receiptPart = oldDesc.substring(oldDesc.indexOf(' || receipt:'));
        finalDescription = `${description}${receiptPart}`;
      }
    }

    // 3. Update expense values
    const { data: expense, error: updateError } = await supabase
      .from('expenses')
      .update({ 
        description: finalDescription, 
        amount_cents, 
        currency: currency || 'ARS', 
        date: date || new Date().toISOString().split('T')[0],
        type: type || 'expense'
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 4. Delete old shares and insert new ones
    const { error: deleteSharesError } = await supabase
      .from('expense_shares')
      .delete()
      .eq('expense_id', id);

    if (deleteSharesError) throw deleteSharesError;

    if (split_among && split_among.length > 0) {
      const sharesToInsert = split_among.map(profileId => ({
        expense_id: id,
        profile_id: profileId,
        share_type: profileId === req.user.id ? 'paid_and_split' : 'split'
      }));

      const { error: insertSharesError } = await supabase
        .from('expense_shares')
        .insert(sharesToInsert);

      if (insertSharesError) throw insertSharesError;
    }

    // 5. Recalculate group balances
    await recalculateGroupBalances(oldExpense.group_id);

    res.status(200).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get old expense to verify ownership and get group_id
    const { data: oldExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('group_id, paid_by_id')
      .eq('id', id)
      .single();

    if (fetchError || !oldExpense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    if (oldExpense.paid_by_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este gasto' });
    }

    // 2. Delete expense (cascade delete handles shares on DB)
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // 3. Recalculate group balances
    await recalculateGroupBalances(oldExpense.group_id);

    res.status(200).json({ message: 'Gasto eliminado con éxito' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
};
