import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth-verify";

const DB_BASE_URL = "https://gen-lang-client-0276152407-default-rtdb.firebaseio.com";

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

    const userId = decoded.uid;
    const dbUrl = `${DB_BASE_URL}/users/${userId}.json?auth=${token}`;
    
    const userRes = await fetch(dbUrl);
    if (!userRes.ok) {
      return NextResponse.json({ error: `Database error: ${userRes.statusText}` }, { status: userRes.status });
    }

    const userData = await userRes.json();
    let finalUserData = null;

    if (!userData) {
      // First-time registration setup
      finalUserData = {
        email: decoded.email || "",
        role: "user",
        balance: 100, // default credits
        mfaEnabled: false,
        createdAt: new Date().toISOString()
      };
      await fetch(dbUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalUserData)
      });
    } else {
      finalUserData = userData;
      if (!finalUserData.email && decoded.email) {
        finalUserData.email = decoded.email;
        await fetch(dbUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalUserData)
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        uid: userId,
        email: finalUserData.email,
        role: finalUserData.role || "user",
        balance: finalUserData.balance !== undefined ? finalUserData.balance : 100,
        mfaEnabled: !!finalUserData.mfaEnabled
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Auth verification error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
