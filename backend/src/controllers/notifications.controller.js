const webpush = require('web-push');
const { supabase } = require('../config/supabase');

// Set VAPID details
webpush.setVapidDetails(
  process.env.VAPID_MAILTO || 'mailto:test@test.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;
    const profile_id = req.user.id;

    if (!subscription) {
      return res.status(400).json({ error: 'Subscription is required' });
    }

    // Guardar la suscripción en la base de datos
    // Como las suscripciones pueden cambiar, podríamos actualizar si ya existe o crear una nueva.
    // Aquí asumimos que cada dispositivo tiene una suscripción distinta.
    const { error } = await supabase
      .from('push_subscriptions')
      .insert([
        { profile_id, subscription }
      ]);

    if (error) {
      // Si hay un error, tal vez ya existe o algo. 
      console.error('Error saving subscription:', error);
      throw error;
    }

    res.status(201).json({ message: 'Subscription added successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendNotificationToGroup = async (groupId, senderId, title, body) => {
  try {
    // 1. Obtener los miembros del grupo que NO son el sender
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('profile_id')
      .eq('group_id', groupId)
      .neq('profile_id', senderId);

    if (membersError || !members) {
      console.error('Error fetching group members for notifications:', membersError);
      return;
    }

    const memberIds = members.map(m => m.profile_id);
    if (memberIds.length === 0) return;

    // 2. Obtener las suscripciones de esos perfiles
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .in('profile_id', memberIds);

    if (subsError || !subscriptions || subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({ title, body, icon: '/vite.svg' });

    // 3. Enviar notificaciones
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
      } catch (err) {
        console.error('Error sending notification to sub', sub.id, err);
        // Si el error es 410 (Gone), la suscripción expiró y debemos borrarla
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }
  } catch (error) {
    console.error('sendNotificationToGroup error:', error);
  }
};

module.exports = {
  subscribe,
  sendNotificationToGroup
};
