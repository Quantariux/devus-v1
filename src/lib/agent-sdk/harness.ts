/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  file_read,
  file_write,
  file_str_replace,
  file_find_in_content,
  file_find_by_name,
  shell_exec,
  info_search_web,
  deploy_apply_deployment,
  idle
} from "./tools";

const DB_BASE_URL = "https://gen-lang-client-0276152407-default-rtdb.firebaseio.com";
const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM_INSTRUCTION = `You are Antigravity, an elite, autonomous AI software engineer and UX design specialist designed by the Google DeepMind team. You are pair programming with the USER to modify, refactor, and compile this containerized cloud workspace.
You operate in an agent loop, iteratively completing tasks step-by-step through a Prompt -> Reason -> Act -> Observe cycle.

=== IDENTITY & VIBE (More powerful than Manus, elite Vibe Coder) ===
- You are fast-moving, design-obsessed, and write clean, premium code.
- You maintain documentation integrity (keep all existing comments/docstrings intact).
- You avoid simple, plain lists or bullet points in final outputs, preferring engaging paragraphs and prose.

=== MODERN UX & DESIGN SYSTEM SPECIFICATIONS ===
- Visual Excellence is MANDATORY: Implement HSL tailored harmonious colors (Obsidian dark modes, vibrant gradients, glassmorphism layouts).
- Use Backdrop filter blurs: backdrop-filter: blur(12px) saturating(180%), transparent borders, HSL feedback shadows.
- Typography: Use premium Google Fonts (Outfit for elegant headings, Inter for clean copy, Plus Jakarta Sans for dashboards) instead of browser defaults.
- Micro-animations: Add interactive hover scale effects, fade transitions, and checkmark step transitions.
- No Placeholders: Do not write mock UI or placeholders. Implement working, responsive designs.

=== WRITING & IMPLEMENTATION WORKFLOW ===
1. Analyze & Read: Check existing codebase configuration and stylesheet systems first using file tools.
2. Targeted Edits: Prefer specialized file edit tools (like file_str_replace) over overwriting large files to keep edits quick and accurate.
3. Verify Compilation: Verify all code modifications using shell_exec("npm run build") to check syntax and TypeScript compilation before finishing.
4. Deploy: Proactively apply your deployments and trigger idle standby when the task is resolved.

=== SYSTEM CAPABILITIES & RULES ===
- Default working language is English.
- Tool Call Structure: Output only one tool call per step. Provide a clear reasoning thought prefixed with "Thought: <your thought>" before calling the tool.
- Tool errors: Analyze logs or TypeScript syntax errors, fix unmatched braces, and try alternative approaches recursively.
`;

const TOOL_DECLARATIONS = [
  {
    functionDeclarations: [
      {
        name: "file_read",
        description: "Read file content. Use for checking file contents, analyzing logs, or reading configuration files.",
        parameters: {
          type: "OBJECT",
          properties: {
            file: {
              type: "STRING",
              description: "Absolute path or filename of the file to read"
            },
            start_line: {
              type: "INTEGER",
              description: "Starting line to read from (0-indexed)"
            },
            end_line: {
              type: "INTEGER",
              description: "Ending line number (exclusive)"
            }
          },
          required: ["file"]
        }
      },
      {
        name: "file_write",
        description: "Overwrite or append content to a file. Use for creating new files or modifying existing files.",
        parameters: {
          type: "OBJECT",
          properties: {
            file: {
              type: "STRING",
              description: "Absolute path or filename of the file to write to"
            },
            content: {
              type: "STRING",
              description: "Text content to write"
            },
            append: {
              type: "BOOLEAN",
              description: "Whether to append to the file instead of overwriting"
            }
          },
          required: ["file", "content"]
        }
      },
      {
        name: "file_str_replace",
        description: "Replace a specific string block in a file. Highly recommended for targeted edits in code files.",
        parameters: {
          type: "OBJECT",
          properties: {
            file: {
              type: "STRING",
              description: "Absolute path or filename of the file to edit"
            },
            old_str: {
              type: "STRING",
              description: "The exact original block of text to replace"
            },
            new_str: {
              type: "STRING",
              description: "The new drop-in replacement text"
            }
          },
          required: ["file", "old_str", "new_str"]
        }
      },
      {
        name: "file_find_in_content",
        description: "Search for matching text patterns using regex within a file.",
        parameters: {
          type: "OBJECT",
          properties: {
            file: {
              type: "STRING",
              description: "Absolute path or filename to search within"
            },
            regex: {
              type: "STRING",
              description: "Regular expression pattern to match"
            }
          },
          required: ["file", "regex"]
        }
      },
      {
        name: "file_find_by_name",
        description: "Find files by name pattern in specified directory.",
        parameters: {
          type: "OBJECT",
          properties: {
            path: {
              type: "STRING",
              description: "Absolute directory path to search (default to '.')"
            },
            glob: {
              type: "STRING",
              description: "Filename search pattern using glob syntax (e.g. *.tsx)"
            }
          },
          required: ["path", "glob"]
        }
      },
      {
        name: "shell_exec",
        description: "Execute terminal commands in the sandbox environment (e.g. npm run build, ls, check status).",
        parameters: {
          type: "OBJECT",
          properties: {
            id: {
              type: "STRING",
              description: "Unique terminal session identifier (use 'default')"
            },
            exec_dir: {
              type: "STRING",
              description: "Working directory for command execution"
            },
            command: {
              type: "STRING",
              description: "Shell command line to execute"
            }
          },
          required: ["id", "exec_dir", "command"]
        }
      },
      {
        name: "info_search_web",
        description: "Search the web for design systems, HSL color palettes, google fonts recommendations, or Next.js layout configurations.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "Search query containing 3-5 keywords"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "deploy_apply_deployment",
        description: "Deploy the static site or Next.js app to production, establishing the active live reload URL.",
        parameters: {
          type: "OBJECT",
          properties: {
            type: {
              type: "STRING",
              description: "Deployment type: 'static' or 'nextjs'"
            },
            local_dir: {
              type: "STRING",
              description: "Directory containing assets to compile and deploy"
            }
          },
          required: ["type", "local_dir"]
        }
      },
      {
        name: "idle",
        description: "Call this tool once all tasks are complete, validating workspace changes, and entering standby mode.",
        parameters: {
          type: "OBJECT"
        }
      }
    ]
  }
];

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

export async function runAgentHarness(
  projectId: string,
  token: string,
  taskPrompt: string,
  userKey?: string
): Promise<string> {
  const apiKey = userKey || DEFAULT_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Configure GEMINI_API_KEY or supply a user BYOK key.");
  }

  const containerUrl = `${DB_BASE_URL}/projects/${projectId}/container.json?auth=${token}`;
  const logsUrl = `${DB_BASE_URL}/projects/${projectId}/container/logs.json?auth=${token}`;

  // Helper to log message
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

  // Helper to update container status state
  const updateStatus = async (status: string, agentStatus: string) => {
    await fetch(containerUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, agentStatus })
    });
  };

  try {
    await updateStatus("launching", "idle");
    await logToDB("Initializing autonomous reasoning harness...", "system");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: TOOL_DECLARATIONS as any,
      systemInstruction: SYSTEM_INSTRUCTION
    });

    await updateStatus("running", "coding");
    await logToDB("Harness connected. Spawning agent reasoning loop...", "system");

    const chat = model.startChat();
    let result = await chat.sendMessage(taskPrompt);
    let stepCount = 0;
    const MAX_STEPS = 12;

    while (stepCount < MAX_STEPS) {
      stepCount++;
      const text = result.response.text();
      const functionCalls = result.response.functionCalls();

      if (text) {
        // Log the agent's thought/message
        await logToDB(text, "agent");
      }

      if (!functionCalls || functionCalls.length === 0) {
        // No function calls, the agent has finished its work
        break;
      }

      // We have function calls, execute them
      const functionResponses = [];

      for (const call of functionCalls) {
        const { name, args } = call;
        const argStr = JSON.stringify(args);
        
        await logToDB(`Executing Tool Action: ${name}(${argStr})`, "agent");

        let output = "";
        if (name === "file_read") {
          const file = (args as any).file;
          const start = (args as any).start_line;
          const end = (args as any).end_line;
          output = await file_read(projectId, token, file, start, end);
        } else if (name === "file_write") {
          const file = (args as any).file;
          const content = (args as any).content;
          const append = (args as any).append;
          output = await file_write(projectId, token, file, content, append);
        } else if (name === "file_str_replace") {
          const file = (args as any).file;
          const old_str = (args as any).old_str;
          const new_str = (args as any).new_str;
          output = await file_str_replace(projectId, token, file, old_str, new_str);
        } else if (name === "file_find_in_content") {
          const file = (args as any).file;
          const regex = (args as any).regex;
          output = await file_find_in_content(projectId, token, file, regex);
        } else if (name === "file_find_by_name") {
          const path = (args as any).path;
          const glob = (args as any).glob;
          output = await file_find_by_name(projectId, token, path, glob);
        } else if (name === "shell_exec") {
          const id = (args as any).id;
          const exec_dir = (args as any).exec_dir;
          const command = (args as any).command;
          if (command.includes("build") || command.includes("compile")) {
            await updateStatus("deploying", "deploying");
          } else {
            await updateStatus("running", "browsing");
          }
          output = await shell_exec(projectId, token, id, exec_dir, command);
        } else if (name === "info_search_web") {
          const query = (args as any).query;
          output = await info_search_web(query);
        } else if (name === "deploy_apply_deployment") {
          const type = (args as any).type;
          const local_dir = (args as any).local_dir;
          await updateStatus("deploying", "deploying");
          output = await deploy_apply_deployment(projectId, token, type, local_dir);
        } else if (name === "idle") {
          output = await idle(projectId, token);
        } else {
          output = `Error: Tool '${name}' is not recognized.`;
        }

        await logToDB(`Observation / Tool Output: ${output}`, "agent");

        functionResponses.push({
          functionResponse: {
            name,
            response: { result: output }
          }
        });
      }

      // Send the tool execution outputs back to the agent
      await updateStatus("running", "coding");
      result = await chat.sendMessage(functionResponses);
    }

    await updateStatus("complete", "idle");
    await logToDB("Sandbox execution complete. Live reload successful!", "system", true);
    return "Success";
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Harness execution error:", error);
    await updateStatus("complete", "idle");
    await logToDB(`Harness Execution Error: ${msg}`, "system");
    throw error;
  }
}
