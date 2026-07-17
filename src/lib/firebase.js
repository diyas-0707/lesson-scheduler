import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: replace with this project's own Firebase config
// (create a new Firebase project for the flute scheduler —
// keep it separate from the dance tracker's project)
const firebaseConfig = {
  apiKey: "AIzaSyAQm_jCLFWm8snbs0jCOOWP6AYMiSbhuaY",
  authDomain: "lesson-scheduler-bd50c.firebaseapp.com",
  projectId: "lesson-scheduler-bd50c",
  storageBucket: "lesson-scheduler-bd50c.firebasestorage.app",
  messagingSenderId: "167821025290",
  appId: "1:167821025290:web:6e5729288b71abe6c5bff3"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
