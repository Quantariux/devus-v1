"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileTree, useFileTree, useFileTreeSelection } from "@pierre/trees/react";
import Editor from "@monaco-editor/react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
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

const getLogsForSession = (sessionId: string): TerminalLogEntry[] => {
  const key = ["welcome", "onboarding", "remote", "research"].includes(sessionId) ? sessionId : "default";
  if (key === "default") return DEFAULT_LOGS;
  return PRESET_LOGS[key] || DEFAULT_LOGS;
};

export default function Home() {

  // Auth states
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ role: string; balance: number } | null>(null);
  
  // Auth UI state
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Active states
  const [activeSessionId, setActiveSessionId] = useState("welcome");
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const hasLoadedRef = useRef(false);

  // Auth dynamic initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        const configRes = await fetch("/api/auth/config");
        const firebaseConfig = await configRes.json();
        
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        const auth = getAuth(app);
        
        return onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);
            const token = await firebaseUser.getIdToken();
            setIdToken(token);
            
            // Sync/Verify with server-side profile
            const verifyRes = await fetch("/api/auth/verify", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`
              }
            });
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              setProfile(verifyData.user);
            }
          } else {
            setUser(null);
            setIdToken(null);
            setProfile(null);
          }
          setAuthReady(true);
        });
      } catch (err) {
        console.error("Firebase auth init failed:", err);
        setAuthReady(true);
      }
    };
    
    let unsubscribe: (() => void) | undefined = undefined;
    initAuth().then((unsub) => {
      unsubscribe = unsub;
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Helper to re-fetch/sync profile balance
  const syncProfileBalance = useCallback(async () => {
    if (!idToken) return;
    try {
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        setProfile(verifyData.user);
      }
    } catch (err) {
      console.error("Failed to sync profile:", err);
    }
  }, [idToken]);

  // Load conversations on mount
  useEffect(() => {
    if (!idToken) return;
    const init = async () => {
      try {
        const res = await fetch("/api/conversations", {
          headers: {
            "Authorization": `Bearer ${idToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          let conversationsArray: SavedConversation[] = [];
          if (Array.isArray(data)) {
            conversationsArray = data;
          } else if (data && typeof data === "object") {
            conversationsArray = Object.values(data);
          }
          
          if (conversationsArray.length > 0) {
            setConversations(conversationsArray);
          } else {
            setConversations(conversationTemplates);
            await fetch("/api/conversations", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`
              },
              body: JSON.stringify({ conversations: conversationTemplates })
            });
          }
        } else {
          setConversations(conversationTemplates);
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setConversations(conversationTemplates);
      } finally {
        hasLoadedRef.current = true;
      }
    };
    init();
  }, [idToken]);

  // Save conversations helper
  const saveConversationsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveConversationsToServer = useCallback((updatedConversations: SavedConversation[]) => {
    if (!idToken) return;
    if (saveConversationsTimeoutRef.current) {
      clearTimeout(saveConversationsTimeoutRef.current);
    }
    saveConversationsTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("/api/conversations", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({ conversations: updatedConversations })
        });
      } catch (err) {
        console.error("Failed to save conversations:", err);
      }
    }, 1000);
  }, [idToken]);

  // Save conversations whenever they change
  useEffect(() => {
    if (!hasLoadedRef.current || !idToken) return;
    saveConversationsToServer(conversations);
  }, [conversations, idToken, saveConversationsToServer]);

  const activeConversation = conversations.find((c) => c.id === activeSessionId) || conversations[0] || conversationTemplates[0];
  const messages = React.useMemo(() => activeConversation ? activeConversation.messages : [], [activeConversation]);

  // Right Panel & Workspace states
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "view">("preview");
  const [mobileView, setMobileView] = useState<"chat" | "output">("chat");
  const [deviceType, setDeviceType] = useState<"desktop" | "mobile">("desktop");
  
  // Real-time container state & logs via Server-Sent Events (SSE)
  const [containerState, setContainerState] = useState<{
    status: string;
    alwaysOn: boolean;
    agentStatus: string;
    url: string;
    logs: Record<string, TerminalLogEntry> | TerminalLogEntry[];
  } | null>(null);

  // Files database fetching & debounced auto-save
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isFilesLoading, setIsFilesLoading] = useState(true);

  useEffect(() => {
    if (!idToken) return;
    const fetchFiles = async () => {
      setIsFilesLoading(true);
      try {
        const res = await fetch(`/api/projects/${activeSessionId}/files`, {
          headers: {
            "Authorization": `Bearer ${idToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setFiles(data);
          } else if (data && typeof data === "object") {
            setFiles(Object.values(data));
          } else {
            setFiles([]);
          }
        } else {
          setFiles([]);
        }
      } catch (err) {
        console.error("Failed to load files:", err);
        setFiles([]);
      } finally {
        setIsFilesLoading(false);
      }
    };
    fetchFiles();
  }, [activeSessionId, idToken, containerState?.status]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveFilesToServer = useCallback((sessionId: string, updatedFiles: ProjectFile[]) => {
    if (!idToken) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/projects/${sessionId}/files`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({ files: updatedFiles })
        });
      } catch (_err) {
        console.error("Failed to save files to server:", _err);
      }
    }, 1000);
  }, [idToken]);

  const handleFileChange = useCallback((fileName: string, newContent: string) => {
    setFiles((prev) => {
      const updated = (prev || []).map((f) => {
        if (f.name === fileName) {
          return { ...f, content: newContent };
        }
        return f;
      });
      saveFilesToServer(activeSessionId, updated);
      return updated;
    });
  }, [activeSessionId, saveFilesToServer]);



  useEffect(() => {
    if (!idToken) return;
    const eventSource = new EventSource(`/api/projects/${activeSessionId}/stream?token=${encodeURIComponent(idToken)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data === "object") {
          setContainerState(data);
        }
      } catch {
        // Skip non-JSON format system messages
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE stream error, reconnecting:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [activeSessionId, idToken]);

  const isRunning = containerState ? ["launching", "installing", "running", "deploying"].includes(containerState.status) : false;

  const { model } = useFileTree({
    initialExpansion: 'open',
    paths: (files || []).map(f => f.name),
    density: 'compact'
  });

  const selection = useFileTreeSelection(model);

  useEffect(() => {
    if (model) {
      const paths = (files || []).map(f => f.name);
      model.resetPaths(paths);
      if (paths.length > 0 && selection.length === 0) {
        model.getItem(paths[0])?.select();
      }
    }
  }, [activeSessionId, files, model, selection.length]);

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
    setSidebarOpen(false);
  }, [selectedAgent, selectedModel]);

  const deleteConversation = React.useCallback((id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId("welcome");
      }
      return filtered;
    });
  }, [activeSessionId]);

  const getLogsArray = React.useCallback((): TerminalLogEntry[] => {
    if (!containerState || !containerState.logs) {
      return getLogsForSession(activeSessionId);
    }
    if (Array.isArray(containerState.logs)) {
      return containerState.logs;
    }
    return Object.values(containerState.logs);
  }, [containerState, activeSessionId]);

  const handleRunCode = React.useCallback(async () => {
    if (!idToken) return;
    setActiveTab("view");
    try {
      const res = await fetch(`/api/projects/${activeSessionId}/run`, { 
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });
      if (res.ok) {
        await syncProfileBalance();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to initialize VM container.");
      }
    } catch (err) {
      console.error("Failed to run code:", err);
    }
  }, [activeSessionId, idToken, syncProfileBalance]);

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
            title="Simulating 1320 × 2868 px, 19.5:9 aspect ratio"
          >
            Mobile (1320 × 2868, 19.5:9)
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
                {containerState?.url || `https://project-${activeSessionId}.devus.space`}
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
  }, [deviceType, activeSessionId, renderPreviewContent, containerState?.url]);

  const renderCodeTab = React.useCallback(() => {
    const activeFile = (files || []).find(f => f.name === selection[0]) || (files || [])[0];
    
    if (isFilesLoading || !activeFile) {
      return (
        <div style={{ padding: "20px", color: "var(--text-sub)", fontSize: "0.82rem" }}>
          Loading workspace codebase...
        </div>
      );
    }
    
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
              onChange={(val) => handleFileChange(activeFile.name, val || "")}
              options={{
                readOnly: false,
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
  }, [files, selection, model, theme, isFilesLoading, handleFileChange]);

  const renderTerminalTab = React.useCallback(() => {
    const logs = getLogsArray();
    
    return (
      <div className={styles.terminalContainer}>
        <div className={styles.terminalHeader}>
          <div className={styles.terminalStatus}>
            <span 
              className={styles.terminalDot}
              style={{
                backgroundColor: isRunning ? "#ffbd2e" : containerState?.status === "complete" ? "#30d158" : "#8e8e93"
              }}
            ></span>
            SANDBOX ENVIRONMENT {containerState?.status ? containerState.status.toUpperCase() : "ACTIVE"} (PORT 3000)
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
  }, [containerState, getLogsArray, isRunning]);

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

  const handleDemoLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const email = "demo@devus.space";
      const password = "demoPassword123";
      
      const configRes = await fetch("/api/auth/config");
      const firebaseConfig = await configRes.json();
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);
      
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: unknown) {
        const error = signInErr as { code?: string; message?: string };
        if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential" || error.code === "auth/invalid-email") {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (signUpErr: unknown) {
            const signUpError = signUpErr as { message?: string };
            throw new Error(signUpError.message);
          }
        } else {
          throw signInErr;
        }
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setAuthError(error.message || "Failed to log in with demo credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setAuthError("Please fill out all fields.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const configRes = await fetch("/api/auth/config");
      const firebaseConfig = await configRes.json();
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);

      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      } else {
        await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error(error);
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const renderAuthOverlay = () => {
    return (
      <div className="auth-overlay-bg" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#ffffff" }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes gradientBg {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .auth-overlay-bg {
            background: linear-gradient(-45deg, #0f0f11, #161622, #070708, #111113);
            background-size: 400% 400%;
            animation: gradientBg 15s ease infinite;
          }
          .glass-card {
            background: rgba(22, 22, 26, 0.45);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            border-radius: 20px;
            width: 100%;
            max-width: 440px;
            padding: 40px;
            transition: all 0.3s ease;
          }
          .input-glow:focus {
            outline: none;
            border-color: #bf5af2;
            box-shadow: 0 0 12px rgba(191, 90, 242, 0.35);
          }
          .btn-gradient {
            background: linear-gradient(135deg, #bf5af2, #af52de);
            box-shadow: 0 4px 14px rgba(191, 90, 242, 0.3);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border: none;
            color: #ffffff;
            font-weight: 600;
            cursor: pointer;
          }
          .btn-gradient:hover {
            transform: translateY(-1.5px);
            box-shadow: 0 6px 20px rgba(191, 90, 242, 0.5);
          }
          .btn-gradient:active {
            transform: translateY(0px);
          }
          .tab-active {
            color: #ffffff;
            border-bottom: 2px solid #bf5af2;
          }
          .tab-inactive {
            color: #8e8e93;
            border-bottom: 2px solid transparent;
          }
          .tab-inactive:hover {
            color: #ffffff;
          }
        `}} />

        <div className="glass-card">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-1px", background: "linear-gradient(135deg, #ffffff, #bf5af2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "flex", alignItems: "center", gap: "8px" }}>
              devus
            </div>
            <p style={{ color: "#8e8e93", fontSize: "0.85rem", marginTop: "8px", textAlign: "center" }}>
              Secure Sandbox Development Platform
            </p>
          </div>

          <div style={{ display: "flex", width: "100%", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "24px" }}>
            <button 
              onClick={() => { setAuthMode("login"); setAuthError(""); }}
              className={authMode === "login" ? "tab-active" : "tab-inactive"}
              style={{ flex: 1, padding: "12px", background: "none", border: "none", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthMode("signup"); setAuthError(""); }}
              className={authMode === "signup" ? "tab-active" : "tab-inactive"}
              style={{ flex: 1, padding: "12px", background: "none", border: "none", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {authError && (
              <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.2)", color: "#ff453a", fontSize: "0.8rem", lineHeight: "1.4" }}>
                {authError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "#8e8e93", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Email Address</label>
              <input 
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="input-glow"
                placeholder="you@domain.com"
                style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.25)", color: "#ffffff", fontSize: "0.9rem", transition: "all 0.2s" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "#8e8e93", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</label>
              <input 
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="input-glow"
                placeholder="••••••••"
                style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.25)", color: "#ffffff", fontSize: "0.9rem", transition: "all 0.2s" }}
              />
            </div>

            <button 
              type="submit"
              disabled={authLoading}
              className="btn-gradient"
              style={{ width: "100%", padding: "14px", borderRadius: "10px", fontSize: "0.95rem", marginTop: "10px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
            >
              {authLoading ? (
                <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#ffffff", animation: "spin 0.8s linear infinite" }} />
              ) : (
                authMode === "login" ? "Sign In to Platform" : "Create My Account"
              )}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", margin: "24px 0", width: "100%" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
            <span style={{ padding: "0 12px", color: "#8e8e93", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px" }}>Quick Test</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
          </div>

          <button 
            type="button"
            disabled={authLoading}
            onClick={handleDemoLogin}
            style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid rgba(191,90,242,0.3)", backgroundColor: "rgba(191,90,242,0.06)", color: "#bf5af2", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
          >
            {authLoading ? (
              <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid rgba(191,90,242,0.2)", borderTopColor: "#bf5af2", animation: "spin 0.8s linear infinite" }} />
            ) : (
              "Launch with Demo Credentials"
            )}
          </button>
        </div>
      </div>
    );
  };

  if (!authReady) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#0f0f11", color: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div className="spinner" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#bf5af2", animation: "spin 1s linear infinite" }}></div>
          <span style={{ fontSize: "0.9rem", color: "#8e8e93" }}>Initializing Workspace Auth...</span>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}} />
        </div>
      </div>
    );
  }

  if (!user) {
    return renderAuthOverlay();
  }

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
          
          <Link href="/" aria-label="devus home" className={styles.appLogoLink}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="devus logo" className={styles.logoImage} />
            <span className={styles.logoText}>devus</span>
          </Link>
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
          {profile && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "var(--text-sub)", backgroundColor: "rgba(255,255,255,0.03)", padding: "4px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 600, color: profile.role === "admin" ? "#bf5af2" : "#30d158" }}>
                {profile.role.toUpperCase()}
              </span>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
              <span>
                Wallet: <strong style={{ color: "#bf5af2" }}>{profile.balance}</strong> credits
              </span>
            </div>
          )}
          {user && (
            <button 
              onClick={() => {
                const auth = getAuth();
                signOut(auth).then(() => {
                  setUser(null);
                  setIdToken(null);
                  setProfile(null);
                });
              }}
              className={styles.themeTogglePill}
              style={{ border: "1px solid rgba(255, 69, 58, 0.3)", backgroundColor: "rgba(255, 69, 58, 0.1)", color: "#ff453a", height: "28px", padding: "0 10px" }}
              title="Sign Out"
            >
              Sign Out
            </button>
          )}
          <div className={styles.systemStatusBadge}>
            <span 
              className={styles.systemStatusGlow}
              style={{
                backgroundColor: containerState?.status === "complete" 
                  ? "#30d158" 
                  : isRunning 
                    ? "#ffbd2e" 
                    : "#8e8e93"
              }}
            ></span>
            Sandbox: {containerState?.status ? containerState.status.toUpperCase() : "ACTIVE"}
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
                <span 
                  className={styles.statusGlow}
                  style={{
                    backgroundColor: containerState?.agentStatus && containerState.agentStatus !== "idle"
                      ? "#bf5af2" 
                      : "#30d158"
                  }}
                ></span>
                {selectedAgent} {containerState?.agentStatus ? `(${containerState.agentStatus})` : "Active"}
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
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div key={msg.id} className={styles.messageWrapper}>
                  <div
                    className={`${styles.messageBubble} ${
                      isUser ? styles.messageUser : styles.messageAssistant
                    }`}
                  >
                    {!isUser && (
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
                  {isUser && (
                    <div className={styles.userActionsRow}>
                      <span className={styles.userMessageTime}>{msg.timestamp || "7:47 AM"}</span>
                      <div className={styles.userActionsGroup}>
                        <button 
                          className={styles.userActionBtn} 
                          title="Edit message"
                          onClick={() => {
                            setInputText(msg.text);
                            textareaRef.current?.focus();
                          }}
                        >
                          <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                            <path d="M11.243 3.457a.803.803 0 0 0-1.13 0l-.554.552a.075.075 0 0 0 0 .106l1.03 1.03a.075.075 0 0 0 .107 0l.547-.546a.1.1 0 0 0 .019-.032.804.804 0 0 0-.02-1.11m-2.246 1.22a.075.075 0 0 0-.106 0l-6.336 6.326a1.1 1.1 0 0 0-.237.393l-.27.87v.002c-.062.232.153.466.389.383l.863-.267q.221-.061.397-.239l6.332-6.331a.075.075 0 0 0 0-.106zm-3.355 6.898a.08.08 0 0 0-.053.022l-1.1 1.1a.075.075 0 0 0 .053.128h9.06a.625.625 0 1 0 0-1.25z"></path>
                          </svg>
                        </button>
                        <button 
                          className={styles.userActionBtn} 
                          title="Copy text"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.text);
                            alert("Copied to clipboard!");
                          }}
                        >
                          <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                            <path d="M3.25 1.375c-1.036 0-1.875.84-1.875 1.875v6c0 1.036.84 1.875 1.875 1.875h1.625v1.625c0 1.036.84 1.875 1.875 1.875h6c1.036 0 1.875-.84 1.875-1.875v-6c0-1.036-.84-1.875-1.875-1.875h-1.625V3.25c0-1.036-.84-1.875-1.875-1.875zM2.625 3.25c0-.345.28-.625.625-.625h6c.345 0 .625.28.625.625v1.625H6.75c-1.036 0-1.875.84-1.875 1.875v3.125H3.25a.625.625 0 0 1-.625-.625zm3.5 3.5c0-.345.28-.625.625-.625h6c.345 0 .625.28.625.625v6c0 .345-.28.625-.625.625h-6a.625.625 0 0 1-.625-.625z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

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
                placeholder="Message devus..."
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
