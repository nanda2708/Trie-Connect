import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const serverRoot = process.cwd();
const repoRoot = path.resolve(serverRoot, "..");
const candidates = [
  process.env.TRIE_ENGINE_PATH,
  path.join(repoRoot, "cpp", "build", "trie_engine"),
  path.join(repoRoot, "cpp", "build", "Release", "trie_engine.exe"),
  path.join(repoRoot, "cpp", "build", "trie_engine.exe"),
  path.join(serverRoot, "cpp", "build", "trie_engine")
].filter(Boolean);

const enginePath = candidates.find(existsSync);
let engine;
let buffer = "";
const queue = [];
let busy = false;

function startEngine() {
  if (!enginePath) throw new Error("C++ Trie engine not found. Run npm run build:cpp first.");
  engine = spawn(enginePath, [], { stdio: ["pipe", "pipe", "pipe"] });
  engine.stdout.setEncoding("utf8");
  engine.stdout.on("data", chunk => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      const current = queue.shift();
      busy = false;
      if (current) {
        try { current.resolve(JSON.parse(line)); }
        catch (error) { current.reject(error); }
      }
      processNext();
    }
  });
  engine.stderr.on("data", chunk => console.error("[trie-engine]", chunk.toString().trim()));
  engine.on("exit", error => {
    const pending = queue.splice(0);
    for (const request of pending) request.reject(error || new Error("Trie engine stopped"));
    engine = null;
    buffer = "";
    busy = false;
  });
}

function processNext() {
  if (busy || queue.length === 0) return;
  if (!engine) startEngine();
  const request = queue[0];
  busy = true;
  engine.stdin.write(request.command + "\n");
}

export function command(name, ...args) {
  const safeCommand = [name, ...args].map(value => String(value).replace(/[\r\n]/g, " ")).join(" ");
  return new Promise((resolve, reject) => {
    queue.push({ command: safeCommand, resolve, reject });
    processNext();
  });
}
