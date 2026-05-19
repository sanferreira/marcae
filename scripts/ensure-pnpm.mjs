import { existsSync, rmSync } from "node:fs";

const userAgent = process.env.npm_config_user_agent ?? "";

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  if (existsSync(lockfile)) {
    rmSync(lockfile, { force: true });
  }
}

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead.");
  process.exit(1);
}
