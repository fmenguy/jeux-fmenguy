/* ============================================
   AELINDRA · firebase.ts
   Initialisation Firebase (Auth + Firestore)
   ============================================ */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyBDiNQVfOpzxIzYxM8IoRE1T2DNJ2EhMFc',
  authDomain:        'aelindra-9482d.firebaseapp.com',
  projectId:         'aelindra-9482d',
  storageBucket:     'aelindra-9482d.firebasestorage.app',
  messagingSenderId: '193180189958',
  appId:             '1:193180189958:web:a53cdb3310d422081c0a87',
};

export const app            = initializeApp(firebaseConfig);
export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
