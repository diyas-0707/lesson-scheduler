import { useState } from 'react';
import { deleteAccount } from '../lib/account';
import { useAuth } from '../contexts/AuthContext';

export default function DeleteAccountButton() {
  const { profile } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await deleteAccount(profile);
      // Auth state listener in AuthContext picks up the sign-out
      // automatically and returns to the login screen.
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button className="danger-link" onClick={() => setConfirming(true)}>
        Delete my account
      </button>
    );
  }

  return (
    <div className="danger-confirm">
      <p>
        This permanently deletes your account and data
        {profile.role === 'teacher' ? ' — including your student roster and schedule' : ''}.
        This can't be undone.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Yes, delete it'}
        </button>
        <button className="ghost" onClick={() => setConfirming(false)} disabled={deleting}>
          Cancel
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}