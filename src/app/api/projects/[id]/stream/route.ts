import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth-verify";

const DB_BASE_URL = "https://gen-lang-client-0276152407-default-rtdb.firebaseio.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Missing auth token parameter" }, { status: 401 });
    }

    const decoded = await verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }

    const { id } = await params;
    
    // Connect to Firebase RTDB SSE Stream
    const firebaseStreamUrl = `${DB_BASE_URL}/projects/${id}/container.json?auth=${token}`;
    const firebaseRes = await fetch(firebaseStreamUrl, {
      headers: { "Accept": "text/event-stream" }
    });

    if (!firebaseRes.ok) {
      return NextResponse.json({ error: `Database error: ${firebaseRes.statusText}` }, { status: firebaseRes.status });
    }

    const reader = firebaseRes.body?.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Enqueue connection established event
        controller.enqueue(encoder.encode("event: open\ndata: connection established\n\n"));
        
        let buffer = "";
        let lastEvent = "";
        
        try {
          if (!reader) {
            controller.close();
            return;
          }

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("event: ")) {
                lastEvent = trimmed.substring(7).trim();
              } else if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.substring(6).trim();
                if (dataStr === "null" || !dataStr) continue;
                
                try {
                  const parsed = JSON.parse(dataStr);
                  if (lastEvent === "put" && parsed.path === "/") {
                    // This is the full container object
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed.data)}\n\n`));
                  } else if (lastEvent === "put" || lastEvent === "patch") {
                    // Single property updated, fetch full state to push
                    const fullRes = await fetch(firebaseStreamUrl);
                    if (fullRes.ok) {
                      const fullData = await fullRes.json();
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(fullData)}\n\n`));
                    }
                  }
                } catch {
                  // ignore JSON parsing errors for system messages (e.g. keep-alive)
                }
              }
            }
          }
        } catch (error) {
          console.error("Firebase stream pipe error:", error);
          controller.error(error);
        } finally {
          reader?.releaseLock();
          controller.close();
        }
      },
      cancel() {
        reader?.cancel();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
