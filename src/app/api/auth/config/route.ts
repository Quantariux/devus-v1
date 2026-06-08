import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB6gO7qbTSECOWUaMUXxPgkUtBSnFd2gMY",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0276152407.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gen-lang-client-0276152407",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0276152407.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1098470865939",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1098470865939:web:1417c15351a492173b13e6"
  });
}
