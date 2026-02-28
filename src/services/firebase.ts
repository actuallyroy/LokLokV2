import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBAKoay1KZqUau3m5tbvV1Z-lXjwPdbybs",
  authDomain: "loklokv2-9e1ca.firebaseapp.com",
  projectId: "loklokv2-9e1ca",
  storageBucket: "loklokv2-9e1ca.firebasestorage.app",
  messagingSenderId: "85644688474",
  appId: "1:85644688474:android:674f4a72fdf8698f066c63",
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

export function initializeFirebase() {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } else {
    app = getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
  }
  return { app, db, auth };
}

export function getFirebaseApp() {
  if (!app) {
    initializeFirebase();
  }
  return app;
}

export function getFirestoreDb() {
  if (!db) {
    initializeFirebase();
  }
  return db;
}

export function getFirebaseAuth() {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

export { app, db, auth };
