const { supabase } = require('../config/supabase');
const { calculateSettlement, recalculateGroupBalances } = require('../services/balances.service');

const getBalances = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const { data, error } = await supabase
      .from('balances')
      .select(`
        *,
        debtor:profiles!balances_debtor_id_fkey(id, full_name, photo_url),
        creditor:profiles!balances_creditor_id_fkey(id, full_name, photo_url)
      `)
      .eq('group_id', groupId)
      .gt('amount_cents', 0); // Solo deudas activas

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getSettlement = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const { data: balances, error } = await supabase
      .from('balances')
      .select('*')
      .eq('group_id', groupId);

    if (error) throw error;

    const settlements = calculateSettlement(balances);
    
    // Opcional: Obtener detalles de perfiles para los settlements
    const profileIds = [...new Set(settlements.flatMap(s => [s.from, s.to]))];
    
    let profiles = [];
    if (profileIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url')
        .in('id', profileIds);
      profiles = profileData || [];
    }

    const enrichedSettlements = settlements.map(s => ({
      ...s,
      from_profile: profiles.find(p => p.id === s.from),
      to_profile: profiles.find(p => p.id === s.to)
    }));

    res.status(200).json(enrichedSettlements);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const settleDebt = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { debtor_id, creditor_id, amount_cents } = req.body;

    // Buscar si existe la deuda para validar
    const { data: debt, error: fetchError } = await supabase
      .from('balances')
      .select('*')
      .eq('group_id', groupId)
      .eq('debtor_id', debtor_id)
      .eq('creditor_id', creditor_id)
      .single();

    if (fetchError || !debt) {
      return res.status(404).json({ error: 'Deuda no encontrada' });
    }

    // Registrar la transacción de liquidación en expenses
    const { data: debtorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', debtor_id)
      .single();
    const { data: creditorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', creditor_id)
      .single();

    const debtorName = debtorProfile?.full_name || 'Alguien';
    const creditorName = creditorProfile?.full_name || 'Alguien';

    const { data: settlementExpense, error: expInsertError } = await supabase
      .from('expenses')
      .insert([{
        group_id: groupId,
        paid_by_id: debtor_id,
        description: `Liquidación: ${debtorName} pagó a ${creditorName}`,
        amount_cents: amount_cents,
        currency: 'ARS',
        date: new Date().toISOString().split('T')[0]
      }])
      .select()
      .single();

    if (expInsertError) throw expInsertError;

    // Registrar la participación de la liquidación para identificar al acreedor
    const { error: shareInsertError } = await supabase
      .from('expense_shares')
      .insert([{
        expense_id: settlementExpense.id,
        profile_id: creditor_id,
        share_type: 'settlement_recipient'
      }]);

    if (shareInsertError) throw shareInsertError;

    // Recalcular los balances de forma centralizada y limpia
    await recalculateGroupBalances(groupId);

    res.status(200).json({ message: 'Deuda liquidada con éxito' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getBalances,
  getSettlement,
  settleDebt
};
