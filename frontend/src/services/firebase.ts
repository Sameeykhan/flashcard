import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Official Firebase Configuration for flashcarddb-57c02
 */
export const firebaseConfig = {
  apiKey: "AIzaSyC7cMyfCi2zjhxYrMtvOcVSUUfYCC_9sQk",
  authDomain: "flashcarddb-57c02.firebaseapp.com",
  projectId: "flashcarddb-57c02",
  storageBucket: "flashcarddb-57c02.firebasestorage.app",
  messagingSenderId: "655902012963",
  appId: "1:655902012963:web:dfbc2f770a5380338ea396",
  measurementId: "G-VFFVRKM89F",
};

// Safely initialize Firebase App (singleton pattern with try/catch)
let appInstance: FirebaseApp | null = null;
try {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (err) {
  console.warn('Firebase app initialization note:', err);
}

export const app: FirebaseApp | null = appInstance;

// Safely get or initialize Cloud Firestore
let firestoreInstance: Firestore | null = null;

export const getFirestoreDb = (): Firestore | null => {
  if (firestoreInstance) return firestoreInstance;
  if (!appInstance) return null;
  try {
    firestoreInstance = getFirestore(appInstance);
    return firestoreInstance;
  } catch (err) {
    console.warn('Firestore service initialization note:', err);
    return null;
  }
};

export const db: Firestore | null = getFirestoreDb();

// Analytics instance (safely initialized in browser environments)
let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined' && appInstance) {
  isSupported()
    .then((supported) => {
      if (supported && appInstance) {
        analyticsInstance = getAnalytics(appInstance);
      }
    })
    .catch(() => {
      // Fail gracefully if analytics is blocked
    });
}

export const getAnalyticsInstance = (): Analytics | null => analyticsInstance;
