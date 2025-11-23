import { HistoryRecord, NotebookEntry, WebDAVConfig } from "../types";

const HISTORY_FILE = "echoback_history.json";
const NOTEBOOK_FILE = "echoback_notebook.json";

export class WebDAVService {
  private config: WebDAVConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  loadConfig(): WebDAVConfig | null {
    const stored = localStorage.getItem("echoback_webdav");
    if (stored) {
      try {
        this.config = JSON.parse(stored);
      } catch (e) {
        console.error("Invalid WebDAV config", e);
      }
    }
    return this.config;
  }

  saveConfig(config: WebDAVConfig) {
    localStorage.setItem("echoback_webdav", JSON.stringify(config));
    this.config = config;
  }

  getConfig(): WebDAVConfig | null {
      return this.config;
  }

  private getHeaders() {
    if (!this.config) return {};
    const auth = btoa(`${this.config.username}:${this.config.password}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  private getBaseUrl(configOverride?: WebDAVConfig): string {
    const cfg = configOverride || this.config;
    
    // Default logic: If config exists but URL is empty/whitespace, use local proxy
    if (cfg && (!cfg.url || cfg.url.trim() === '')) {
        return `${window.location.origin}/webdav-proxy/`;
    }

    if (cfg?.url) {
        return cfg.url.endsWith('/') ? cfg.url : `${cfg.url}/`;
    }
    
    // Fallback
    return `${window.location.origin}/webdav-proxy/`;
  }

  private getUrl(filename: string): string {
    // We need to know if config is enabled at least, even if URL is empty (for default)
    if (!this.config) return "";
    return `${this.getBaseUrl()}${filename}`;
  }

  async checkConnection(config?: WebDAVConfig): Promise<boolean> {
    const targetConfig = config || this.config;
    if (!targetConfig) return false;

    // Use a temporary instance or logic to test specific credentials
    const auth = btoa(`${targetConfig.username}:${targetConfig.password}`);
    const headers = { 'Authorization': `Basic ${auth}` };
    const url = this.getBaseUrl(targetConfig);

    try {
      // Try PROPFIND or simply checking a file existence. 
      // Many WebDAV servers allow PROPFIND on the root.
      const response = await fetch(url, {
        method: 'PROPFIND',
        headers: {
            ...headers,
            'Depth': '0'
        }
      });
      return response.ok || response.status === 405; // 405 sometimes returned if Method not allowed but Auth was good
    } catch (e) {
      console.error("WebDAV Connection failed", e);
      return false;
    }
  }

  // Generic Get
  private async getFile<T>(filename: string): Promise<T[]> {
    if (!this.config?.enabled) return [];
    
    try {
      const response = await fetch(this.getUrl(filename), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`WebDAV GET failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (e) {
      console.warn(`Could not fetch ${filename} from WebDAV (might be offline or first run).`, e);
      return [];
    }
  }

  // Generic Put
  private async putFile<T>(filename: string, data: T[]): Promise<void> {
    if (!this.config?.enabled) return;

    try {
      const response = await fetch(this.getUrl(filename), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`WebDAV PUT failed: ${response.statusText}`);
      }
    } catch (e) {
      console.error(`Failed to upload ${filename} to WebDAV`, e);
      throw e;
    }
  }

  // Sync Logic: Merge Local + Remote -> Unique Set -> Save to both
  async syncData(
    localHistory: HistoryRecord[], 
    localNotebook: NotebookEntry[]
  ): Promise<{ history: HistoryRecord[], notebook: NotebookEntry[] }> {
    if (!this.config?.enabled) {
        return { history: localHistory, notebook: localNotebook };
    }

    // 1. Download Remote
    const remoteHistory = await this.getFile<HistoryRecord>(HISTORY_FILE);
    const remoteNotebook = await this.getFile<NotebookEntry>(NOTEBOOK_FILE);

    // 2. Merge History (Dedup by ID)
    const historyMap = new Map<string, HistoryRecord>();
    [...remoteHistory, ...localHistory].forEach(item => {
        // Simple logic: If duplicate, trust the one that exists (assumed immutable usually, 
        // or we could check timestamps if we supported editing).
        // Since we mainly add, overwriting with local ensures latest local edits if any.
        historyMap.set(item.id, item);
    });
    const mergedHistory = Array.from(historyMap.values()).sort((a, b) => b.timestamp - a.timestamp);

    // 3. Merge Notebook
    const notebookMap = new Map<string, NotebookEntry>();
    [...remoteNotebook, ...localNotebook].forEach(item => {
        notebookMap.set(item.id, item);
    });
    const mergedNotebook = Array.from(notebookMap.values()).sort((a, b) => b.timestamp - a.timestamp);

    // 4. Upload Merged
    await this.putFile(HISTORY_FILE, mergedHistory);
    await this.putFile(NOTEBOOK_FILE, mergedNotebook);

    return { history: mergedHistory, notebook: mergedNotebook };
  }

  async pushChanges(history: HistoryRecord[], notebook: NotebookEntry[]) {
      if (!this.config?.enabled) return;
      // Just overwrite remote with current state (assuming current state is already a result of a sync or valid action)
      // However, safer to re-merge if multiple devices active. 
      // For this app, we will just PUT the current state to keep it simple, assuming single-user concurrency.
      await this.putFile(HISTORY_FILE, history);
      await this.putFile(NOTEBOOK_FILE, notebook);
  }
}

export const webdav = new WebDAVService();