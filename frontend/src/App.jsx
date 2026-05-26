import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Home, UserCircle, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { PwaProvider } from './context/PwaContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GroupDetail from './pages/GroupDetail';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import InstallPrompt from './components/InstallPrompt';
import TennisCourtBackground from './components/TennisCourtBackground';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const BottomNav = () => {
  const location = useLocation();
  
  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <Home size={24} />
        <span>Inicio</span>
      </Link>
      <Link to="/reports" className={`nav-item ${location.pathname === '/reports' ? 'active' : ''}`}>
        <BarChart3 size={24} />
        <span>Reportes</span>
      </Link>
      <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
        <UserCircle size={24} />
        <span>Perfil</span>
      </Link>
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <PwaProvider>
        <Router>
          <div className="app-container">
            {/* Global Tennis Court Background – glowing sparks, court lines & interactive tennis balls */}
            <TennisCourtBackground />
            <div className="content">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/group/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              </Routes>
            </div>
            
            <Routes>
              <Route path="/login" element={null} />
              <Route path="*" element={<BottomNav />} />
            </Routes>
            
            <InstallPrompt />
          </div>
        </Router>
      </PwaProvider>
    </AuthProvider>
  );
}

export default App;

