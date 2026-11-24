import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:
    (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) ||
    'AIzaSyB_M-huyoNGR8rv1FfkwErpbqhvR-mHPb4',
  authDomain:
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ||
    'cuaderno-los-nazco-fam.firebaseapp.com',
  projectId:
    (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) ||
    'cuaderno-los-nazco-fam',
  storageBucket:
    (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) ||
    'cuaderno-los-nazco-fam.firebasestorage.app',
  messagingSenderId:
    (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) ||
    '345606443460',
  appId:
    (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) ||
    '1:345606443460:web:a401fbc940c51d7ca55491',
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
export const firestoreDb: Firestore = getFirestore(firebaseApp);
export const firebaseAuth: Auth = getAuth(firebaseApp);

let authPromise: Promise<string | null> | null = null;

/**
 * Ensures a silent Firebase Auth session exists (Anonymous Auth) so every
 * family phone holds a verified Firebase Auth token for Firestore security rules.
 */
export function ensureFirebaseSession(): Promise<string | null> {
  if (firebaseAuth.currentUser) {
    return Promise.resolve(firebaseAuth.currentUser.uid);
  }
  if (!authPromise) {
    authPromise = signInAnonymously(firebaseAuth)
      .then((cred) => cred.user.uid)
      .catch(() => null)
      .finally(() => {
        authPromise = null;
      });
  }
  return authPromise;
}
