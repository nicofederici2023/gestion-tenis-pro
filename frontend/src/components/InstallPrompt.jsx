import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share, X, CheckCircle } from 'lucide-react';
import { usePwa } from '../context/PwaContext';

export default function InstallPrompt() {
  const { isInstallable, isIOS, isStandalone, installed, installApp } = usePwa();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa_prompt_dismissed') === 'true');
  const [iosDelayPassed, setIosDelayPassed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (isIOS) {
      const timer = setTimeout(() => setIosDelayPassed(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isIOS]);

  const handleInstallClick = async () => {
    const success = await installApp();
    if (success) {
      // no-op, usePwa will update isStandalone
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    setDismissed(true);
  };

  // No mostrar el banner general en la pantalla de login (donde habrá un widget dedicado)
  if (location.pathname === '/login') return null;

  if (installed) {
    return (
      <div style={{
        position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: 'var(--secondary)', color: 'black', padding: '1rem 1.5rem',
        borderRadius: '16px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '0.5rem',
        boxShadow: 'var(--shadow-lg)', fontWeight: '600', animation: 'fadeIn 0.3s ease-out'
      }}>
        <CheckCircle size={20} />
        ¡App instalada con éxito! 🎾
      </div>
    );
  }

  const showPrompt = !isStandalone && !dismissed && (isInstallable || (isIOS && iosDelayPassed));
  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 2rem)', maxWidth: '450px',
      backgroundColor: 'var(--surface)', border: '1.5px solid var(--primary)',
      borderRadius: '20px', padding: '1.25rem', zIndex: 100,
      boxShadow: '0 20px 25px -5px rgba(99, 102, 241, 0.15), 0 10px 10px -5px rgba(99, 102, 241, 0.1)',
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
      animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div style={{
            backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
            padding: '8px', borderRadius: '12px', display: 'flex'
          }}>
            <Download size={20} />
          </div>
          <div>
            <h4 style={{ fontWeight: '700', fontSize: '0.95rem' }}>Instalar App "Gestion Tenis Pro"</h4>
            <p className="text-xs text-muted">Accedé más rápido a tus gastos de tenis desde tu pantalla de inicio</p>
          </div>
        </div>
        <button 
          onClick={handleDismiss} 
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '2px'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {isIOS ? (
        <div className="text-xs text-muted" style={{ padding: '0.5rem', background: 'var(--background)', borderRadius: '12px', lineHeight: '1.4' }}>
          <p className="flex items-center gap-1.5 mb-1" style={{ fontWeight: '600', color: 'var(--text-main)' }}>
            <Share size={14} style={{ color: 'var(--primary)' }} /> Instrucciones para iPhone/iPad:
          </p>
          1. Tocá el botón de <strong>Compartir</strong> en la barra inferior de Safari.<br />
          2. Deslizá hacia abajo y selecciona <strong>"Agregar a inicio"</strong> o <strong>"Add to Home Screen"</strong>.
        </div>
      ) : (
        <div className="flex gap-2 mt-1">
          <button onClick={handleDismiss} className="btn btn-secondary" style={{ flex: 1, padding: '0.6rem' }}>
            Ahora no
          </button>
          <button onClick={handleInstallClick} className="btn btn-primary" style={{ flex: 2, padding: '0.6rem' }}>
            Instalar
          </button>
        </div>
      )}
    </div>
  );
}
