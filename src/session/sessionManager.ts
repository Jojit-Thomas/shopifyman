import inquirer from "inquirer";
import { sessionManager, cliKitStore, getCurrentSession, setCurrentSession } from "../storage/localStorage.js";
import triggerLogin from "../utils/login.js";

function getLabel(sessionJson: string): string {
  try {
    const data = JSON.parse(sessionJson);
    const userId = data?.["accounts.shopify.com"]?.identity?.userId ?? "Unknown User";
    const orgId = data?.["accounts.shopify.com"]?.organization?.id ?? "Unknown Org";
    return `User: ${userId} | Org: ${orgId}`;
  } catch {
    return "Invalid session";
  }
}

async function manageSessions(): Promise<void> {
  const sessions = sessionManager.all();
  const currentSession = getCurrentSession();
  
  if (Object.keys(sessions).length === 0) {
    console.log("❌ No sessions to manage.");
    return;
  }

  const { action } = await inquirer.prompt<{ action: string }>([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "📝 Rename a session", value: "rename" },
        { name: "🗑️ Delete a session", value: "delete" },
        { name: "↩️ Back to main menu", value: "back" }
      ],
    },
  ]);

  if (action === "back") return;

  // Sort sessions to show current session first
  const sortedSessions = Object.entries(sessions).sort(([_, value1], [__, value2]) => {
    if (value1 === currentSession) return -1;
    if (value2 === currentSession) return 1;
    return 0;
  });

  const { sessionToManage } = await inquirer.prompt<{ sessionToManage: string }>([
    {
      type: "list",
      name: "sessionToManage",
      message: "Select a session:",
      choices: sortedSessions.map(([name, value]) => ({
        name: `${name} - ${getLabel(value)}${currentSession === value ? " (current)" : ""}`,
        value: name,
      })),
    },
  ]);

  if (action === "delete") {
    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: "confirm",
        name: "confirmed",
        message: `Are you sure you want to delete the session "${sessionToManage}"?${currentSession === sessions[sessionToManage] ? " This is your current session!" : ""}`,
        default: false,
      },
    ]);

    if (!confirmed) {
      console.log("❌ Deletion cancelled.");
      return manageSessions();
    }

    // If deleting current session, clear it first
    if (currentSession === sessions[sessionToManage]) {
      cliKitStore.delete("sessionStore");
    }

    sessionManager.delete(sessionToManage);
    console.log(`✅ Session "${sessionToManage}" deleted.`);
  } else if (action === "rename") {
    const { newName } = await inquirer.prompt<{ newName: string }>([
      {
        type: "input",
        name: "newName",
        message: "Enter new name for the session:",
        validate: (input: string) => {
          if (!input.trim()) return "Session name is required";
          if (input in sessions && input !== sessionToManage) return "A session with this name already exists";
          return true;
        },
      },
    ]);

    const sessionData = sessionManager.get(sessionToManage);
    if (sessionData) {
      sessionManager.delete(sessionToManage);
      sessionManager.set(newName, sessionData);
      console.log(`✅ Session renamed from "${sessionToManage}" to "${newName}".`);
    }
  }

  return manageSessions();
}

async function addNewSession(): Promise<void> {
  console.log("\n🔐 Starting login for new partner account...");

  const existingSession = getCurrentSession();
  if (existingSession) {
    sessionManager.set("__backup__", existingSession);
    cliKitStore.delete("sessionStore");
    console.log("⚠️  Existing session backed up.");
  }

  try {
    await triggerLogin();
    
    // Wait a bit longer to ensure session is saved
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newSession = getCurrentSession();
    if (!newSession) {
      throw new Error("No session was saved after login");
    }

    const { name } = await inquirer.prompt<{ name: string }>([
      {
        type: "input",
        name: "name",
        message: "Name this session (e.g., 'main', 'client-xyz'):",
        validate: (input: string) => {
          if (!input.trim()) return "Session name is required";
          if (input in sessionManager.all()) return "A session with this name already exists";
          return true;
        },
      },
    ]);

    sessionManager.set(name, newSession);
    console.log(`✅ New session "${name}" saved.`);
    sessionManager.delete("__backup__");
  } catch (error) {
    console.error("❌ Login failed:", error);
    const backup = sessionManager.get("__backup__");
    if (backup) {
      setCurrentSession(backup);
      sessionManager.delete("__backup__");
      console.log("🔁 Restored previous session.");
    }
  }
}

export { getLabel, manageSessions, addNewSession }; 