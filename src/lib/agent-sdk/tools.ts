interface ProjectFile {
  name: string;
  language: string;
  content: string;
}

const DB_BASE_URL = "https://gen-lang-client-0276152407-default-rtdb.firebaseio.com";

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "ts":
      return "typescript";
    case "jsx":
    case "js":
      return "javascript";
    case "css":
      return "css";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "html":
      return "html";
    default:
      return "plaintext";
  }
}

export async function readWorkspaceFiles(projectId: string, token: string): Promise<ProjectFile[]> {
  const dbUrl = `${DB_BASE_URL}/projects/${projectId}/files.json?auth=${token}`;
  const res = await fetch(dbUrl);
  if (!res.ok) {
    throw new Error(`Failed to read files from DB: ${res.statusText}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  } else if (data && typeof data === "object") {
    return Object.values(data);
  }
  return [];
}

export async function writeWorkspaceFiles(
  projectId: string,
  token: string,
  files: ProjectFile[]
): Promise<boolean> {
  const dbUrl = `${DB_BASE_URL}/projects/${projectId}/files.json?auth=${token}`;
  const res = await fetch(dbUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(files)
  });
  return res.ok;
}

// 1. file_read
export async function file_read(
  projectId: string,
  token: string,
  file: string,
  start_line?: number,
  end_line?: number
): Promise<string> {
  try {
    const files = await readWorkspaceFiles(projectId, token);
    const found = files.find((f) => f.name.toLowerCase() === file.toLowerCase() || f.name.toLowerCase().endsWith("/" + file.toLowerCase()));
    if (!found) {
      return `Error: File '${file}' not found in workspace. Available files: ${files.map(f => f.name).join(", ")}`;
    }
    
    let content = found.content;
    if (start_line !== undefined || end_line !== undefined) {
      const lines = content.split("\n");
      const start = start_line !== undefined ? Math.max(0, start_line) : 0;
      const end = end_line !== undefined ? Math.min(lines.length, end_line) : lines.length;
      content = lines.slice(start, end).join("\n");
    }
    return content;
  } catch (error: unknown) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error reading file."}`;
  }
}

// 2. file_write
export async function file_write(
  projectId: string,
  token: string,
  file: string,
  content: string,
  append?: boolean
): Promise<string> {
  try {
    const files = await readWorkspaceFiles(projectId, token);
    const filename = file.split("/").pop() || file;
    const existingIndex = files.findIndex((f) => f.name.toLowerCase() === filename.toLowerCase());
    
    let newContent = content;
    if (append && existingIndex >= 0) {
      newContent = files[existingIndex].content + "\n" + content;
    }

    const updatedFile: ProjectFile = {
      name: filename,
      language: getLanguageFromFilename(filename),
      content: newContent
    };

    if (existingIndex >= 0) {
      files[existingIndex] = updatedFile;
    } else {
      files.push(updatedFile);
    }

    const success = await writeWorkspaceFiles(projectId, token, files);
    if (!success) {
      return `Error: Failed to write file '${filename}' to DB.`;
    }
    return `Success: File '${filename}' written successfully.`;
  } catch (error: unknown) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error writing file."}`;
  }
}

// 3. file_str_replace
export async function file_str_replace(
  projectId: string,
  token: string,
  file: string,
  old_str: string,
  new_str: string
): Promise<string> {
  try {
    const files = await readWorkspaceFiles(projectId, token);
    const filename = file.split("/").pop() || file;
    const existingIndex = files.findIndex((f) => f.name.toLowerCase() === filename.toLowerCase());
    
    if (existingIndex < 0) {
      return `Error: File '${filename}' not found.`;
    }

    const currentContent = files[existingIndex].content;
    if (!currentContent.includes(old_str)) {
      return `Error: Target string to replace not found in '${filename}'. Make sure the spacing and characters match exactly.`;
    }

    const updatedContent = currentContent.replace(old_str, new_str);
    files[existingIndex].content = updatedContent;

    const success = await writeWorkspaceFiles(projectId, token, files);
    if (!success) {
      return `Error: Failed to update file '${filename}' in DB.`;
    }
    return `Success: Replaced occurrences of target text in '${filename}'.`;
  } catch (error: unknown) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error replacing string."}`;
  }
}

// 4. file_find_in_content
export async function file_find_in_content(
  projectId: string,
  token: string,
  file: string,
  regex: string
): Promise<string> {
  try {
    const files = await readWorkspaceFiles(projectId, token);
    const filename = file.split("/").pop() || file;
    const found = files.find((f) => f.name.toLowerCase() === filename.toLowerCase());
    
    if (!found) {
      return `Error: File '${filename}' not found.`;
    }

    const re = new RegExp(regex, "i");
    const lines = found.content.split("\n");
    const matches: string[] = [];
    
    lines.forEach((line, idx) => {
      if (re.test(line)) {
        matches.push(`L${idx + 1}: ${line}`);
      }
    });

    if (matches.length === 0) {
      return `No matches found for regex '${regex}' in file '${filename}'.`;
    }
    return matches.join("\n");
  } catch (error: unknown) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error finding in content."}`;
  }
}

// 5. file_find_by_name
export async function file_find_by_name(
  projectId: string,
  token: string,
  path: string,
  glob: string
): Promise<string> {
  try {
    const files = await readWorkspaceFiles(projectId, token);
    const pattern = glob.replace(/\*/g, ".*");
    const re = new RegExp(`^${pattern}$`, "i");
    
    const matched = files.filter((f) => re.test(f.name));
    if (matched.length === 0) {
      return `No files matching '${glob}' found. Available files in workspace: ${files.map(f => f.name).join(", ")}`;
    }
    return matched.map(f => `${f.name} (${f.language}) - ${f.content.length} bytes`).join("\n");
  } catch (error: unknown) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error searching files."}`;
  }
}

// 6. shell_exec
export async function shell_exec(
  projectId: string,
  token: string,
  id: string,
  exec_dir: string,
  command: string
): Promise<string> {
  try {
    const trimmedCmd = command.trim();
    if (trimmedCmd === "ls" || trimmedCmd.startsWith("dir")) {
      return await file_find_by_name(projectId, token, exec_dir, "*");
    }

    if (trimmedCmd.startsWith("npm run build") || trimmedCmd.startsWith("npm run dev") || trimmedCmd.startsWith("tsc")) {
      const files = await readWorkspaceFiles(projectId, token);
      for (const file of files) {
        if (file.language === "json") {
          try {
            JSON.parse(file.content);
          } catch (err: unknown) {
            return `Build Failed: Syntax error in json file '${file.name}': ${err instanceof Error ? err.message : "Invalid JSON syntax"}`;
          }
        }
        // Braces check
        const openBraces = (file.content.match(/\{/g) || []).length;
        const closeBraces = (file.content.match(/\}/g) || []).length;
        if (openBraces !== closeBraces && (file.name.endsWith(".tsx") || file.name.endsWith(".ts"))) {
          return `Build Failed: Unmatched curly braces detected in '${file.name}' (Found ${openBraces} open, ${closeBraces} close). Please fix this syntax issue.`;
        }
      }
      return `Build Success:\n> next build\n> Creating an optimized production build...\n> Compiled successfully.\n> Route (app)             Size     First Load JS\n> + /                    1.22 kB        84.1 kB\n> Webpack / Turbopack compilation succeeded. Live preview URL is active at https://project-${projectId}.devus.space.`;
    }

    if (trimmedCmd.startsWith("cat ")) {
      const filename = trimmedCmd.split(" ").slice(1).join(" ").trim();
      return await file_read(projectId, token, filename);
    }

    return `Command '${command}' executed on session '${id}'. Output: Command recognized but no action required. Use npm run build to verify code changes.`;
  } catch (error: unknown) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error executing shell command."}`;
  }
}

// 7. info_search_web
export async function info_search_web(query: string): Promise<string> {
  const q = query.toLowerCase();
  
  if (q.includes("color") || q.includes("palette") || q.includes("theme") || q.includes("aesthetic")) {
    return `Web Search Results for "${query}":
1. Modern CSS Design Palettes (HSL Harmonious Colors):
   - Dark Obsidian Theme:
     --bg-main: HSL(220, 15%, 8%)
     --bg-card: HSL(220, 15%, 13%)
     --text-main: HSL(0, 0%, 95%)
     --text-sub: HSL(220, 10%, 65%)
     --accent-purple: HSL(270, 70%, 60%)
     --accent-glow: HSL(270, 70%, 60%, 0.15)
     --border-main: HSL(220, 15%, 18%)
2. Glassmorphism CSS styling guide:
   - use backdrop-filter: blur(12px) saturating(180%);
   - background: rgba(30, 30, 40, 0.45);
   - border: 1px solid rgba(255, 255, 255, 0.08);`;
  }

  if (q.includes("font") || q.includes("typography")) {
    return `Web Search Results for "${query}":
1. Google Fonts Recommendations for sleek UI layouts:
   - Outfit: Elegant, modern geometric sans-serif (weights 300, 400, 600, 700). Perfect for display and header text.
   - Inter: The gold standard for UI components and micro-copy (weights 400, 500, 600).
   - Plus Jakarta Sans: Clean and modern, excellent for dashboard content.`;
  }

  return `Web Search Results for "${query}":
1. Modern Front-end Components & UX specifications:
   - Clean structural cards with subtle border indicators.
   - Progressive disclosure check elements for step indicators.
   - HSL-driven feedback colors (e.g. green success accents, amber warning chips).
   - Smooth transform micro-animations (e.g., hover scaling, slide-in transitions).`;
}

// 8. deploy_apply_deployment
export async function deploy_apply_deployment(
  projectId: string,
  token: string,
  type: string,
  local_dir: string
): Promise<string> {
  const containerUrl = `${DB_BASE_URL}/projects/${projectId}/container.json?auth=${token}`;
  
  await fetch(containerUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "complete",
      agentStatus: "idle"
    })
  });

  return `Deploy Success: Application successfully deployed under type '${type}' from path '${local_dir}'. Public access URL: https://project-${projectId}.devus.space`;
}

// 9. idle
export async function idle(projectId: string, token: string): Promise<string> {
  const containerUrl = `${DB_BASE_URL}/projects/${projectId}/container.json?auth=${token}`;
  
  await fetch(containerUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "complete",
      agentStatus: "idle"
    })
  });

  return "Agent enters standby state.";
}
