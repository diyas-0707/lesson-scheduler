import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  acceptConnectionRequest, connectStudentToTeacher, generateInviteCode,
  rejectConnectionRequest, requestConnectionByEmail
} from '../lib/connect';

export default function ChooseRole() {
  const { user, profile, setProfile } = useAuth();
  const [pickedStudent, setPickedStudent] = useState(false);
  const [code, setCode] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [incoming, setIncoming] = useState([]);

  // Requests a teacher has already sent to this email, waiting for confirmation.
  useEffect(() => {
    const q = query(
      collection(db, 'connectionRequests'),
      where('studentId', '==', user.uid),
      where('status', '==', 'pending'),
      where('initiatedBy', '==', 'teacher')
    );
    return onSnapshot(q, (snap) => setIncoming(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user.uid]);

  async function becomeTeacher() {
    const inviteCode = generateInviteCode();
    await updateDoc(doc(db, 'users', user.uid), { role: 'teacher', inviteCode });
    setProfile({ ...profile, role: 'teacher', inviteCode });
  }

  async function joinWithCode(e) {
    e.preventDefault();
    setError('');
    try {
      const teacherId = await connectStudentToTeacher(user.uid, profile, code.trim().toUpperCase());
      setProfile({ ...profile, role: 'student', teacherId });
    } catch (err) {
      setError(err.message);
    }
  }

  async function requestByEmail(e) {
    e.preventDefault();
    setError('');
    try {
      await requestConnectionByEmail({
        fromUid: user.uid, fromProfile: profile, fromRole: 'student', toEmail: teacherEmail
      });
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirm(request) {
    await acceptConnectionRequest(request.id, request);
    setProfile({ ...profile, role: 'student', teacherId: request.teacherId });
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

      {incoming.length > 0 && (
        <div className="card" style={{ marginTop: 24, textAlign: 'left', width: 280 }}>
          <h2>Waiting for your confirmation</h2>
          {incoming.map((r) => (
            <div key={r.id} className="request-card">
              <p style={{ margin: 0 }}>{r.teacherName} ({r.teacherEmail}) wants to add you as a student.</p>
              <div>
                <button className="primary" onClick={() => confirm(r)}>Confirm</button>
                <button className="ghost" onClick={() => rejectConnectionRequest(r.id)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!pickedStudent && (
        <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
          {/* In practice you'd only show one of these — the teacher account
              gets created once, ahead of time, then shares the invite code
              or looks up students by email. */}
          <button className="primary" onClick={becomeTeacher}>I'm the teacher</button>
          <button className="ghost" onClick={() => setPickedStudent(true)}>I'm a student</button>
        </div>
      )}

      {pickedStudent && (
        <div style={{ marginTop: 26, width: 280 }}>
          <form onSubmit={joinWithCode} style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              placeholder="Invite code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="primary" type="submit">Connect</button>
          </form>

          <p style={{ margin: '14px 0 6px', fontSize: 13, color: 'var(--ink-soft)' }}>— or —</p>

          {sent ? (
            <p style={{ fontSize: 14 }}>Request sent — your teacher needs to confirm it on their end.</p>
          ) : (
            <form onSubmit={requestByEmail} style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="Teacher's email"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
              />
              <button className="ghost" type="submit">Request</button>
            </form>
          )}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}