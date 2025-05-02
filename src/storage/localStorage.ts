import Config from "conf";

class LocalStorage<T extends { [key: string]: any }> {
  private readonly config: Config<T>;

  constructor(options: { projectName?: string }) {
    this.config = new Config<T>(options);
  }

  get<TKey extends keyof T>(key: TKey): T[TKey] | undefined {
    return this.config.get(key);
  }

  set<TKey extends keyof T>(key: TKey, value?: T[TKey]): void {
    this.config.set(key, value);
  }

  delete<TKey extends keyof T>(key: TKey): void {
    this.config.delete(key);
  }

  clear(): void {
    this.config.clear();
  }

  all(): T {
    return this.config.store;
  }
}

// ----- Config Stores -----
type SessionStore = { [name: string]: string };

const sessionManager = new LocalStorage<SessionStore>({ projectName: "shopify-session-manager" });
const cliKitStore = new LocalStorage<{ sessionStore: string }>({ projectName: "shopify-cli-kit" });

function getCurrentSession(): string | undefined {
  return cliKitStore.get("sessionStore");
}

function setCurrentSession(session: string): void {
  cliKitStore.set("sessionStore", session);
}

export { LocalStorage, sessionManager, cliKitStore, getCurrentSession, setCurrentSession, SessionStore }; 