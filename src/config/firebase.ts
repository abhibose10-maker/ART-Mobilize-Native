import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC_fWpYSYECgHhhwaMwTbXsfJiKjuDdftA',
  authDomain: 'studio-7368177292-70057.firebaseapp.com',
  projectId: 'studio-7368177292-70057',
  storageBucket: 'studio-7368177292-70057.appspot.com',
  messagingSenderId: '592687174079',
  appId: '1:592687174079:android:d08f45b9de3b327862510a'
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

export { app, auth, db };
