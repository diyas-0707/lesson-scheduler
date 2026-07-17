import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  return (
    <div className="center">
      <h1>Flute Lesson Scheduler</h1>
      <p>Sign in to see your lessons and availability.</p>
      <button onClick={login}>Sign in with Google</button>
    </div>
  );
}
