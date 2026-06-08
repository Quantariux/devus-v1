import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth-verify";
import { runOrchestrator } from "@/lib/agent-sdk/orchestrator";

const DB_BASE_URL = "https://gen-lang-client-0276152407-default-rtdb.firebaseio.com";
const RUN_COST = 20;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verify User Token
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
    const userUrl = `${DB_BASE_URL}/users/${userId}.json?auth=${token}`;
    
    const userRes = await fetch(userUrl);
    if (!userRes.ok) {
      return NextResponse.json({ error: `Database error: ${userRes.statusText}` }, { status: userRes.status });
    }

    const userData = await userRes.json();
    if (!userData) {
      return NextResponse.json({ error: "User profile not found. Please verify auth details." }, { status: 404 });
    }

    const userRole = userData.role || "user";
    const userBalance = userData.balance !== undefined ? userData.balance : 0;

    let isDeducted = false;

    // 2. Perform Credit Gating
    if (userRole === "admin") {
      isDeducted = false;
    } else {
      if (userBalance < RUN_COST) {
        return NextResponse.json(
          { error: `Insufficient credits to run VM container. Required: ${RUN_COST}, Available: ${userBalance}` },
          { status: 402 }
        );
      }
      
      // Deduct balance
      const balanceUrl = `${DB_BASE_URL}/users/${userId}/balance.json?auth=${token}`;
      await fetch(balanceUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userBalance - RUN_COST)
      });
      isDeducted = true;
    }

    // 3. Log usage metrics (both user & admin) via POST
    const usageLogsUrl = `${DB_BASE_URL}/usage_logs/${userId}.json?auth=${token}`;
    await fetch(usageLogsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        operation: "run_container",
        cost: RUN_COST,
        deducted: isDeducted
      })
    });

    // 4. Initialize VM log state
    const containerUrl = `${DB_BASE_URL}/projects/${id}/container.json?auth=${token}`;
    const logsUrl = `${DB_BASE_URL}/projects/${id}/container/logs.json?auth=${token}`;
    
    // Clear logs
    await fetch(logsUrl, {
      method: "DELETE"
    });
    
    // Set initial status
    await fetch(containerUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "launching",
        alwaysOn: true,
        agentStatus: "idle",
        url: `https://project-${id}.devus.space`
      })
    });

    // Run Agent SDK Orchestrator loop in background
    (async () => {
      try {
        await runOrchestrator(id, token);
      } catch (err: unknown) {
        console.error("Agent SDK Orchestrator error:", err);
      }
    })();

    return NextResponse.json({ 
      success: true, 
      message: "VM container initialized",
      deducted: isDeducted,
      newBalance: isDeducted ? userBalance - RUN_COST : userBalance
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
