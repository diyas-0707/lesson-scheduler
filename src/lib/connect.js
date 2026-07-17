import {
  addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where
} from 'firebase/firestore';
import { db } from './firebase';

/** Called once, by the teacher, to generate their shareable invite code. */
export function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Student enters a code; this looks up the teacher and links the two immediately. */
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
    recurringSlot: null,
    connectedAt: new Date()
  });

  return teacherId;
}

/**
 * Email-based connection, mirroring the dance app: either side enters the
 * other person's email, which creates a pending request. Nothing is linked
 * until the other person confirms it — see acceptConnectionRequest below.
 * Requires the other person to have signed in at least once already.
 */
export async function requestConnectionByEmail({ fromUid, fromProfile, fromRole, toEmail }) {
  const q = query(collection(db, 'users'), where('email', '==', toEmail.trim()));
  const results = await getDocs(q);

  if (results.empty) {
    throw new Error("No account found with that email — they'll need to sign in once first.");
  }

  const toSnap = results.docs[0];
  const toUid = toSnap.id;
  const toData = toSnap.data();

  if (toUid === fromUid) {
    throw new Error("That's your own email.");
  }

  const payload = fromRole === 'student'
    ? {
        studentId: fromUid, studentName: fromProfile.name, studentEmail: fromProfile.email,
        teacherId: toUid, teacherName: toData.name, teacherEmail: toData.email,
        initiatedBy: 'student', status: 'pending', createdAt: serverTimestamp()
      }
    : {
        teacherId: fromUid, teacherName: fromProfile.name, teacherEmail: fromProfile.email,
        studentId: toUid, studentName: toData.name, studentEmail: toData.email,
        initiatedBy: 'teacher', status: 'pending', createdAt: serverTimestamp()
      };

  await addDoc(collection(db, 'connectionRequests'), payload);
}

/** The receiving side confirms — this is what actually creates the link. */
export async function acceptConnectionRequest(requestId, request) {
  const { studentId, teacherId, studentName, studentEmail } = request;

  await updateDoc(doc(db, 'users', studentId), { teacherId, role: 'student' });

  await setDoc(doc(db, 'users', teacherId, 'students', studentId), {
    studentId,
    name: studentName,
    email: studentEmail,
    recurringSlot: null,
    connectedAt: new Date()
  });

  await updateDoc(doc(db, 'connectionRequests', requestId), { status: 'accepted' });
}

export async function rejectConnectionRequest(requestId) {
  await updateDoc(doc(db, 'connectionRequests', requestId), { status: 'rejected' });
}