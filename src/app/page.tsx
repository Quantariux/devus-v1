"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./page.module.css";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileTree, useFileTree, useFileTreeSelection } from "@pierre/trees/react";
import Editor from "@monaco-editor/react";
import {
  Settings01Icon,
  Clock01Icon,
  Add01Icon,
  IdeaIcon,
  UserGroup02Icon,
  TaskDone01Icon,
  Sun01Icon,
  Moon01Icon,
  Menu01Icon,
  MagicWand01Icon,
  Compass01Icon,
  GlobeIcon,
  VoiceIcon,
  Mic01Icon,
  Target01Icon
} from "@hugeicons/core-free-icons";

interface ChatMessage {
  id: number;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  model?: string;
  agent?: string;
}

interface SuggestionChip {
  label: string;
  promptText: string;
  icon: React.ReactNode;
}

interface SavedConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
}

const formatTimestamp = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes < 10 ? "0" + minutes : minutes;
  return `${hours}:${minStr} ${ampm}`;
};

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

const getFilesForSession = (sessionId: string): ProjectFile[] => {
  const key = ["welcome", "onboarding", "remote", "research"].includes(sessionId) ? sessionId : "default";
  if (key === "default") return DEFAULT_FILES;
  return PRESET_FILES[key] || DEFAULT_FILES;
};

interface TerminalLogEntry {
  timestamp: string;
  type: "agent" | "system";
  message: string;
  status?: "success" | "warning";
}

const PRESET_LOGS: Record<string, TerminalLogEntry[]> = {
  welcome: [
    { timestamp: "09:41:00 AM", type: "system", message: "Initialize UX Design Assistant Workspace..." },
    { timestamp: "09:41:02 AM", type: "agent", message: "Listening for user goals. Prompt templates loaded." }
  ],
  onboarding: [
    { timestamp: "09:42:10 AM", type: "system", message: "Pulling analytics logs from main onboarding funnel database..." },
    { timestamp: "09:42:15 AM", type: "agent", message: "Detected: 45% dropoff coordinates in SignUpForm. Credentials phase too long." },
    { timestamp: "09:42:30 AM", type: "agent", message: "Generated solutions: SSO AuthStepper compiled in OnboardingStepper.tsx", status: "success" }
  ],
  remote: [
    { timestamp: "10:15:05 AM", type: "system", message: "Analyze workspace switcher requirements..." },
    { timestamp: "10:15:20 AM", type: "agent", message: "Context mapping remote worker: asynchronous timeline badges active.", status: "success" }
  ],
  research: [
    { timestamp: "11:20:10 AM", type: "system", message: "Pulling ENCODE registry matrices..." },
    { timestamp: "11:20:30 AM", type: "agent", message: "Generated persona matrix and drops coordinator successfully.", status: "success" }
  ]
};

const DEFAULT_LOGS: TerminalLogEntry[] = [
  { timestamp: "12:00:00 PM", type: "system", message: "Real-time task session initialized." },
  { timestamp: "12:00:02 PM", type: "agent", message: "Waiting for instructions. Code editor and sandbox ready." }
];

const getLogsForSession = (sessionId: string): TerminalLogEntry[] => {
  const key = ["welcome", "onboarding", "remote", "research"].includes(sessionId) ? sessionId : "default";
  if (key === "default") return DEFAULT_LOGS;
  return PRESET_LOGS[key] || DEFAULT_LOGS;
};

export default function Home() {
  // Saved chat templates matching our preset topics
  const conversationTemplates: SavedConversation[] = [
    {
      id: "welcome",
      title: "UX Design Assistant",
      messages: [
        {
          id: 1,
          sender: "assistant",
          text: "Hello! I am your UX Design Assistant. I can help you clarify user drop-offs, define user contexts, or refine requirements. Click any suggestion chip below or type a custom query to start.",
          timestamp: "9:41 AM",
          model: "GPT-5.2",
          agent: "UX Design Assistant"
        }
      ]
    },
    {
      id: "onboarding",
      title: "UX Onboarding Funnel",
      messages: [
        {
          id: 1,
          sender: "user",
          text: "Help me understand why users are dropping off during onboarding",
          timestamp: "9:42 AM"
        },
        {
          id: 2,
          sender: "assistant",
          text: `### UX Analysis: Onboarding Drop-offs\n\nBased on user analytics, here are the key factors causing onboarding drop-offs:\n\n1. **Information Overload**: Users are requested to fill out an average of **8.2 form fields** on step one. \n2. **Delayed Gratification**: Users must verify their email *before* accessing the dashboard, disrupting the immediate value loop.\n3. **Lack of Contextual Guidance**: No progressive tutorials or interactive states are provided on initial load.\n\n### Proposed Solutions:\n- **Implement One-Tap OAuth**: Allow users to authenticate instantly via Google/Apple credentials.\n- **Progressive Profiling**: Delay non-essential questions until the user has successfully set up their first task.\n- **Interactive Checklists**: Guide users with a visual, step-by-step progress checklist to prompt completion.`,
          timestamp: "9:43 AM",
          model: "GPT-5.2",
          agent: "UX Design Assistant"
        }
      ]
    },
    {
      id: "remote",
      title: "Remote Worker Profile",
      messages: [
        {
          id: 1,
          sender: "user",
          text: "Describe the user context of a remote worker trying to manage team tasks",
          timestamp: "10:15 AM"
        },
        {
          id: 2,
          sender: "assistant",
          text: `### User Context Profile: Remote Workspace Worker\n\nRemote workers manage tasks under specific constraints. Here is the context outline:\n\n- **Asynchronous Collaboration**: Focuses on clear documentation rather than real-time synchronous meetings.\n- **Task Switching & Distractions**: Often balances personal and work tasks on a single device, requiring immediate focus triggers.\n- **Tool Fatigue**: Overwhelmed by excessive notification flags. They prefer single-purpose dashboards.\n\n### Design Recommendation:\n- Create distinct **Work** and **Personal** workspace tabs (utilizing HSL color indicators to prevent workspace bleeding).\n- Incorporate simple time badges (like **5 min stand-up** flags) to manage micro-moments.`,
          timestamp: "10:16 AM",
          model: "GPT-5.2",
          agent: "UX Design Assistant"
        }
      ]
    },
    {
      id: "research",
      title: "Research Deliverables",
      messages: [
        {
          id: 1,
          sender: "user",
          text: "What are the key deliverables for a user research and workflow analysis plan?",
          timestamp: "11:20 AM"
        },
        {
          id: 2,
          sender: "assistant",
          text: `### Deliverables Checklist: UX Research Plan\n\nTo properly analyze why users drop off and validate your requirements, prioritize these deliverables:\n\n1. **User Persona Alignment Matrix**: Details typical user archetypes (e.g. Remote Managers, Solo Professionals).\n2. **Onboarding Funnel Mapping**: Pinpoints the exact page and field coordinates where drop-offs exceed 15%.\n3. **High-Fidelity UI Prototypes**: Interactive wireframes demonstrating progressive onboarding forms.\n4. **Post-Onboarding Survey Framework**: Focuses on post-setup feedback rather than intrusive sign-up modals.`,
          timestamp: "11:21 AM",
          model: "GPT-5.2",
          agent: "UX Design Assistant"
        }
      ]
    }
  ];

  // Active states
  const [activeSessionId, setActiveSessionId] = useState("welcome");
  const [conversations, setConversations] = useState<SavedConversation[]>(conversationTemplates);
  
  const activeConversation = conversations.find((c) => c.id === activeSessionId) || conversations[0];
  const messages = activeConversation.messages;

  // Right Panel & Workspace states
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "view">("preview");
  const [mobileView, setMobileView] = useState<"chat" | "output">("chat");
  const [deviceType, setDeviceType] = useState<"desktop" | "mobile">("desktop");
  const [isRunning, setIsRunning] = useState(false);
  const [extraLogs, setExtraLogs] = useState<TerminalLogEntry[]>([]);

  const files = getFilesForSession(activeSessionId);
  const { model } = useFileTree({
    initialExpansion: 'open',
    paths: files.map(f => f.name),
    density: 'compact'
  });

  const selection = useFileTreeSelection(model);

  useEffect(() => {
    if (model) {
      const paths = files.map(f => f.name);
      model.resetPaths(paths);
      if (paths.length > 0) {
        model.getItem(paths[0])?.select();
      }
    }
  }, [activeSessionId, files, model]);

  // Interactive preview states
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({
    dropoffs: true,
    viewports: true,
    monaco: false
  });
  const [oauthEnabled, setOauthEnabled] = useState(false);
  const [stepperStep, setStepperStep] = useState(1);
  const [workspaceTab, setWorkspaceTab] = useState<"work" | "personal">("work");
  const [surveyDownloaded, setSurveyDownloaded] = useState(false);



  const [inputText, setInputText] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [selectedModel, setSelectedModel] = useState("GPT-5.2");
  const [selectedAgent, setSelectedAgent] = useState("UX Design Assistant");
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Mobile sidebar menu toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  // Split pane resizing state
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(45);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      // Clamp between 25% and 75%
      const clamped = Math.max(25, Math.min(newPercent, 75));
      setLeftWidthPercent(clamped);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Load conversation from templates on switch
  const loadConversation = (id: string) => {
    const found = conversations.find((t) => t.id === id);
    if (found) {
      setActiveSessionId(id);
      setExtraLogs([]);
      setSidebarOpen(false);
    }
  };

  const createNewChat = React.useCallback(() => {
    const newId = `task-${Date.now()}`;
    
    setConversations((prev) => {
      const customCount = prev.filter(c => !["welcome", "onboarding", "remote", "research"].includes(c.id)).length;
      const newSession: SavedConversation = {
        id: newId,
        title: `Task #${customCount + 1}`,
        messages: [
          {
            id: Date.now(),
            sender: "assistant",
            text: `New session started. I'm ready to assist you as your ${selectedAgent} utilizing ${selectedModel}. Ask me anything!`,
            timestamp: formatTimestamp(),
            model: selectedModel,
            agent: selectedAgent
          }
        ]
      };
      return [...prev, newSession];
    });
    
    setActiveSessionId(newId);
    setExtraLogs([]);
    setSidebarOpen(false);
  }, [selectedAgent, selectedModel]);

  const deleteConversation = React.useCallback((id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId("welcome");
        setExtraLogs([]);
      }
      return filtered;
    });
  }, [activeSessionId]);

  const handleRunCode = React.useCallback(() => {
    setIsRunning(true);
    setActiveTab("view");
    setExtraLogs([]);

    setTimeout(() => {
      setExtraLogs(prev => [
        ...prev,
        { timestamp: formatTimestamp(), type: "system", message: "Compiling code changes..." }
      ]);
    }, 400);

    setTimeout(() => {
      setExtraLogs(prev => [
        ...prev,
        { timestamp: formatTimestamp(), type: "system", message: "Bundling modules with Turbopack..." }
      ]);
    }, 1000);

    setTimeout(() => {
      setExtraLogs(prev => [
        ...prev,
        { timestamp: formatTimestamp(), type: "agent", message: "Compilation successful. Sandbox hot-reloaded active!", status: "success" }
      ]);
      setIsRunning(false);
    }, 1600);
  }, []);

  const renderPreviewContent = React.useCallback(() => {
    if (activeSessionId === "welcome") {
      return (
        <div style={{ padding: "12px", fontFamily: "var(--font-body)" }}>
          <h4 style={{ marginBottom: "12px", color: "var(--accent-purple)", fontSize: "0.95rem", fontWeight: "bold" }}>UX Agent Setup Checklist</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem" }}>
              <input 
                type="checkbox" 
                checked={checklistState.dropoffs} 
                onChange={() => setChecklistState(prev => ({ ...prev, dropoffs: !prev.dropoffs }))} 
              />
              Identify user drop-offs
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem" }}>
              <input 
                type="checkbox" 
                checked={checklistState.viewports} 
                onChange={() => setChecklistState(prev => ({ ...prev, viewports: !prev.viewports }))} 
              />
              Define mobile-responsive viewports
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem" }}>
              <input 
                type="checkbox" 
                checked={checklistState.monaco} 
                onChange={() => setChecklistState(prev => ({ ...prev, monaco: !prev.monaco }))} 
              />
              Implement Monaco code tree
            </label>
          </div>
          <p style={{ marginTop: "16px", fontSize: "0.72rem", color: "var(--text-sub)" }}>
            Checklist updates are saved locally.
          </p>
        </div>
      );
    }

    if (activeSessionId === "onboarding") {
      return (
        <div style={{ padding: "4px", fontFamily: "var(--font-body)" }}>
          <h4 style={{ color: "var(--accent-purple)", marginBottom: "8px", fontSize: "0.95rem", fontWeight: "bold" }}>Onboarding Funnel</h4>
          <div style={{ padding: "14px", borderRadius: "10px", border: "1px solid var(--border-prompt-input)", background: "var(--bg-prompt-input)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-sub)", marginBottom: "6px" }}>Step {stepperStep} of 3</div>
            <h5 style={{ marginBottom: "12px", fontSize: "0.85rem", fontWeight: "bold" }}>SSO Authentication Portal</h5>
            
            {oauthEnabled ? (
              <div style={{ padding: "10px", borderRadius: "6px", backgroundColor: "rgba(48,209,88,0.08)", color: "var(--accent-green)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#30d158" }} />
                Google SSO Authenticated
              </div>
            ) : (
              <button 
                onClick={() => setOauthEnabled(true)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", backgroundColor: "var(--accent-purple)", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}
              >
                SSO: One-Tap Authenticate
              </button>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
              <button 
                disabled={stepperStep === 1}
                onClick={() => setStepperStep(s => Math.max(1, s-1))}
                style={{ padding: "6px 12px", border: "1px solid var(--border-chip)", borderRadius: "6px", cursor: "pointer", background: "var(--bg-chip)", color: "var(--text-chip)", fontSize: "0.78rem" }}
              >
                Back
              </button>
              <button 
                disabled={stepperStep === 3}
                onClick={() => setStepperStep(s => Math.min(3, s+1))}
                style={{ padding: "6px 12px", border: "none", borderRadius: "6px", cursor: "pointer", backgroundColor: "var(--accent-purple)", color: "#ffffff", fontSize: "0.78rem" }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeSessionId === "remote") {
      return (
        <div style={{ padding: "4px", fontFamily: "var(--font-body)" }}>
          <h4 style={{ color: "var(--accent-purple)", marginBottom: "8px", fontSize: "0.95rem", fontWeight: "bold" }}>Remote Work Timeline</h4>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <button 
              onClick={() => setWorkspaceTab("work")}
              style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "0.78rem", cursor: "pointer", backgroundColor: workspaceTab === "work" ? "var(--accent-purple)" : "var(--bg-chip)", color: workspaceTab === "work" ? "#ffffff" : "var(--text-chip)" }}
            >
              Work
            </button>
            <button 
              onClick={() => setWorkspaceTab("personal")}
              style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "0.78rem", cursor: "pointer", backgroundColor: workspaceTab === "personal" ? "var(--accent-purple)" : "var(--bg-chip)", color: workspaceTab === "personal" ? "#ffffff" : "var(--text-chip)" }}
            >
              Personal
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {workspaceTab === "work" ? (
              <>
                <div style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--bg-chip)", border: "1px solid var(--border-chip)", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--accent-purple)" }} />
                  5 min daily stand-up (09:30 AM)
                </div>
                <div style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--bg-chip)", border: "1px solid var(--border-chip)", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--accent-purple)" }} />
                  Sprint review logs (11:00 AM)
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--bg-chip)", border: "1px solid var(--border-chip)", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--accent-cyan)" }} />
                  Gym workout sesh (06:00 PM)
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    if (activeSessionId === "research") {
      return (
        <div style={{ padding: "4px", fontFamily: "var(--font-body)" }}>
          <h4 style={{ color: "var(--accent-purple)", marginBottom: "8px", fontSize: "0.95rem", fontWeight: "bold" }}>User Personas Matrix</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            <div style={{ padding: "10px", borderRadius: "8px", background: "var(--bg-chip)", border: "1px solid var(--border-chip)" }}>
              <h5 style={{ fontSize: "0.8rem", color: "var(--text-main)", fontWeight: "bold" }}>Remote Team Lead</h5>
              <p style={{ fontSize: "0.72rem", color: "var(--text-sub)", marginTop: "4px" }}>Friction: Heavy tool loading times. Requires single view dashboards.</p>
            </div>
            <div style={{ padding: "10px", borderRadius: "8px", background: "var(--bg-chip)", border: "1px solid var(--border-chip)" }}>
              <h5 style={{ fontSize: "0.8rem", color: "var(--text-main)", fontWeight: "bold" }}>Independent Freelancer</h5>
              <p style={{ fontSize: "0.72rem", color: "var(--text-sub)", marginTop: "4px" }}>Friction: Tedious sign-up fields. Prefers OAuth social logons.</p>
            </div>
          </div>

          {surveyDownloaded ? (
            <div style={{ padding: "8px", textAlign: "center", color: "var(--accent-green)", fontSize: "0.8rem", fontWeight: "bold" }}>
              ✓ Survey Report PDF Downloaded
            </div>
          ) : (
            <button 
              onClick={() => setSurveyDownloaded(true)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", backgroundColor: "var(--accent-purple)", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}
            >
              Download Survey Report
            </button>
          )}
        </div>
      );
    }

    return (
      <div style={{ padding: "16px", textAlign: "center", fontFamily: "var(--font-body)", color: "var(--text-sub)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🤖</div>
        <h4 style={{ color: "var(--text-main)", fontSize: "0.9rem", fontWeight: "bold" }}>Agent Active & Idle</h4>
        <p style={{ fontSize: "0.78rem", marginTop: "6px", lineHeight: "1.4" }}>
          Submit queries to start designing components. The generated layouts will display here.
        </p>
      </div>
    );
  }, [activeSessionId, checklistState, oauthEnabled, stepperStep, workspaceTab, surveyDownloaded]);

  const renderPreviewTab = React.useCallback(() => {
    return (
      <div className={styles.previewContainer}>
        <div className={styles.previewToolbar}>
          <button 
            className={`${styles.deviceToggleBtn} ${deviceType === "desktop" ? styles.deviceToggleBtnActive : ""}`}
            onClick={() => setDeviceType("desktop")}
          >
            Desktop View
          </button>
          <button 
            className={`${styles.deviceToggleBtn} ${deviceType === "mobile" ? styles.deviceToggleBtnActive : ""}`}
            onClick={() => setDeviceType("mobile")}
          >
            Mobile (iPhone)
          </button>
        </div>

        {deviceType === "desktop" ? (
          <div className={styles.browserFrame}>
            <div className={styles.browserHeader}>
              <div className={styles.browserDots}>
                <span className={styles.browserDot} style={{ backgroundColor: "#ff5f56" }} />
                <span className={styles.browserDot} style={{ backgroundColor: "#ffbd2e" }} />
                <span className={styles.browserDot} style={{ backgroundColor: "#27c93f" }} />
              </div>
              <div className={styles.browserUrl}>
                http://localhost:3000/{activeSessionId}
              </div>
            </div>
            <div className={styles.browserBody}>
              {renderPreviewContent()}
            </div>
          </div>
        ) : (
          <div className={styles.phoneFrame}>
            <div className={styles.phoneScreen}>
              {renderPreviewContent()}
            </div>
          </div>
        )}
      </div>
    );
  }, [deviceType, activeSessionId, renderPreviewContent]);

  const renderCodeTab = React.useCallback(() => {
    const files = getFilesForSession(activeSessionId);
    const activeFile = files.find(f => f.name === selection[0]) || files[0];
    
    return (
      <div className={styles.codeTabContainer}>
        <div className={styles.codeExplorer} style={{ overflowY: "hidden", padding: "16px 4px" }}>
          <div className={styles.explorerTitle}>File</div>
          <FileTree 
            model={model} 
            className={`${theme === "dark" ? "dark" : ""} ${styles.realFileTree}`}
            id="trees-built-in-icons-minimal"
            data-file-tree-virtualized="true"
          />
        </div>

        <div className={styles.editorPane}>
          <div className={styles.editorHeader}>
            <div className={styles.editorFilename}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {activeFile.name}
            </div>
            <div className={styles.editorActions}>
              <span style={{ fontSize: "0.68rem", color: "var(--text-sub)", textTransform: "uppercase", marginRight: "8px" }}>
                {activeFile.language}
              </span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(activeFile.content);
                  alert("Code copied to clipboard!");
                }}
                className={styles.editorActionBtn}
                title="Copy code"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.editorWorkspaceReal}>
            <Editor
              height="100%"
              width="100%"
              language={activeFile.language}
              theme={theme === "dark" ? "vs-dark" : "light"}
              value={activeFile.content}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "Consolas, 'Courier New', Courier, monospace",
                lineNumbers: "on",
                roundedSelection: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderLineHighlight: "all",
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
                padding: { top: 12, bottom: 12 },
              }}
              loading={
                <div style={{ padding: "20px", color: "var(--text-sub)", fontSize: "0.82rem" }}>
                  Loading Monaco Editor...
                </div>
              }
            />
          </div>
        </div>
      </div>
    );
  }, [activeSessionId, selection, model, theme]);

  const renderTerminalTab = React.useCallback(() => {
    const logs = [...getLogsForSession(activeSessionId), ...extraLogs];
    
    return (
      <div className={styles.terminalContainer}>
        <div className={styles.terminalHeader}>
          <div className={styles.terminalStatus}>
            <span className={styles.terminalDot}></span>
            SANDBOX ENVIRONMENT ACTIVE (PORT 3000)
          </div>
          <div style={{ fontSize: "0.72rem", color: "#6a6a6a" }}>
            node v18.16.0
          </div>
        </div>

        <div className={styles.terminalLogsArea}>
          {logs.map((log, index) => (
            <div key={index} className={styles.terminalLog}>
              <span className={styles.logTimestamp}>[{log.timestamp}]</span>
              {log.type === "agent" ? (
                <span className={styles.logTagAgent}>[agent]</span>
              ) : (
                <span className={styles.logTagSystem}>[system]</span>
              )}
              <span className={`${styles.logMessage} ${log.status === "success" ? styles.logSuccess : log.status === "warning" ? styles.logWarning : ""}`}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }, [activeSessionId, extraLogs]);

  // Suggestions list with Hugeicons
  const suggestions: SuggestionChip[] = [
    {
      label: "Clarify user problem",
      promptText: "Help me understand why users are dropping off during onboarding",
      icon: <HugeiconsIcon icon={Target01Icon} size={16} strokeWidth={1.8} />
    },
    {
      label: "Define user context",
      promptText: "Describe the user context of a remote worker trying to manage team tasks",
      icon: <HugeiconsIcon icon={UserGroup02Icon} size={16} strokeWidth={1.8} />
    },
    {
      label: "Select deliverable",
      promptText: "What are the key deliverables for a user research and workflow analysis plan?",
      icon: <HugeiconsIcon icon={TaskDone01Icon} size={16} strokeWidth={1.8} />
    },
    {
      label: "Refine requirements",
      promptText: "Help me refine the functional requirements for a mobile task checklist tracker app",
      icon: <HugeiconsIcon icon={MagicWand01Icon} size={16} strokeWidth={1.8} />
    }
  ];

  const handleChipClick = (promptText: string) => {
    setInputText(promptText);
    textareaRef.current?.focus();
  };

  const handlePromptImprovement = React.useCallback(() => {
    if (!inputText.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      setInputText((prev) => `Act as an expert UX consultant. Analyze the following and provide structural solutions: "${prev}"`);
      setIsGenerating(false);
      textareaRef.current?.focus();
    }, 600);
  }, [inputText]);

  const handleSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;

    const userText = inputText.trim();
    const userMsg: ChatMessage = {
      id: Date.now(),
      sender: "user",
      text: userText,
      timestamp: formatTimestamp()
    };

    const targetSessionId = activeSessionId;

    // Append user message and potentially update the title if it's a custom task
    setConversations((prev) => prev.map((c) => {
      if (c.id === targetSessionId) {
        const isCustomTask = !["welcome", "onboarding", "remote", "research"].includes(c.id);
        const hasOnlySystemMsg = c.messages.length <= 1;
        const newTitle = (isCustomTask && hasOnlySystemMsg) 
          ? (userText.length > 28 ? userText.substring(0, 28) + "..." : userText) 
          : c.title;
        return {
          ...c,
          title: newTitle,
          messages: [...c.messages, userMsg]
        };
      }
      return c;
    }));

    setInputText("");
    setIsGenerating(true);

    // Simulate AI response based on query keywords
    setTimeout(() => {
      let responseText = "";
      if (userText.toLowerCase().includes("dropping off") || userText.toLowerCase().includes("onboarding")) {
        responseText = `### UX Analysis: Onboarding Drop-offs\n\nBased on user analytics, here are the key factors causing onboarding drop-offs:\n\n1. **Information Overload**: Users are requested to fill out an average of **8.2 form fields** on step one. \n2. **Delayed Gratification**: Users must verify their email *before* accessing the dashboard, disrupting the immediate value loop.\n3. **Lack of Contextual Guidance**: No progressive tutorials or interactive states are provided on initial load.\n\n### Proposed Solutions:\n- **Implement One-Tap OAuth**: Allow users to authenticate instantly via Google/Apple credentials.\n- **Progressive Profiling**: Delay non-essential questions until the user has successfully set up their first task.\n- **Interactive Checklists**: Guide users with a visual, step-by-step progress checklist to prompt completion.`;
      } else if (userText.toLowerCase().includes("remote worker") || userText.toLowerCase().includes("context")) {
        responseText = `### User Context Profile: Remote Workspace Worker\n\nRemote workers manage tasks under specific constraints. Here is the context outline:\n\n- **Asynchronous Collaboration**: Focuses on clear documentation rather than real-time synchronous meetings.\n- **Task Switching & Distractions**: Often balances personal and work tasks on a single device, requiring immediate focus triggers.\n- **Tool Fatigue**: Overwhelmed by excessive notification flags. They prefer single-purpose dashboards.\n\n### Design Recommendation:\n- Create distinct **Work** and **Personal** workspace tabs (utilizing HSL color indicators to prevent workspace bleeding).\n- Incorporate simple time badges (like **5 min stand-up** flags) to manage micro-moments.`;
      } else if (userText.toLowerCase().includes("deliverable") || userText.toLowerCase().includes("research")) {
        responseText = `### Deliverables Checklist: UX Research Plan\n\nTo properly analyze why users drop off and validate your requirements, prioritize these deliverables:\n\n1. **User Persona Alignment Matrix**: Details typical user archetypes (e.g. Remote Managers, Solo Professionals).\n2. **Onboarding Funnel Mapping**: Pinpoints the exact page and field coordinates where drop-offs exceed 15%.\n3. **High-Fidelity UI Prototypes**: Interactive wireframes demonstrating progressive onboarding forms.\n4. **Post-Onboarding Survey Framework**: Focuses on post-setup feedback rather than intrusive sign-up modals.`;
      } else {
        responseText = `### Response from ${selectedAgent} (${selectedModel})\n\nI have received your request: *"${userText}"*\n\nHere are the immediate steps I suggest we take:\n- **Breakdown Requirements**: List the core features we need to implement.\n- **Aesthetic Refinement**: Ensure layout styles utilize curated HSL gradients and responsive grids.\n- **Verification**: Compile static pages and check ESLint regulations to guarantee build safety.\n\nHow would you like to proceed? Click one of the suggestion chips or specify your goals below.`;
      }

      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: "assistant",
        text: responseText,
        timestamp: formatTimestamp(),
        model: selectedModel,
        agent: selectedAgent
      };

      setConversations((prev) => prev.map((c) => {
        if (c.id === targetSessionId) {
          return {
            ...c,
            messages: [...c.messages, assistantMsg]
          };
        }
        return c;
      }));

      setIsGenerating(false);
    }, 1800);
  }, [inputText, isGenerating, selectedAgent, selectedModel, activeSessionId]);

  return (
    <div className={`app-container ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
      {/* App Header */}
      <header className={styles.appHeader}>
        <div className={styles.appHeaderLeft}>
          <button 
            onClick={toggleSidebar} 
            className={styles.sidebarToggleBtn}
            title={(isMobile ? sidebarOpen : !sidebarCollapsed) ? "Collapse sidebar" : "Expand sidebar"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2.5" ry="2.5" />
              <line x1="9" y1="3" x2="9" y2="21" />
              {(isMobile ? sidebarOpen : !sidebarCollapsed) ? (
                <path d="M15 9l-3 3 3 3" />
              ) : (
                <path d="M12 9l3 3-3 3" />
              )}
            </svg>
          </button>
          
          <div className={styles.appLogo}>
            <span className={styles.appLogoDot}></span>
            devus
          </div>
          <span className={styles.appVersionBadge}>v1.2.4</span>
        </div>
        
        <div className={styles.appHeaderCenter}>
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbParent}>
              {["welcome", "onboarding", "remote", "research"].includes(activeSessionId) ? "Presets" : "Tasks"}
            </span>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>{activeConversation.title}</span>
          </div>
        </div>

        <div className={styles.appHeaderRight}>
          <div className={styles.systemStatusBadge}>
            <span className={styles.systemStatusGlow}></span>
            Sandbox: Active
          </div>
          <button 
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            className={styles.themeTogglePill}
            title={theme === "dark" ? "Switch to Lime Breeze" : "Switch to Obsidian Dark"}
          >
            <HugeiconsIcon icon={theme === "dark" ? Sun01Icon : Moon01Icon} size={14} strokeWidth={1.8} />
            <span>{theme === "dark" ? "Lime Breeze" : "Obsidian"}</span>
          </button>
        </div>
      </header>

      <div className={styles.appLayout}>
        {/* Backdrop overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 170 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar Pane */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarBrandTitle}>Explorer</div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className={styles.mobileMenuBtn}
            style={{ width: "28px", height: "28px" }}
          >
            &times;
          </button>
        </div>

        <button onClick={createNewChat} className={styles.newChatBtn}>
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
          New Session
        </button>

        <div className={styles.historyList}>
          <div className={styles.historyTitle}>Presets</div>
          <div 
            onClick={() => loadConversation("welcome")}
            className={`${styles.historyItem} ${activeSessionId === "welcome" ? styles.historyItemActive : ""}`}
          >
            <HugeiconsIcon icon={IdeaIcon} size={18} strokeWidth={1.8} />
            UX Design Assistant
          </div>

          <div 
            onClick={() => loadConversation("onboarding")}
            className={`${styles.historyItem} ${activeSessionId === "onboarding" ? styles.historyItemActive : ""}`}
          >
            <HugeiconsIcon icon={Clock01Icon} size={18} strokeWidth={1.8} />
            UX Onboarding Funnel
          </div>

          <div 
            onClick={() => loadConversation("remote")}
            className={`${styles.historyItem} ${activeSessionId === "remote" ? styles.historyItemActive : ""}`}
          >
            <HugeiconsIcon icon={UserGroup02Icon} size={18} strokeWidth={1.8} />
            Remote Worker Profile
          </div>

          <div 
            onClick={() => loadConversation("research")}
            className={`${styles.historyItem} ${activeSessionId === "research" ? styles.historyItemActive : ""}`}
          >
            <HugeiconsIcon icon={TaskDone01Icon} size={18} strokeWidth={1.8} />
            Research Deliverables
          </div>

          {/* Real-time Custom Tasks */}
          <div className={styles.historyTitle} style={{ marginTop: "20px" }}>Tasks</div>
          {conversations.filter(c => !["welcome", "onboarding", "remote", "research"].includes(c.id)).length === 0 ? (
            <div className={styles.emptyTasks}>No active tasks yet. Click &quot;New Session&quot; to create one.</div>
          ) : (
            conversations.filter(c => !["welcome", "onboarding", "remote", "research"].includes(c.id)).map(c => (
              <div 
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`${styles.historyItem} ${activeSessionId === c.id ? styles.historyItemActive : ""}`}
                style={{ justifyContent: "space-between", display: "flex", alignItems: "center" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <HugeiconsIcon icon={TaskDone01Icon} size={18} strokeWidth={1.8} />
                  <span>{c.title}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  className={styles.deleteBtn}
                  title="Delete task"
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>

        <div className={styles.sidebarFooter}>
          <button 
            onClick={() => setShowSettings(true)}
            className={styles.newChatBtn}
            style={{ margin: 0 }}
          >
            <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.8} />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Workspace Portal */}
      <main ref={containerRef} className={styles.screen}>
        {/* Mobile View Toggle Bar */}
        <div className={styles.mobileTabsBar}>
          <button 
            className={`${styles.mobileTabToggle} ${mobileView === "chat" ? styles.mobileTabToggleActive : ""}`}
            onClick={() => setMobileView("chat")}
          >
            Conversation
          </button>
          <button 
            className={`${styles.mobileTabToggle} ${mobileView === "output" ? styles.mobileTabToggleActive : ""}`}
            onClick={() => setMobileView("output")}
          >
            Workspace Output
          </button>
        </div>

        {/* Left Panel: Chat Panel */}
        <div 
          className={`${styles.chatPanel} ${mobileView === "output" ? styles.mobileHidden : ""}`}
          style={{ width: `${leftWidthPercent}%`, flex: "none" }}
        >
          {/* Top Control Bar */}
          <div className={styles.statusBar}>
            <div className={styles.leftControls}>
              <button 
                onClick={() => setSidebarOpen(true)} 
                className={styles.mobileMenuBtn}
                title="Open history"
              >
                <HugeiconsIcon icon={Menu01Icon} size={22} strokeWidth={1.8} />
              </button>
              <div className={styles.statusIndicator}>
                <span className={styles.statusGlow}></span>
                {selectedAgent} Active
              </div>
            </div>
            <div className={styles.statusRight}>
              <button onClick={() => setShowSettings(true)} className={styles.actionIconBtn} title="Settings">
                <HugeiconsIcon icon={Settings01Icon} size={20} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          {/* Scrollable Conversation History */}
          <div className={styles.chatContainer}>
            {messages.map((msg) => (
              <div key={msg.id} className={styles.messageWrapper}>
                <div
                  className={`${styles.messageBubble} ${
                    msg.sender === "user" ? styles.messageUser : styles.messageAssistant
                  }`}
                >
                  {msg.sender === "assistant" && (
                    <div className={styles.assistantHeader}>
                      <span>{msg.agent || selectedAgent}</span>
                      <span>&bull;</span>
                      <span>{msg.model || selectedModel}</span>
                      <span style={{ marginLeft: "auto" }}>{msg.timestamp}</span>
                    </div>
                  )}
                  <div 
                    className={styles.assistantContent}
                    dangerouslySetInnerHTML={{
                      __html: msg.text
                        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.*?)\*/g, "<em>$1</em>")
                        .replace(/`(.*?)`/g, "<code>$1</code>")
                        .replace(/^\- (.*$)/gim, "<li>$1</li>")
                        .replace(/(<li>.*<\/li>)/gim, "<ul>$1</ul>")
                        // Clean consecutive lists
                        .replace(/<\/ul>\s*<ul>/g, "")
                    }}
                  />
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className={styles.messageWrapper}>
                <div className={`${styles.messageBubble} ${styles.messageAssistant}`} style={{ opacity: 0.8 }}>
                  <div className={styles.assistantHeader}>
                    <span>{selectedAgent}</span>
                    <span>&bull;</span>
                    <span>{selectedModel}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", padding: "8px 0" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--accent-purple)", animation: "fadeIn 0.8s infinite alternate" }}></span>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--accent-cyan)", animation: "fadeIn 0.8s infinite alternate", animationDelay: "0.2s" }}></span>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--accent-green)", animation: "fadeIn 0.8s infinite alternate", animationDelay: "0.4s" }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Dmitry Sergushkin's Prompt Anatomy Input Box (centered, max-width 800px) */}
          <div className={styles.promptSection}>
            
            {/* header-bar */}
            <div className={styles.headerBar}>
              <div className={styles.indicatorsGroup}>
                <button 
                  onClick={() => setShowSettings(true)}
                  className={styles.indicatorTag}
                  title="Change model"
                >
                  <span className={styles.tagGlow}></span>
                  {selectedModel}
                </button>
                <button 
                  onClick={() => setShowSettings(true)}
                  className={styles.indicatorTag}
                  title="Change agent"
                >
                  <HugeiconsIcon icon={UserGroup02Icon} size={14} strokeWidth={1.8} />
                  {selectedAgent}
                </button>
              </div>

              <div className={styles.actionsGroup}>
                <button 
                  onClick={() => {
                    setConversations((prev) => prev.map((c) => {
                      if (c.id === activeSessionId) {
                        return {
                          ...c,
                          messages: [
                            {
                              id: Date.now(),
                              sender: "assistant",
                              text: `Conversation reset. I'm ready to assist you as your ${selectedAgent} utilizing ${selectedModel}. Ask me anything!`,
                              timestamp: formatTimestamp(),
                              model: selectedModel,
                              agent: selectedAgent
                            }
                          ]
                        };
                      }
                      return c;
                    }));
                    setExtraLogs([]);
                  }}
                  className={styles.actionIconBtn}
                  title="Reset conversation"
                >
                  <HugeiconsIcon icon={Clock01Icon} size={18} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* prompt-container card */}
            <form 
              onSubmit={handleSubmit}
              className={`${styles.promptContainer} ${isFocused ? styles.promptContainerFocused : ""}`}
            >
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Help me understand why users are dropping off during onboarding"
                className={styles.promptTextarea}
              />

              {/* prompt-improvement (Magic wand icon) */}
              {inputText.trim() && (
                <button
                  type="button"
                  onClick={handlePromptImprovement}
                  className={styles.promptImprovementBtn}
                  title="Improve prompt with AI"
                >
                  <HugeiconsIcon icon={MagicWand01Icon} size={18} strokeWidth={1.8} />
                </button>
              )}

              {/* auxiliary-actions bottom row */}
              <div className={styles.auxiliaryRow}>
                {/* bottom left icons */}
                <div className={styles.auxiliaryLeft}>
                  <button type="button" className={styles.actionIconBtn} title="Attach content" onClick={() => handleChipClick("Add spreadsheet context details: ")}>
                    <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
                  </button>
                  <button type="button" className={styles.actionIconBtn} title="Experimental space" onClick={() => handleChipClick("Create a mock prototype design for: ")}>
                    <HugeiconsIcon icon={IdeaIcon} size={18} strokeWidth={1.8} />
                  </button>
                  <button type="button" className={styles.actionIconBtn} title="Deep research" onClick={() => handleChipClick("Perform deep academic research on: ")}>
                    <HugeiconsIcon icon={Compass01Icon} size={18} strokeWidth={1.8} />
                  </button>
                  <button type="button" className={styles.actionIconBtn} title="Web Search" onClick={() => handleChipClick("Search the web for current trends in: ")}>
                    <HugeiconsIcon icon={GlobeIcon} size={18} strokeWidth={1.8} />
                  </button>
                </div>

                {/* bottom right icons */}
                <div className={styles.auxiliaryRight}>
                  <button type="button" className={styles.actionIconBtn} title="Record audio" onClick={() => handleChipClick("Drafting ideas via dictation...")}>
                    <HugeiconsIcon icon={VoiceIcon} size={18} strokeWidth={1.8} />
                  </button>
                  <button type="button" className={styles.actionIconBtn} title="Voice input" onClick={() => handleChipClick("Listening to mic input...")}>
                    <HugeiconsIcon icon={Mic01Icon} size={18} strokeWidth={1.8} />
                  </button>
                  <div className={styles.sendContainerOuter}>
                    <div className={styles.sendContainerInner}>
                      <div className={`${styles.voiceMemoWrapper} ${styles.voiceMemoWrapperHidden}`}>
                        <button 
                          type="button" 
                          aria-label="Record voice memo" 
                          className={styles.voiceMemoBtn}
                          onClick={() => handleChipClick("Drafting ideas via dictation...")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 -960 960 960" fill="currentColor" className={styles.voiceMemoIcon}>
                            <path d="M409.04-449.04Q380-478.08 380-520V-760q0-41.92 29.04-70.96T480-860t70.96,29.04T580-760v240q0,41.92-29.04,70.96T480-420t-70.96-29.04ZM480-640ZM450-130V-261.85q-99-11.31-164.5-84.92T220-520h60q0,83 58.5,141.5T480-320t141.5-58.5T680-520h60q0,99.61-65.5,173.23T510-261.85V-130H450Zm58.5-361.5Q520-503 520-520V-760q0-17-11.5-28.5T480-800t-28.5,11.5T440-760v240q0,17 11.5,28.5T480-480t28.5-11.5Z" />
                          </svg>
                        </button>
                      </div>
                      <button 
                        type="submit" 
                        aria-label="Send message" 
                        data-testid="send-button"
                        className={`${styles.sendBtn} ${!inputText.trim() || isGenerating ? styles.sendBtnDisabled : styles.sendBtnActive}`}
                        disabled={!inputText.trim() || isGenerating}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" className={styles.sendIcon}>
                          <path d="M665.08-450H180v-60H665.08L437.23-737.85L480-780L780-480L480-180l-42.77-42.15L665.08-450Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* suggestion-chips row */}
            <div className={styles.suggestionRow}>
              {suggestions.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip.promptText)}
                  className={styles.suggestionChip}
                >
                  {chip.icon}
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resize Splitter Handle */}
        <div 
          className={`${styles.resizeHandle} ${isResizing ? styles.resizeHandleActive : ""}`}
          onMouseDown={handleMouseDown}
        />

        {/* Right Panel: Workspace Output Panel */}
        <div 
          className={`${styles.outputPanel} ${mobileView === "chat" ? styles.mobileHidden : ""}`}
          style={{ width: `${100 - leftWidthPercent}%`, flex: "none" }}
        >
          <div className={styles.outputHeader}>
            <div className={styles.tabsList}>
              <button 
                onClick={() => setActiveTab("preview")}
                className={`${styles.tabButton} ${activeTab === "preview" ? styles.tabButtonActive : ""}`}
              >
                Preview
              </button>
              <button 
                onClick={() => setActiveTab("code")}
                className={`${styles.tabButton} ${activeTab === "code" ? styles.tabButtonActive : ""}`}
              >
                Code
              </button>
              <button 
                onClick={() => setActiveTab("view")}
                className={`${styles.tabButton} ${activeTab === "view" ? styles.tabButtonActive : ""}`}
              >
                View
              </button>
            </div>

            <button onClick={handleRunCode} className={styles.runBtn} disabled={isRunning}>
              {isRunning ? (
                <>Running...</>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: "4px" }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Run App
                </>
              )}
            </button>
          </div>

          <div className={styles.outputContent}>
            {activeTab === "preview" && renderPreviewTab()}
            {activeTab === "code" && renderCodeTab()}
            {activeTab === "view" && renderTerminalTab()}
          </div>
        </div>
      </main>
      </div>

      {/* Settings Modal Config Sheet */}
      {showSettings && (
        <div className={styles.sheetOverlay} onClick={() => setShowSettings(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>Prompt Configuration</h2>
              <button onClick={() => setShowSettings(false)} className={styles.closeButton}>&times;</button>
            </div>

            <div className={styles.settingsList}>
              <div className={styles.settingsItem}>
                <span className={styles.settingsLabel}>Model Indicator</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className={styles.settingsSelect}
                >
                  <option value="GPT-5.2">GPT-5.2</option>
                  <option value="Gemini 3.5 Pro">Gemini 3.5 Pro</option>
                  <option value="Claude 4.0">Claude 4.0</option>
                </select>
              </div>

              <div className={styles.settingsItem}>
                <span className={styles.settingsLabel}>Agent Indicator</span>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className={styles.settingsSelect}
                >
                  <option value="UX Design Assistant">UX Design Assistant</option>
                  <option value="Developer Advocate">Developer Advocate</option>
                  <option value="Task Planner">Task Planner</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
