/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { runAgentHarness } from "./harness";

const DB_BASE_URL = "https://gen-lang-client-0276152407-default-rtdb.firebaseio.com";
const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || "";

function formatTimestamp(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes < 10 ? "0" + minutes : minutes;
  const secStr = now.getSeconds() < 10 ? "0" + now.getSeconds() : now.getSeconds();
  return `${hours}:${minStr}:${secStr} ${ampm}`;
}

export async function runOrchestrator(
  projectId: string,
  token: string,
  userKey?: string
): Promise<void> {
  const apiKey = userKey || DEFAULT_API_KEY;
  const logsUrl = `${DB_BASE_URL}/projects/${projectId}/container/logs.json?auth=${token}`;
  
  const logToDB = async (message: string, type: "system" | "agent", isSuccess?: boolean) => {
    await fetch(logsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: formatTimestamp(),
        type,
        message,
        status: isSuccess ? "success" : undefined
      })
    });
  };

  try {
    await logToDB("Orchestrator: Fetching project conversation context...", "system");

    // 1. Get conversations to extract user prompts
    const convUrl = `${DB_BASE_URL}/conversations.json?auth=${token}`;
    const convRes = await fetch(convUrl);
    if (!convRes.ok) {
      throw new Error(`Failed to load conversation history: ${convRes.statusText}`);
    }

    const conversations = await convRes.json();
    let targetConversation: any = null;

    if (Array.isArray(conversations)) {
      targetConversation = conversations.find((c) => c.id === projectId);
    } else if (conversations && typeof conversations === "object") {
      targetConversation = Object.values(conversations).find((c: any) => c.id === projectId);
    }

    if (!targetConversation || !targetConversation.messages || targetConversation.messages.length === 0) {
      await logToDB("Orchestrator: No conversation history found. Running default prompt...", "system");
      await runAgentHarness(projectId, token, "Review the workspace code and ensure it is structured beautifully.", apiKey);
      return;
    }

    const messages = targetConversation.messages;
    const lastUserMessage = [...messages].reverse().find((m) => m.sender === "user");
    
    if (!lastUserMessage) {
      await logToDB("Orchestrator: No user prompt detected. Inspecting workspace...", "system");
      await runAgentHarness(projectId, token, "Analyze workspace design elements and files.", apiKey);
      return;
    }

    const userPrompt = lastUserMessage.text;
    await logToDB(`Orchestrator: Extracted Task Prompt: "${userPrompt}"`, "system");
    await logToDB("Orchestrator: Analyzing requirements and creating sub-task schedule...", "system");

    // 2. Ask Gemini to decompose the task and plan it
    const genAI = new GoogleGenerativeAI(apiKey);
    const plannerModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const plannerPrompt = `Analyze the following user instruction and outline a step-by-step technical plan to implement it.
User instruction: "${userPrompt}"
Provide a short bulleted list of changes needed (e.g. modify App.tsx to add tabs, update styles in index.css, test build).
Keep it extremely concise (max 4 bullets).`;

    const planResult = await plannerModel.generateContent(plannerPrompt);
    const planText = planResult.response.text();

    await logToDB(`Orchestrator Plan:\n${planText}`, "system");
    await logToDB("Orchestrator: Dispatching workspace modifier subagent...", "system");

    // 3. Delegate to harness
    const harnessPrompt = `User instruction: "${userPrompt}"
Planned steps to achieve this:
${planText}

Please execute these changes now.`;

    await runAgentHarness(projectId, token, harnessPrompt, apiKey);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Orchestrator failed:", error);
    await logToDB(`Orchestrator Error: ${msg}`, "system");
    throw error;
  }
}
