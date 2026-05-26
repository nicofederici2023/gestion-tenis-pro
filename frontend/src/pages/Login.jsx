import { useState } from 'react';
import { supabase } from '../config/supabase';
import { useNavigate } from 'react-router-dom';
import { Trophy, Download, Share } from 'lucide-react';
import { usePwa } from '../context/PwaContext';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIosTip, setShowIosTip] = useState(false);
  
  const navigate = useNavigate();
  const { isInstallable, isIOS, isStandalone, installApp } = usePwa();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        
        if (error) throw error;
        
        if (data.user) {
          await supabase.from('profiles').insert([{
            id: data.user.id,
            email,
            full_name: fullName
          }]);
        }
        
        if (!error) navigate('/');

      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">


      <div className="mb-8 text-center" style={{ zIndex: 2 }}>
        <div className="flex justify-center mb-4 text-secondary">
          <Trophy size={56} style={{ filter: 'drop-shadow(0 0 10px var(--secondary))' }} />
        </div>
        <h1 className="text-3xl text-primary" style={{ textShadow: '0 0 10px rgba(2, 132, 199, 0.5)' }}>Gestion Tenis Pro</h1>
        <p className="text-muted mt-2">Gestión de gastos para torneos de tenis</p>
      </div>

      <div className="card w-full" style={{ zIndex: 2, background: 'rgba(31, 40, 51, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(69, 162, 158, 0.5)' }}>
        <h2 className="mb-4 text-center">{isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-danger rounded-md text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth}>
          {isSignUp && (
            <div className="input-group">
              <label>Nombre completo</label>
              <input
                type="text"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Contraseña</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className={`btn mt-4 ${isSignUp ? 'btn-register' : 'btn-primary'}`} 
            disabled={loading}
          >
            {loading ? 'Cargando...' : isSignUp ? 'Registrarse' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          {isSignUp ? (
            <button 
              type="button" 
              className="text-primary font-medium border-none bg-transparent cursor-pointer text-sm"
              onClick={() => setIsSignUp(false)}
            >
              ¿Ya tenés cuenta? Ingresá
            </button>
          ) : (
            <button 
              type="button" 
              className="btn-switch-register"
              onClick={() => setIsSignUp(true)}
            >
              ¿No tenés cuenta? Registrate
            </button>
          )}
        </div>
      </div>

      {/* PWA Installation Card in Login Screen */}
      <div style={{ zIndex: 2, width: '100%' }}>
        {isStandalone ? (
          <div className="login-pwa-card text-center">
            <div className="login-pwa-title justify-center">
              <span>¡App instalada con éxito! 🎾</span>
            </div>
            <p className="login-pwa-desc">Estás navegando en modo nativo.</p>
          </div>
        ) : isInstallable ? (
          <div className="login-pwa-card">
            <div className="login-pwa-title">
              <Download size={18} />
              <span>Instalar App "Gestion Tenis Pro"</span>
            </div>
            <p className="login-pwa-desc">Instalá la aplicación en tu celular para gestionar torneos y gastos sin conexión.</p>
            <button type="button" className="btn btn-secondary w-full" onClick={installApp}>
              Instalar Aplicación
            </button>
          </div>
        ) : isIOS ? (
          <div className="login-pwa-card">
            <div className="login-pwa-title">
              <Download size={18} />
              <span>Instalar en tu iPhone</span>
            </div>
            <p className="login-pwa-desc">Agregá esta app a tu pantalla de inicio desde Safari.</p>
            <button 
              type="button" 
              className="btn btn-secondary w-full" 
              onClick={() => setShowIosTip(!showIosTip)}
            >
              {showIosTip ? 'Ocultar instrucciones' : 'Cómo instalar en iOS'}
            </button>
            {showIosTip && (
              <div className="text-xs text-muted mt-3 p-3 bg-black/40 rounded-xl border border-primary-light" style={{ lineHeight: '1.5' }}>
                <p className="flex items-center gap-1.5 mb-2 font-semibold text-main" style={{ color: 'var(--text-main)' }}>
                  <Share size={14} className="text-primary" /> Instrucciones Safari:
                </p>
                1. Presioná el botón de <strong>Compartir</strong> en la barra inferior de Safari.<br />
                2. Desplazá hacia abajo y elegí <strong>"Agregar a inicio"</strong> o <strong>"Add to Home Screen"</strong>.
              </div>
            )}
          </div>
        ) : (
          /* Fallback info when browser is not PWA capable or already installed but not standalone check */
          <div className="login-pwa-card text-center">
            <div className="login-pwa-title justify-center" style={{ color: 'var(--text-muted)' }}>
              <span>Gestion Tenis Pro PWA 📱</span>
            </div>
            <p className="login-pwa-desc" style={{ marginBottom: 0 }}>Para una mejor experiencia y control, podés instalar la app desde tu navegador.</p>
          </div>
        )}
      </div>
    </div>
  );
}
