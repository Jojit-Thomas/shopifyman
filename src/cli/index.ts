#!/usr/bin/env node

import inquirer from "inquirer";
import { sessionManager, getCurrentSession, setCurrentSession } from "../storage/localStorage.js";
import { getLabel, manageSessions, addNewSession } from "../session/sessionManager.js";

async function selectSession(): Promise<void> {
  try {
    const sessions = sessionManager.all();
    const currentSession = getCurrentSession();

    // Check if current session exists in our store
    if (currentSession) {
      const existingSession = Object.entries(sessions).find(([_, value]) => value === currentSession);
      if (!existingSession) {
        const { name } = await inquirer.prompt<{ name: string }>([
          {
            type: "input",
            name: "name",
            message: "Name this current session (e.g., 'main', 'client-xyz'):",
            validate: (input: string) => {
              if (!input.trim()) return "Session name is required";
              if (input in sessions) return "A session with this name already exists";
              return true;
            },
          },
        ]);
        sessionManager.set(name, currentSession);
        console.log(`✅ Current session saved as "${name}".`);
        return selectSession();
      }
    }

    // Sort sessions to show current session first
    const sortedSessions = Object.entries(sessions).sort(([_, value1], [__, value2]) => {
      if (value1 === currentSession) return -1;
      if (value2 === currentSession) return 1;
      return 0;
    });

    const choices = sortedSessions.map(([name, value]) => ({
      name: `${name} - ${getLabel(value)}${currentSession === value ? " (current)" : ""}`,
      value: name,
    }));

    choices.push(
      { name: "➕ Add new partner account", value: "__add_new__" },
      { name: "⚙️ Manage sessions", value: "__manage__" }
    );

    const { selected } = await inquirer.prompt<{ selected: string }>([
      {
        type: "list",
        name: "selected",
        message: "Select a partner account to use:",
        choices,
      },
    ]);

    if (selected === "__add_new__") {
      await addNewSession();
      return selectSession();
    }

    if (selected === "__manage__") {
      await manageSessions();
      return selectSession();
    }

    const sessionData = sessionManager.get(selected);
    if (!sessionData) {
      console.error("❌ Session data missing.");
      return;
    }

    setCurrentSession(sessionData);
    console.log(`✅ Switched to "${selected}".`);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    }
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

// ----- Entry Point -----
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

selectSession().catch((err: unknown) => {
  if (err && typeof err === 'object' && 'name' in err && err.name === 'ExitPromptError') {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
  console.error("❌ Unexpected error:", err);
  process.exit(1);
}); 