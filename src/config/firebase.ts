import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyC_fWpYSYECgHhhwaMwTbXsfJiKjuDdftA',
  authDomain: 'studio-7368177292-70057.firebaseapp.com',
  projectId: 'studio-7368177292-70057',
  storageBucket: 'studio-7368177292-70057.appspot.com',
  messagingSenderId: '592687174079',
  appId: '1:592687174079:android:d08f45b9de3b327862510a'
};

// Safe initialization — won't crash if called twice
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { app };