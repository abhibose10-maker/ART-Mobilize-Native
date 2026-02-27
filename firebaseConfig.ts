import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyC_fWpYSYECgHhhwaMwTbXsfJiKjuDdftA',
  authDomain: 'studio-7368177292-70057.firebaseapp.com',
  projectId: 'studio-7368177292-70057',
  storageBucket: 'studio-7368177292-70057.appspot.com',
  messagingSenderId: '592687174079',
  appId: '1:592687174079:web:5c5847a8aca748a762510a',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const firebaseApp = app;
export const firestore = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

