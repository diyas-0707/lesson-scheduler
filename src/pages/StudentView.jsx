import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { requestReschedule, hoursUntil } from '../lib/reschedule';
import DeleteAccountButton from '../components/DeleteAccountButton';

export default function StudentView() {
  const { user, profile, logout } = useAuth();
  const [myLesson, setMyLesson] = useState(null);
  const [openSlots, setOpenSlots] = useState([]);

  useEffect(() => {
    if (!profile?.teacherId) return;

    const lessonsQ = query(
      collection(db, 'users', profile.teacherId, 'lessons'),
      where('studentId', '==', user.uid)
    );
    const unsubLesson = onSnapshot(lessonsQ, (snap) => {
      const upcoming = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.status !== 'cancelled')
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      setMyLesson(upcoming || null);
    });

    // TODO: derive real open slots from users/{teacherId}/availability
    // minus already-booked users/{teacherId}/lessons for that week.
    const unsubAvail = onSnapshot(
      collection(db, 'users', profile.teacherId, 'availability'),
      (snap) => setOpenSlots(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => { unsubLesson(); unsubAvail(); };
  }, [profile?.teacherId, user.uid]);

  async function handleReschedule(toDate, toStartTime) {
    if (!myLesson) return;
    const result = await requestReschedule({
      teacherId: profile.teacherId,
      studentId: user.uid,
      studentName: profile.name,
      lessonId: myLesson.id,
      fromDate: myLesson.date,
      fromStartTime: myLesson.startTime,
      toDate,
      toStartTime
    });
    alert(result.autoApplied
      ? 'Lesson moved!'
      : "Sent to your teacher for approval — you're close to the cutoff window.");
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1 className="display">My Lessons</h1>
        <button className="ghost" onClick={logout}>Sign out</button>
      </header>

      <section>
        <h2>Upcoming lesson</h2>
        {myLesson ? (
          <p>
            {myLesson.date} at {myLesson.startTime}
            {myLesson.status === 'pending_reschedule' && ' (reschedule pending teacher approval)'}
          </p>
        ) : (
          <p>No upcoming lesson scheduled yet — check with your teacher.</p>
        )}
      </section>

      <section>
        <h2>Teacher's availability</h2>
        <p>Pick a new time to reschedule your lesson into:</p>
        {openSlots.map((slot) => (
          <button key={slot.id} className="slot-chip" onClick={() => handleReschedule(myLesson?.date, slot.startTime)}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][slot.dayOfWeek]} {slot.startTime}
          </button>
        ))}
      </section>

      <section>
        <DeleteAccountButton />
      </section>
    </div>
  );
}