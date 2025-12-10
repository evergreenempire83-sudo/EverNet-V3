hereimport { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAF3tkafh0Tq13G3of8SUaWQDvPFohxcE4",
  authDomain: "evernetmusic.firebaseapp.com",
  projectId: "evernetmusic",
  storageBucket: "evernetmusic.firebasestorage.app",
  messagingSenderId: "1061505207436",
  appId: "1:1061505207436:web:5ff254924dabd1adefffa9",
  measurementId: "G-S8BZEVZSTL"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
