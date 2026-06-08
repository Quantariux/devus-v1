import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB6gO7qbTSECOWUaMUXxPgkUtBSnFd2gMY",
  authDomain: "gen-lang-client-0276152407.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0276152407-default-rtdb.firebaseio.com",
  projectId: "gen-lang-client-0276152407",
  storageBucket: "gen-lang-client-0276152407.firebasestorage.app",
  messagingSenderId: "1098470865939",
  appId: "1:1098470865939:web:1417c15351a492173b13e6",
  measurementId: "G-TXHN3DPPCD"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

export { app, db };
