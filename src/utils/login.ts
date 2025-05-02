import { spawn, ChildProcess } from "child_process";

async function triggerLogin(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child: ChildProcess = spawn("shopify", ["app", "config", "link"], {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let hasLoggedIn = false;
    let hasSeenDeviceCode = false;
    let loginTimeout: NodeJS.Timeout;

    if (child.stdout) {
      child.stdout.on("data", (chunk: Buffer) => {
        const output = chunk.toString();
        process.stdout.write(output);

        if (output.includes("Logged in as") || output.includes("Successfully logged in") || output.includes("✔ Logged in.")) {
          hasLoggedIn = true;
          if (loginTimeout) clearTimeout(loginTimeout);
          // Add a small delay to ensure session is saved
          setTimeout(() => {
            resolve();
          }, 1000);
        }

        if (output.includes("User verification code:")) {
          hasSeenDeviceCode = true;
          // Start timeout for device code login
          loginTimeout = setTimeout(() => {
            if (!hasLoggedIn) {
              reject(new Error("Login timed out - please try again"));
            }
          }, 30000);
        }

        if (output.includes("Create this project as a new app on Shopify?")) {
          console.log("\n🛑 Detected app creation prompt — terminating login flow.");
          if (loginTimeout) clearTimeout(loginTimeout);
          child.kill("SIGINT");
          resolve();
        }
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk: Buffer) => {
        const error = chunk.toString();
        if (!error.includes("Failed to prompt") && !error.includes("non-interactively")) {
          process.stderr.write(chunk);
        }
      });
    }

    child.on("error", (err: Error) => {
      if (loginTimeout) clearTimeout(loginTimeout);
      reject(err);
    });

    child.on("exit", (code: number | null) => {
      if (loginTimeout) clearTimeout(loginTimeout);
      
      if (hasLoggedIn || code === 0 || code === 130) {
        // Add a small delay to ensure session is saved
        setTimeout(() => {
          resolve();
        }, 1000);
      } else if (!hasSeenDeviceCode) {
        reject(new Error(`Login exited with code ${code}`));
      }
    });
  });
}

export default triggerLogin;