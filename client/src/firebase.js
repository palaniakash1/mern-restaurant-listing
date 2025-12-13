// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "mern-restaurant-b5fb7.firebaseapp.com",
  projectId: "mern-restaurant-b5fb7",
  storageBucket: "mern-restaurant-b5fb7.firebasestorage.app",
  messagingSenderId: "575444610718",
  appId: "1:575444610718:web:aa49788fc5e2733ab6958f"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
