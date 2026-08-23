import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const candidates = [
  process.env.TRIE_ENGINE_PATH,
  path.join(root, "cpp", "build", "trie_engine"),
  path.join(root, "cpp", "build", "Release", "trie_engine.exe"),
  path.join(root, "cpp", "build", "trie_engine.exe")
].filter(Boolean);

const enginePath = candidates.find(existsSync);
let engine;
let buffer = "";
let pending;

function startEngine() {
  if (!enginePath) throw new Error("C++ Trie engine not found. Run npm run build:cpp first.");
  engine = spawn(enginePath, [], { stdio: ["pipe", "pipe", "pipe"] });
  engine.stdout.setEncoding("utf8");
  engine.stdout.on("data", chunk => {
    buffer += chunk;
    const newline = buffer.indexOf("\n");
    if (newline === -1 || !pending) return;
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    const current = pending;
    pending = null;
    try { current.resolve(JSON.parse(line)); } catch (error) { current.reject(error); }
  });
  engine.stderr.on("data", chunk => console.error("[trie-engine]", chunk.toString().trim()));
  engine.on("exit", () => { engine = null; pending = null; buffer = ""; });
}

export function command(name, ...args) {
  if (!engine) startEngine();
  const safeArgs = [name, ...args].map(value => String(value).replace(/[\r\n]/g, " "));
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    engine.stdin.write(safeArgs.join(" ") + "\n");
  });
}
