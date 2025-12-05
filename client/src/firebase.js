// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "mern-estaurant.firebaseapp.com",
  projectId: "mern-estaurant",
  storageBucket: "mern-estaurant.firebasestorage.app",
  messagingSenderId: "339060297900",
  appId: "1:339060297900:web:fa37d35606c00db0adcf09",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
