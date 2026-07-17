import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import ChooseRole from './pages/ChooseRole';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentView from './pages/StudentView';

function Gate() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="center">Loading…</div>;
  if (!user) return <Login />;
  if (!profile?.role) return <ChooseRole />;
  return profile.role === 'teacher' ? <TeacherDashboard /> : <StudentView />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Gate />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
