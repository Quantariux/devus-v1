import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth-verify";

const DB_BASE_URL = "https://gen-lang-client-0276152407-default-rtdb.firebaseio.com";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = await verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }

    const res = await fetch(`${DB_BASE_URL}/conversations.json?auth=${token}`);
    if (!res.ok) {
      return NextResponse.json({ error: `Database error: ${res.statusText}` }, { status: res.status });
    }
    const data = await res.json();
    if (data) {
      return NextResponse.json(data);
    }
    return NextResponse.json([]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = await verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }

    const body = await request.json();
    const { conversations } = body;
    if (!conversations) {
      return NextResponse.json({ error: "Missing conversations" }, { status: 400 });
    }
    
    const res = await fetch(`${DB_BASE_URL}/conversations.json?auth=${token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conversations)
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Database error: ${res.statusText}` }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
