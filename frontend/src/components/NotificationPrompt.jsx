import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '../config/supabase';

// Helper for VAPID conversion
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationPrompt() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if push messaging is supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking push subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeUser = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // Send to backend
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const apiUrl = import.meta.env.VITE_API_URL || '';
      
      const response = await fetch(`${apiUrl}/api/notifications/subscribe`, {
        method: 'POST',
        body: JSON.stringify({ subscription }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription on server');
      }

      setIsSubscribed(true);
      alert('¡Notificaciones activadas con éxito!');
    } catch (err) {
      console.error('Failed to subscribe the user: ', err);
      if (Notification.permission === 'denied') {
        alert('Debes permitir las notificaciones en la configuración de tu navegador.');
      } else {
        alert('Ocurrió un error al intentar suscribirse a las notificaciones.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  // If already subscribed, do not show anything to save space
  if (isSubscribed) {
    return null;
  }

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell size={24} className="text-muted" />
          <div>
            <h3 className="font-semibold text-lg">Notificaciones</h3>
            <p className="text-sm text-muted">
              Activa las notificaciones para enterarte cuando se registre un gasto.
            </p>
          </div>
        </div>
        <button 
          onClick={subscribeUser} 
          disabled={loading}
          className="btn btn-primary"
          style={{ width: 'auto' }}
        >
          {loading ? 'Cargando...' : 'Activar'}
        </button>
      </div>
    </div>
  );
}
