import { spawn, ChildProcess } from "node:child_process";
import readline from "node:readline";
import { EventEmitter } from "node:events";
import { JsonRpcRequest, JsonRpcNotification, ThreadResult } from "./rpc-types";

const isVerbose = process.env.CODEX_DEBUG === "true";

const logger = {
  info: (msg: string, ...args: any[]) => console.info(`[CodexWorker] ℹ️ ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[CodexWorker] ❌ ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[CodexWorker] ⚠️ ${msg}`, ...args),
  debug: (msg: string, ...args: any[]) => {
    if (isVerbose && process.env.NODE_ENV !== "production") {
      console.debug(`[CodexWorker] 🔍 ${msg}`, ...args);
    }
  },
};

class CodexWorker extends EventEmitter {
  private static instance: CodexWorker;
  private proc: ChildProcess | null = null;
  private nextId = 0;
  public initialized = false;
  private initPromise: Promise<void> | null = null;
  public lastThreadId: string | null = null;
  public threads: ThreadResult[] = [];

  // To track pending requests by ID
  private pendingRequests = new Map<number | string, { resolve: (val: any) => void, reject: (err: any) => void }>();

  private constructor() {
    super();
  }

  public static getInstance(): CodexWorker {
    if (!CodexWorker.instance) {
      CodexWorker.instance = new CodexWorker();
    }
    return CodexWorker.instance;
  }

  public async start(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        logger.info("Starting codex app-server...");
        this.proc = spawn("codex", ["app-server"], {
          stdio: ["pipe", "pipe", "inherit"],
          shell: true,
        });

        if (!this.proc.stdout || !this.proc.stdin) {
          throw new Error("Failed to attach stdio pipes to codex app-server");
        }

        const rl = readline.createInterface({ input: this.proc.stdout });

        rl.on("line", (line) => {
          if (!line.trim()) return;
          try {
            const msg = JSON.parse(line);
            logger.debug(`server → client:`, msg);
            this.handleMessage(msg);
          } catch (err) {
            logger.error("Failed to parse codex message", err);
          }
        });

        this.proc.on("error", (err) => {
          logger.error("Process error:", err);
          reject(err);
        });

        this.proc.on("exit", (code) => {
          if (code !== 0 && code !== null) {
            logger.error(`Codex worker exited unexpectedly with code ${code}`);
          } else {
            logger.info(`Codex worker exited gracefully (code: ${code})`);
          }
          this.proc = null;
          this.initialized = false;
          this.initPromise = null;
          this.lastThreadId = null;
          this.threads = [];
        });

        // Initialize Codex Server
        this.sendRequest("initialize", {
          clientInfo: {
            name: "codex_bridge_web",
            title: "Codex Bridge Web App",
            version: "0.1.0",
          },
          capabilities: {
            experimentalApi: true
          }
        }).then(async () => {
          // Send notification: initialized
          this.sendNotification("initialized", {});

          this.initialized = true;
          logger.info("Codex app-server fully initialized.");
          resolve();
        }).catch(reject);

      } catch (err) {
        logger.error("Failed to start codex worker:", err);
        reject(err);
      }
    });

    return this.initPromise;
  }

  private handleMessage(msg: any) {
    if ('id' in msg && ('result' in msg || 'error' in msg)) {
      const id = msg.id;
      const pending = this.pendingRequests.get(id);
      if (pending) {
        if (msg.error) {
          pending.reject(msg.error);
        } else {
          pending.resolve(msg.result);
        }
        this.pendingRequests.delete(id);
      }
    } else if ('method' in msg) {
      this.emit('notification', msg as JsonRpcNotification);
    } else {
      this.emit('serverRequest', msg);
    }
  }

  public async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.proc || !this.proc.stdin) {
      if (!this.initialized) await this.start();
      if (!this.proc || !this.proc.stdin) throw new Error("Worker not running.");
    }

    const id = ++this.nextId;
    const req: JsonRpcRequest = { id, method, params };

    logger.debug(`client → server [request:${id}]:`, { method, params });

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      const payload = JSON.stringify(req) + "\n";
      this.proc!.stdin!.write(payload, (error) => {
        if (error) {
          logger.error(`Failed to send request ${id}:`, error);
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
    });
  }

  public sendNotification(method: string, params?: any): void {
    if (!this.proc || !this.proc.stdin) return;
    const req: JsonRpcNotification = { method, params };
    logger.debug(`client ↠ server [notification]:`, { method, params });
    const payload = JSON.stringify(req) + "\n";
    this.proc.stdin.write(payload);
  }

  public async listThreads(params: any = {}): Promise<any> {
    const result = await this.sendRequest("thread/list", params);
    const threads = result?.data || result?.threads;
    if (Array.isArray(threads)) {
      this.threads = threads.map((t: any) => ({
        thread: t.thread || t
      }));
    }
    return result;
  }

  public async readThread(threadId: string): Promise<any> {
    const result = await this.sendRequest("thread/read", {
      threadId,
      includeTurns: true
    });
    return result;
  }

  public async listModels(params: any = {}): Promise<any> {
    return await this.sendRequest("model/list", params);
  }
}

// Re-declare global to avoid type issues in some environments
const globalAny = global as any;
export const codexWorker = globalAny.codexWorker || CodexWorker.getInstance();
if (process.env.NODE_ENV !== "production") globalAny.codexWorker = codexWorker;
