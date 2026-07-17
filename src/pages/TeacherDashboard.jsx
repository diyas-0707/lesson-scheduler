import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { respondToRequest } from '../lib/reschedule';

export default function TeacherDashboard() {
  const { user, profile, logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [cutoffHours, setCutoffHours] = useState(profile?.rescheduleCutoffHours ?? 48);

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
    return () => { unsubStudents(); unsubRequests(); };
  }, [user.uid]);

  async function saveCutoff() {
    await updateDoc(doc(db, 'users', user.uid), { rescheduleCutoffHours: Number(cutoffHours) });
  }

  return (
    <div className="dashboard">
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
              <p>{r.studentName}: {r.fromDate} → {r.toDate} {r.toStartTime}</p>
              <button onClick={() => respondToRequest(user.uid, r.id, true)}>Approve</button>
              <button onClick={() => respondToRequest(user.uid, r.id, false)}>Deny</button>
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
    </div>
  );
}