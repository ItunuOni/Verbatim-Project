import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA1al1MYUCUJ-UhsKTqpYtsePzUMTKpHfk",
  authDomain: "verbatim-app-442b7.firebaseapp.com",
  projectId: "verbatim-app-442b7",
  storageBucket: "verbatim-app-442b7.firebasestorage.app",
  messagingSenderId: "842164187747",
  appId: "1:842164187747:web:29fe9f94f5f5facc4fbe56"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);