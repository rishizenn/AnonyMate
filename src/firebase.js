// ===================================
//              firebase.js
// ===================================

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; 
import { getAuth } from "firebase/auth"; // <-- NEW AUTH IMPORT

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALU87t3SUqBXN-oqp31ZY61CZjKJ_Wao4",
  authDomain: "anonymate-d1510.firebaseapp.com",
  projectId: "anonymate-d1510",
  storageBucket: "anonymate-d1510.firebasestorage.app",
  messagingSenderId: "570841078584",
  appId: "1:570841078584:web:b9f070361d467c7d923fcd",
  measurementId: "G-87J2992JJE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (optional)
const analytics = getAnalytics(app); 

// Initialize Firestore and export it
export const db = getFirestore(app);

// Initialize Auth and export it <-- NEW EXPORT
export const auth = getAuth(app);