import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { auth, db, googleProvider } from './firebase';

/**
 * Deletes the signed-in user's account entirely: their Firestore data,
 * any links to a teacher/student, pending connection requests, and the
 * Firebase Auth account itself. Irreversible.
 */
export async function deleteAccount(profile) {
  const uid = auth.currentUser.uid;
  const batch = writeBatch(db);

  if (profile.role === 'teacher') {
    // Delete everything under this teacher, and unlink any connected students.
    const subcollections = ['students', 'availability', 'availabilityOverrides', 'lessons', 'rescheduleRequests'];
    for (const sub of subcollections) {
      const snap = await getDocs(collection(db, 'users', uid, sub));
      snap.forEach((d) => batch.delete(d.ref));
      if (sub === 'students') {
        snap.forEach((d) => batch.update(doc(db, 'users', d.id), { teacherId: null }));
      }
    }
  } else if (profile.role === 'student' && profile.teacherId) {
    // Remove the mirrored roster doc and this student's lessons from their teacher.
    batch.delete(doc(db, 'users', profile.teacherId, 'students', uid));
    const lessonsSnap = await getDocs(
      query(collection(db, 'users', profile.teacherId, 'lessons'), where('studentId', '==', uid))
    );
    lessonsSnap.forEach((d) => batch.delete(d.ref));
  }

  // Clean up any connection requests this account sent or received.
  const asStudent = await getDocs(query(collection(db, 'connectionRequests'), where('studentId', '==', uid)));
  asStudent.forEach((d) => batch.delete(d.ref));
  const asTeacher = await getDocs(query(collection(db, 'connectionRequests'), where('teacherId', '==', uid)));
  asTeacher.forEach((d) => batch.delete(d.ref));

  batch.delete(doc(db, 'users', uid));
  await batch.commit();

  try {
    await deleteUser(auth.currentUser);
  } catch (err) {
    // Firebase requires a very recent sign-in to delete the auth account —
    // if it's been a while, prompt Google sign-in again, then retry.
    if (err.code === 'auth/requires-recent-login') {
      await reauthenticateWithPopup(auth.currentUser, googleProvider);
      await deleteUser(auth.currentUser);
    } else {
      throw err;
    }
  }
}