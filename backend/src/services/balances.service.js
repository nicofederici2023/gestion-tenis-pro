const { supabase } = require('../config/supabase');

// Recalculate group balances from scratch based on all expenses and settlements
const recalculateGroupBalances = async (groupId) => {
  try {
    // 1. Obtener miembros del grupo
    const { data: members, error: memError } = await supabase
      .from('group_members')
      .select('profile_id')
      .eq('group_id', groupId);

    if (memError) throw memError;
    if (!members || members.length === 0) return;

    const netBalances = {};
    members.forEach(m => {
      netBalances[m.profile_id] = 0;
    });

    // 2. Obtener gastos y sus participaciones
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select(`
        id,
        paid_by_id,
        amount_cents,
        description,
        expense_shares (profile_id, share_type)
      `)
      .eq('group_id', groupId);

    if (expError) throw expError;

    // 3. Calcular balances netos
    if (expenses && expenses.length > 0) {
      expenses.forEach(exp => {
        const isSettlement = exp.description.startsWith('Liquidación:');
        if (isSettlement) {
          const debtorId = exp.paid_by_id;
          const creditorShare = exp.expense_shares.find(s => s.share_type === 'settlement_recipient');
          if (creditorShare) {
            const creditorId = creditorShare.profile_id;
            // El deudor pagó (su balance neto sube, o sea, debe menos/tiene más saldo a favor)
            netBalances[debtorId] = (netBalances[debtorId] || 0) + exp.amount_cents;
            // El acreedor recibió (su balance neto baja, o sea, tiene menos saldo a favor)
            netBalances[creditorId] = (netBalances[creditorId] || 0) - exp.amount_cents;
          }
        } else {
          const payerId = exp.paid_by_id;
          // Participantes del gasto (quienes comparten)
          const shares = exp.expense_shares.filter(s => s.share_type !== 'settlement_recipient');
          
          // Al pagador se le acredita la totalidad
          netBalances[payerId] = (netBalances[payerId] || 0) + exp.amount_cents;
          
          // A cada participante se le debita su parte
          if (shares.length > 0) {
            const shareAmount = Math.round(exp.amount_cents / shares.length);
            shares.forEach(s => {
              netBalances[s.profile_id] = (netBalances[s.profile_id] || 0) - shareAmount;
            });
          }
        }
      });
    }

    // 4. Calcular el plan simplificado de liquidación de deudas
    const debtors = [];
    const creditors = [];
    for (const [profileId, net] of Object.entries(netBalances)) {
      if (net < 0) {
        debtors.push({ id: profileId, amount: -net });
      } else if (net > 0) {
        creditors.push({ id: profileId, amount: net });
      }
    }

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const newBalances = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      newBalances.push({
        group_id: groupId,
        debtor_id: debtor.id,
        creditor_id: creditor.id,
        amount_cents: amount,
        state: 'pending'
      });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }

    // 5. Reemplazar balances en la base de datos de manera atómica
    const { error: deleteError } = await supabase
      .from('balances')
      .delete()
      .eq('group_id', groupId);

    if (deleteError) throw deleteError;

    if (newBalances.length > 0) {
      const { error: insertError } = await supabase
        .from('balances')
        .insert(newBalances);

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error recalculating balances:', error.message);
    throw error;
  }
};

// Simplified Greedy Algorithm to settle debts (retained for backward compatibility if needed)
const calculateSettlement = (balances) => {
  const netBalances = {};

  balances.forEach(b => {
    if (!netBalances[b.debtor_id]) netBalances[b.debtor_id] = 0;
    if (!netBalances[b.creditor_id]) netBalances[b.creditor_id] = 0;
    
    netBalances[b.debtor_id] -= b.amount_cents;
    netBalances[b.creditor_id] += b.amount_cents;
  });

  const debtors = [];
  const creditors = [];

  for (const [id, amount] of Object.entries(netBalances)) {
    if (amount < 0) debtors.push({ id, amount: -amount });
    if (amount > 0) creditors.push({ id, amount });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const amount = Math.min(debtor.amount, creditor.amount);
    
    settlements.push({
      from: debtor.id,
      to: creditor.id,
      amount_cents: amount
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return settlements;
};

module.exports = {
  recalculateGroupBalances,
  calculateSettlement
};
