import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCCuR8D6JwmTC7JX_dacZ4V639iJsqkkrc",
  authDomain: "project-a9aee.firebaseapp.com",
  projectId: "project-a9aee",
  storageBucket: "project-a9aee.firebasestorage.app",
  messagingSenderId: "749741253470",
  appId: "1:749741253470:web:58983b58dd628524a3e5cf"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
