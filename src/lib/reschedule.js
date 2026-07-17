import {
  addDoc, collection, doc, getDoc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

const DEFAULT_CUTOFF_HOURS = 48;

/**
 * Decides whether a reschedule needs teacher approval, based on how close
 * the CURRENT lesson time is to now, compared to the teacher's configured
 * cutoff (users/{teacherId}.rescheduleCutoffHours, default 48h).
 */
export function hoursUntil(lessonDate, lessonStartTime) {
  const lessonDateTime = new Date(`${lessonDate}T${lessonStartTime}:00`);
  const diffMs = lessonDateTime.getTime() - Date.now();
  return diffMs / (1000 * 60 * 60);
}

export async function requestReschedule({
  teacherId, studentId, studentName, lessonId,
  fromDate, fromStartTime, toDate, toStartTime
}) {
  const teacherSnap = await getDoc(doc(db, 'users', teacherId));
  const cutoffHours = teacherSnap.data()?.rescheduleCutoffHours ?? DEFAULT_CUTOFF_HOURS;

  const hoursAway = hoursUntil(fromDate, fromStartTime);
  const withinCutoff = hoursAway < cutoffHours;

  const lessonRef = doc(db, 'users', teacherId, 'lessons', lessonId);

  if (withinCutoff) {
    // Too close to the lesson to auto-move it — needs teacher sign-off.
    await updateDoc(lessonRef, { status: 'pending_reschedule' });
    await addDoc(collection(db, 'users', teacherId, 'rescheduleRequests'), {
      studentId,
      studentName,
      lessonId,
      fromDate,
      toDate,
      toStartTime,
      requestedAt: serverTimestamp(),
      status: 'pending'
    });
    return { autoApplied: false, cutoffHours, hoursAway };
  }

  // Outside the cutoff — apply immediately, no approval needed.
  await updateDoc(lessonRef, {
    date: toDate,
    startTime: toStartTime,
    originalDate: fromDate,
    status: 'confirmed'
  });
  return { autoApplied: true, cutoffHours, hoursAway };
}

export async function respondToRequest(teacherId, requestId, approve) {
  const requestRef = doc(db, 'users', teacherId, 'rescheduleRequests', requestId);
  const snap = await getDoc(requestRef);
  const req = snap.data();

  const lessonRef = doc(db, 'users', teacherId, 'lessons', req.lessonId);

  if (approve) {
    await updateDoc(lessonRef, {
      date: req.toDate,
      startTime: req.toStartTime,
      originalDate: req.fromDate,
      status: 'confirmed'
    });
  } else {
    await updateDoc(lessonRef, { status: 'confirmed' }); // revert to original slot
  }

  await updateDoc(requestRef, { status: approve ? 'approved' : 'denied' });
}
