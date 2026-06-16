const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const root = path.join(__dirname, "..");
const binDir = path.join(root, "node_modules", ".bin");
const viteBin = path.join(binDir, process.platform === "win32" ? "vite.cmd" : "vite");
const electronBin = path.join(binDir, process.platform === "win32" ? "electron.cmd" : "electron");
const devUrl = "http://127.0.0.1:5173";

function waitForServer(url, timeoutMs = 20000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const poll = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }

        setTimeout(poll, 250);
      });
    };

    poll();
  });
}

async function main() {
  const vite = spawn(viteBin, ["--host", "127.0.0.1"], {
    cwd: root,
    stdio: "inherit"
  });

  await waitForServer(devUrl);

  const electron = spawn(electronBin, ["."], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devUrl
    }
  });

  const shutdown = () => {
    electron.kill();
    vite.kill();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  electron.on("exit", () => {
    vite.kill();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
