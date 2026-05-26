import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';

export default function Profile() {
  const { user, signOut } = useAuth();

  return (
    <div>
      <div className="header mb-6" style={{ margin: '-1.5rem -1.5rem 1.5rem -1.5rem' }}>
        <h1 className="text-xl">Mi Perfil</h1>
      </div>

      <div className="card flex flex-col items-center py-8">
        <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center font-bold text-3xl mb-4">
          <User size={40} />
        </div>
        <h2 className="text-xl mb-1">{user?.user_metadata?.full_name || 'Usuario'}</h2>
        <p className="text-muted mb-8">{user?.email}</p>

        <button onClick={signOut} className="btn btn-secondary flex items-center justify-center text-danger" style={{width: '100%', maxWidth: '250px'}}>
          <LogOut size={18} className="mr-2" /> Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
