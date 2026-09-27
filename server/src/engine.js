// Bridge to the C++ trie_engine process.
//
// Commands are written to stdin as they arrive; the engine answers each one
// with a single JSON line, in order, so a FIFO of pending promises is enough
// to match replies to requests. No locking, and bulk loads get pipelined.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const build = new URL("../../cpp/build/", import.meta.url);
const enginePath = [
  process.env.TRIE_ENGINE_PATH,
  fileURLToPath(new URL("trie_engine", build)),
  fileURLToPath(new URL("Release/trie_engine.exe", build)),
  fileURLToPath(new URL("trie_engine.exe", build)),
].find(p => p && existsSync(p));

let child = null;
let buffer = "";
const pending = [];
let onRestart = null;

function start() {
  if (!enginePath) throw new Error("trie_engine binary not found - run `npm run build:cpp`");

  child = spawn(enginePath, [], { stdio: ["pipe", "pipe", "inherit"] });
  child.stdin.on("error", () => {}); // surfaced through the exit handler
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", chunk => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      const request = pending.shift();
      if (!request) continue;
      try {
        const reply = JSON.parse(line);
        if (reply.error) request.reject(new Error(reply.error));
        else request.resolve(reply);
      } catch (error) {
        request.reject(error);
      }
    }
  });

  child.on("exit", code => {
    console.error(`trie_engine exited (code ${code})`);
    child = null;
    buffer = "";
    for (const request of pending.splice(0)) request.reject(new Error("trie engine stopped"));
    // The index lived in that process, so whoever owns the data rebuilds it.
    if (onRestart) setImmediate(onRestart);
  });
}

export function whenRestarted(callback) {
  onRestart = callback;
}

export function send(...parts) {
  if (!child) start();
  const line = parts.map(part => String(part).replace(/\s+/g, "")).join(" ");
  return new Promise((resolve, reject) => {
    pending.push({ resolve, reject });
    child.stdin.write(line + "\n");
  });
}
