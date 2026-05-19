import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const args = process.argv.slice(2);

const child = spawn(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
