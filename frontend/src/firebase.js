import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updateProfile,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDmf8iFv7tOqN2syEFdhVLmdx7JEqJATF4",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "cardioscan-app.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "cardioscan-app",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "cardioscan-app.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "479361637892",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:479361637892:web:25af22ef9961e6be851f51",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-NMMDWC4NLJ",
};

// Initialize Firebase App & Auth instance
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updateProfile,
  signOut,
};

export default app;
