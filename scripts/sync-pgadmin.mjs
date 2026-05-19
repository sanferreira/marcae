import { spawnSync } from "node:child_process";

const container = "service-provider-pgadmin";
const sqlitePath = "/var/lib/pgadmin/pgadmin4.db";
const user = "admin@admin.com";
const command =
  "cd /pgadmin4 && /venv/bin/python setup.py load-servers /pgadmin4/servers.json --user admin@admin.com --auth-source internal --sqlite-path /var/lib/pgadmin/pgadmin4.db --replace";

function runDockerExec(args) {
  return spawnSync("docker", args, {
    stdio: "pipe",
    encoding: "utf8",
  });
}

for (let attempt = 1; attempt <= 20; attempt += 1) {
  const probe = runDockerExec([
    "exec",
    container,
    "sh",
    "-c",
    `test -f ${sqlitePath} && cd /pgadmin4 && /venv/bin/python setup.py get-users --sqlite-path ${sqlitePath}`,
  ]);

  if (probe.status === 0 && probe.stdout.includes(user)) {
    const sync = runDockerExec(["exec", container, "sh", "-c", command]);

    if (sync.status === 0) {
      process.stdout.write(sync.stdout);
      process.exit(0);
    }

    process.stderr.write(sync.stderr || sync.stdout);
    process.exit(sync.status ?? 1);
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
}

process.stderr.write(
  "Timed out waiting for pgAdmin to initialize its config database.\n",
);
process.exit(1);
