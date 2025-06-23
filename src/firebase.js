import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAsg2lL30ZeVSaRIUhaIyMI0bAEZ7LqL5w",
  authDomain: "aat-tasks.firebaseapp.com",
  projectId: "aat-tasks",
  storageBucket: "aat-tasks.firebasestorage.app",
  messagingSenderId: "242226990759",
  appId: "1:242226990759:web:42a53b6871e11dc2435582",
  measurementId: "G-D1WMQC728R"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
