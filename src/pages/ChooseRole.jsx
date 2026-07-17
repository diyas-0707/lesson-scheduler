import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { connectStudentToTeacher, generateInviteCode } from '../lib/connect';

export default function ChooseRole() {
  const { user, profile, setProfile } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function becomeTeacher() {
    const inviteCode = generateInviteCode();
    await updateDoc(doc(db, 'users', user.uid), { role: 'teacher', inviteCode });
    setProfile({ ...profile, role: 'teacher', inviteCode });
  }

  async function joinAsStudent(e) {
    e.preventDefault();
    setError('');
    try {
      const teacherId = await connectStudentToTeacher(user.uid, profile, code.trim().toUpperCase());
      setProfile({ ...profile, role: 'student', teacherId });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="center">
      <h1 className="display" style={{ fontSize: 24 }}>Are you the teacher, or a student?</h1>
      <svg className="staff" viewBox="0 0 56 18" aria-hidden="true">
        <line x1="0" y1="1" x2="56" y2="1" />
        <line x1="0" y1="5" x2="56" y2="5" />
        <line x1="0" y1="9" x2="56" y2="9" />
        <line x1="0" y1="13" x2="56" y2="13" />
        <line x1="0" y1="17" x2="56" y2="17" />
      </svg>

      <div style={{ marginTop: 26 }}>
        {/* In practice you'd only show one of these — the teacher account
            gets created once, ahead of time, then shares the invite code. */}
        <button className="primary" onClick={becomeTeacher}>I'm the teacher</button>
      </div>

      <form onSubmit={joinAsStudent} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <input
          placeholder="Enter invite code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button className="ghost" type="submit">Connect</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}