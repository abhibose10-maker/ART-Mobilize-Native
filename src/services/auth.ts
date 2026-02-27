// auth.ts

import firebase from 'firebase/app';
import 'firebase/auth';

const firebaseConfig = {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_AUTH_DOMAIN',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID'
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Firebase Auth service
const auth = firebase.auth();

export const signIn = async (email: string, password: string) => {
    return await auth.signInWithEmailAndPassword(email, password);
};

export const signOut = async () => {
    return await auth.signOut();
};

export const signUp = async (email: string, password: string) => {
    return await auth.createUserWithEmailAndPassword(email, password);
};

export const onAuthStateChanged = (callback: (user: firebase.User | null) => void) => {
    return auth.onAuthStateChanged(callback);
};
