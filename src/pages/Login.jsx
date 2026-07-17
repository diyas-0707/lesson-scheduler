import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  return (
    <div className="center">
      <h1 className="display">Flute Lesson Scheduler</h1>
      <svg className="staff" viewBox="0 0 56 18" aria-hidden="true">
        <line x1="0" y1="1" x2="56" y2="1" />
        <line x1="0" y1="5" x2="56" y2="5" />
        <line x1="0" y1="9" x2="56" y2="9" />
        <line x1="0" y1="13" x2="56" y2="13" />
        <line x1="0" y1="17" x2="56" y2="17" />
      </svg>
      <p style={{ color: 'var(--ink-soft)', margin: '18px 0 22px', maxWidth: 280 }}>
        Sign in to see your lessons and your teacher's availability.
      </p>
      <button className="primary" onClick={login}>Sign in with Google</button>
    </div>
  );
}