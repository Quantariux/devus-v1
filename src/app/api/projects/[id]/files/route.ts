import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth-verify";

const DB_BASE_URL = "https://gen-lang-client-0276152407-default-rtdb.firebaseio.com";

interface ProjectFile {
  name: string;
  language: string;
  content: string;
}

const PRESET_FILES: Record<string, ProjectFile[]> = {
  welcome: [
    {
      name: "Readme.md",
      language: "markdown",
      content: `# UX Design Assistant Workspace\n\nWelcome to your dynamic UX workspace! This assistant is configured to help you design sleek, premium, and classic interfaces.\n\n### Recommended Actions:\n- Use the search tool to inspect design coordinates.\n- Click suggestion chips to draft context models.\n- Verify mobile constraints in the Preview tab.`
    },
    {
      name: "assistant-config.json",
      language: "json",
      content: `{\n  "agentName": "UX Design Assistant",\n  "model": "GPT-5.2",\n  "temperature": 0.2,\n  "systemContext": "Design-first mobile optimizer",\n  "defaultTheme": "Obsidian Dark"\n}`
    }
  ],
  onboarding: [
    {
      name: "OnboardingStepper.tsx",
      language: "typescript",
      content: `import React, { useState } from 'react';\nimport './AuthMatrix.css';\n\nexport default function OnboardingStepper() {\n  const [step, setStep] = useState(1);\n  const [oauthEnabled, setOauthEnabled] = useState(false);\n\n  return (\n    <div className="stepper-card">\n      <h3>Step {step} of 3: Verification</h3>\n      <p>Fill out the profile credentials or authenticate via Single Sign-On.</p>\n      \n      {oauthEnabled ? (\n        <button className="sso-btn active">SSO authenticated</button>\n      ) : (\n        <button className="sso-btn" onClick={() => setOauthEnabled(true)}>\n          One-Tap Google Authenticate\n        </button>\n      )}\n      \n      <div className="stepper-footer">\n        <button onClick={() => setStep(s => Math.max(1, s-1))}>Back</button>\n        <button onClick={() => setStep(s => Math.min(3, s+1))}>Next</button>\n      </div>\n    </div>\n  );\n}`
    },
    {
      name: "AuthMatrix.css",
      language: "css",
      content: `.stepper-card {\n  background: var(--bg-prompt-input);\n  border: 1px solid var(--border-prompt-input);\n  border-radius: 12px;\n  padding: 24px;\n}\n.sso-btn {\n  width: 100%;\n  padding: 12px;\n  border-radius: 8px;\n  background-color: var(--accent-purple);\n  color: #fff;\n  font-weight: 600;\n  cursor: pointer;\n}`
    },
    {
      name: "analytics.json",
      language: "json",
      content: `{\n  "onboardingDropOffs": {\n    "step1_credentials": "45%",\n    "step2_verification": "35%",\n    "step3_profileSetup": "10%"\n  },\n  "recommendation": "Reduce initial signup forms from 8 fields to 1 OAuth click."\n}`
    }
  ],
  remote: [
    {
      name: "WorkspaceSwitcher.tsx",
      language: "typescript",
      content: `import React, { useState } from 'react';\n\nexport default function WorkspaceSwitcher() {\n  const [activeTab, setActiveTab] = useState<'work' | 'personal'>('work');\n\n  return (\n    <div className="workspace-tabs">\n      <button \n        className={activeTab === 'work' ? 'tab active' : 'tab'} \n        onClick={() => setActiveTab('work')}\n      >\n        Work Space\n      </button>\n      <button \n        className={activeTab === 'personal' ? 'tab active' : 'tab'} \n        onClick={() => setActiveTab('personal')}\n      >\n        Personal Space\n      </button>\n    </div>\n  );\n}`
    },
    {
      name: "TimeBadge.tsx",
      language: "typescript",
      content: `import React from 'react';\n\nexport default function TimeBadge({ label, minutes }: { label: string, minutes: number }) {\n  return (\n    <div className="badge-wrapper">\n      <span className="badge-dot"></span>\n      <span className="badge-label">{label} ({minutes}m)</span>\n    </div>\n  );\n}`
    }
  ],
  research: [
    {
      name: "PersonaMatrix.tsx",
      language: "typescript",
      content: `import React from 'react';\n\nexport default function PersonaMatrix() {\n  const personas = [\n    { name: "Remote Manager", focus: "Asynchronous updates", dropoff: "High tool friction" },\n    { name: "Solo Professional", focus: "Micro-task scheduling", dropoff: "Form fatigue" }\n  ];\n\n  return (\n    <div className="matrix-grid">\n      {personas.map((p, idx) => (\n        <div key={idx} className="persona-card">\n          <h4>{p.name}</h4>\n          <p>Focus: {p.focus}</p>\n          <span className="friction-tag">{p.dropoff}</span>\n        </div>\n      ))}\n    </div>\n  );\n}`
    },
    {
      name: "SurveyModal.css",
      language: "css",
      content: `.persona-card {\n  border: 1px solid var(--border-chip);\n  background: var(--bg-chip);\n  padding: 16px;\n  border-radius: 8px;\n}\n.friction-tag {\n  font-size: 0.72rem;\n  color: var(--accent-purple);\n  font-weight: 700;\n}`
    }
  ]
};

const DEFAULT_FILES: ProjectFile[] = [
  {
    name: "App.tsx",
    language: "typescript",
    content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="app-canvas">\n      <h3>Agent Workspace</h3>\n      <p>Use the chat interface to instruct the agent and modify files in real-time.</p>\n    </div>\n  );\n}`
  },
  {
    name: "index.css",
    language: "css",
    content: `.app-canvas {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  height: 100%;\n  font-family: sans-serif;\n  color: var(--text-main);\n}`
  },
  {
    name: "package.json",
    language: "json",
    content: `{\n  "name": "agent-workspace-task",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0"\n  }\n}`
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const dbUrl = `${DB_BASE_URL}/projects/${id}/files.json?auth=${token}`;
    
    const filesRes = await fetch(dbUrl);
    if (!filesRes.ok) {
      return NextResponse.json({ error: `Database error: ${filesRes.statusText}` }, { status: filesRes.status });
    }

    const data = await filesRes.json();
    if (data) {
      return NextResponse.json(data);
    }

    // Determine initial files based on session id
    const initialFiles = PRESET_FILES[id] || DEFAULT_FILES;
    await fetch(dbUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(initialFiles)
    });
    return NextResponse.json(initialFiles);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { files } = body;
    if (!files) {
      return NextResponse.json({ error: "Missing files payload" }, { status: 400 });
    }
    
    const dbUrl = `${DB_BASE_URL}/projects/${id}/files.json?auth=${token}`;
    const filesRes = await fetch(dbUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(files)
    });

    if (!filesRes.ok) {
      return NextResponse.json({ error: `Database error: ${filesRes.statusText}` }, { status: filesRes.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
