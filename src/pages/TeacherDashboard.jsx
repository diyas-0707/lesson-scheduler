import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { respondToRequest } from '../lib/reschedule';
import { acceptConnectionRequest, rejectConnectionRequest, requestConnectionByEmail } from '../lib/connect';
import DeleteAccountButton from '../components/DeleteAccountButton';

export default function TeacherDashboard() {
  const { user, profile, logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [cutoffHours, setCutoffHours] = useState(profile?.rescheduleCutoffHours ?? 48);
  const [studentEmail, setStudentEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    const unsubStudents = onSnapshot(
      collection(db, 'users', user.uid, 'students'),
      (snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubRequests = onSnapshot(
      collection(db, 'users', user.uid, 'rescheduleRequests'),
      (snap) => setRequests(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => r.status === 'pending')
      )
    );
    // Students who entered your email, waiting for you to confirm.
    const q = query(
      collection(db, 'connectionRequests'),
      where('teacherId', '==', user.uid),
      where('status', '==', 'pending'),
      where('initiatedBy', '==', 'student')
    );
    const unsubConnections = onSnapshot(q, (snap) =>
      setConnectionRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubStudents(); unsubRequests(); unsubConnections(); };
  }, [user.uid]);

  async function saveCutoff() {
    await updateDoc(doc(db, 'users', user.uid), { rescheduleCutoffHours: Number(cutoffHours) });
  }

  async function inviteByEmail(e) {
    e.preventDefault();
    setInviteError('');
    try {
      await requestConnectionByEmail({
        fromUid: user.uid, fromProfile: profile, fromRole: 'teacher', toEmail: studentEmail
      });
      setInviteSent(true);
      setStudentEmail('');
    } catch (err) {
      setInviteError(err.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1 className="display">Your Studio</h1>
        <button className="ghost" onClick={logout}>Sign out</button>
      </header>

      <section>
        <h2>Invite code</h2>
        <p>Share this with students so they can connect:</p>
        <span className="invite-code">{profile.inviteCode}</span>
      </section>

      <section>
        <h2>Add a student by email</h2>
        <p>They'll need to have signed in once already, and will confirm the request on their end.</p>
        <form onSubmit={inviteByEmail} style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            placeholder="Student's email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
          />
          <button className="ghost" type="submit">Send</button>
        </form>
        {inviteSent && <p style={{ fontSize: 13, color: 'var(--sage)', marginTop: 8 }}>Request sent.</p>}
        {inviteError && <p className="error">{inviteError}</p>}
      </section>

      {connectionRequests.length > 0 && (
        <section>
          <h2>Students waiting for your confirmation</h2>
          {connectionRequests.map((r) => (
            <div key={r.id} className="request-card">
              <p style={{ margin: 0 }}>{r.studentName} ({r.studentEmail})</p>
              <div>
                <button className="primary" onClick={() => acceptConnectionRequest(r.id, r)}>Confirm</button>
                <button className="ghost" onClick={() => rejectConnectionRequest(r.id)}>Decline</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2>Reschedule cutoff</h2>
        <p>Requests inside this window need your approval; outside it, students can rebook freely.</p>
        <input
          type="number"
          value={cutoffHours}
          onChange={(e) => setCutoffHours(e.target.value)}
          onBlur={saveCutoff}
        /> hours
      </section>

      {requests.length > 0 && (
        <section>
          <h2>Pending reschedule requests</h2>
          {requests.map((r) => (
            <div key={r.id} className="request-card">
              <p style={{ margin: 0 }}>{r.studentName}: {r.fromDate} → {r.toDate} {r.toStartTime}</p>
              <div>
                <button className="primary" onClick={() => respondToRequest(user.uid, r.id, true)}>Approve</button>
                <button className="ghost" onClick={() => respondToRequest(user.uid, r.id, false)}>Deny</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2>Students ({students.length})</h2>
        {students.map((s) => (
          <div key={s.id} className="student-row">
            <span>{s.name}</span>
            <span>
              {s.recurringSlot
                ? `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.recurringSlot.dayOfWeek]} ${s.recurringSlot.startTime}`
                : 'No slot assigned yet'}
            </span>
          </div>
        ))}
      </section>

      {/* TODO next: weekly availability editor (users/{uid}/availability),
          and a calendar showing all lessons/{lessonId} for the week. */}

      <section>
        <DeleteAccountButton />
      </section>
    </div>
  );
}