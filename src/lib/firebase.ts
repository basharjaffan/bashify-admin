import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCqIB9nVq-MFmpJrpv_w0PQ4e6wIynw8tQ",
  authDomain: "bashify-af01b.firebaseapp.com",
  projectId: "bashify-af01b",
  storageBucket: "bashify-af01b.firebasestorage.app",
  messagingSenderId: "843703440251",
  appId: "1:843703440251:web:248c817882b416b9aee3de"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export { app };
