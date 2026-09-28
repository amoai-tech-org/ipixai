import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DRIVER = fileURLToPath(
  new URL("./fixtures/ipi-1117-in-memory-runner-driver.mjs", import.meta.url),
);

type Reply = Record<string, unknown> & { id: string; ok: boolean };

class Driver {
  private seq = 0;
  private constructor(private readonly child: ChildProcess) {}

  static async start() {
    const child = fork(DRIVER, [], { stdio: ["ignore", "ignore", "inherit", "ipc"] });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("driver_ready_timeout")), 2_000);
      child.once("error", reject);
      child.on("message", (message) => {
        if ((message as Reply).id === "ready") {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    return new Driver(child);
  }

  async call(command: string, payload: Record<string, unknown> = {}) {
    const id = `m${++this.seq}`;
    return new Promise<Reply>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`driver_call_timeout:${command}`)), 2_000);
      const onMessage = (message: unknown) => {
        const reply = message as Reply;
        if (reply.id !== id) return;
        clearTimeout(timer);
        this.child.off("message", onMessage);
        if (!reply.ok) reject(new Error(String(reply.error ?? "driver_error")));
        else resolve(reply);
      };
      this.child.on("message", onMessage);
      this.child.send?.({ id, command, ...payload });
    });
  }

  async close() {
    if (this.child.exitCode !== null) return;
    try {
      await this.call("shutdown");
    } catch {
      this.child.kill("SIGKILL");
    }
  }
}

const THREAD = "org-a:user-a::ipi-1117-thread";

describe("IPI-1117 root-cause proof", () => {
  it("proves CopilotKit InMemoryAgentRunner active-run state is isolated per OS process", async () => {
    const owner = await Driver.start();
    const otherProcess = await Driver.start();
    try {
      expect(await owner.call("start", { threadId: THREAD, runId: "R1" })).toMatchObject({
        started: true,
      });
      expect(await owner.call("isRunning", { threadId: THREAD })).toMatchObject({ running: true });

      expect(await otherProcess.call("isRunning", { threadId: THREAD })).toMatchObject({
        running: false,
      });
      expect(await otherProcess.call("connect", { threadId: THREAD })).toMatchObject({ events: [] });
      expect(await otherProcess.call("stop", { threadId: THREAD, runId: "R1" })).toMatchObject({
        stopped: false,
      });
      expect(await owner.call("isRunning", { threadId: THREAD })).toMatchObject({ running: true });
      expect(await owner.call("stop", { threadId: THREAD, runId: "R1" })).toMatchObject({
        stopped: true,
      });
    } finally {
      await Promise.all([owner.close(), otherProcess.close()]);
    }
  });
});
