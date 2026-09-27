import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyPath = path.join(root, ".env.keys");
const errors = [];

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

const trackedKeys = git(["ls-files", "--", ".env.keys*"]);
if (trackedKeys) {
  errors.push(`private key file is tracked by Git: ${trackedKeys.split("\n").join(", ")}`);
}

try {
  execFileSync("git", ["check-ignore", "--no-index", "--quiet", ".env.keys"], { cwd: root, stdio: "ignore" });
} catch {
  errors.push(".env.keys is not covered by Git ignore rules");
}

if (existsSync(keyPath) && process.platform !== "win32") {
  const mode = statSync(keyPath).mode & 0o777;
  if (mode !== 0o600) {
    errors.push(`.env.keys permissions must be 0600, found 0${mode.toString(8)}`);
  }
}

if (errors.length) {
  console.error(`Local secret guard failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Local secret guard passed: .env.keys is ignored, untracked, and 0600 when present.");
