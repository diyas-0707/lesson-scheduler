import {
  collection, doc, getDocs, query, setDoc, updateDoc, where
} from 'firebase/firestore';
import { db } from './firebase';

/** Called once, by the teacher, to generate their shareable invite code. */
export function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Student enters a code; this looks up the teacher and links the two. */
export async function connectStudentToTeacher(studentUid, studentProfile, code) {
  const q = query(collection(db, 'users'), where('inviteCode', '==', code));
  const results = await getDocs(q);

  if (results.empty) {
    throw new Error('No teacher found with that invite code.');
  }

  const teacherDoc = results.docs[0];
  const teacherId = teacherDoc.id;

  await updateDoc(doc(db, 'users', studentUid), { teacherId, role: 'student' });

  await setDoc(doc(db, 'users', teacherId, 'students', studentUid), {
    studentId: studentUid,
    name: studentProfile.name,
    email: studentProfile.email,
    recurringSlot: null,       // teacher assigns this next, from the roster view
    connectedAt: new Date()
  });

  return teacherId;
}
