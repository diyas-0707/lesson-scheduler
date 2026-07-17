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
      <h2>Are you the teacher, or a student?</h2>

      {/* In practice you'd only show one of these — the teacher account
          gets created once, ahead of time, then shares the invite code. */}
      <button onClick={becomeTeacher}>I'm the teacher</button>

      <form onSubmit={joinAsStudent}>
        <input
          placeholder="Enter invite code from your teacher"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit">Connect</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
