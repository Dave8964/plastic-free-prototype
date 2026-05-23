const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");
const vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "0"], {
  cwd: root,
  stdio: ["inherit", "pipe", "pipe"],
});

let electron;
let didStartElectron = false;

function stopAll(code = 0) {
  if (electron && !electron.killed) electron.kill();
  if (!vite.killed) vite.kill();
  process.exit(code);
}

function startElectron(url) {
  if (didStartElectron) return;
  didStartElectron = true;

  electron = spawn("npx", ["electron", "electron/main.cjs"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_START_URL: url,
    },
  });

  electron.on("exit", (code) => {
    stopAll(code ?? 0);
  });
}

function handleViteOutput(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);
  const match = text.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
  if (match) {
    startElectron(`http://127.0.0.1:${match[1]}`);
  }
}

vite.stdout.on("data", handleViteOutput);
vite.stderr.on("data", (chunk) => process.stderr.write(chunk));
vite.on("exit", (code) => {
  if (!didStartElectron) {
    stopAll(code ?? 1);
  }
});

process.on("SIGINT", () => stopAll(0));
