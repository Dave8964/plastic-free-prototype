const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");
const arch = process.arch === "arm64" ? "arm64" : "x64";
const result = spawnSync(
  "npx",
  [
    "electron-packager",
    ".",
    "Messages Image Cleaner",
    "--platform=darwin",
    `--arch=${arch}`,
    "--out=release",
    "--overwrite",
    "--prune=true",
    "--ignore=^/release($|/)",
    "--ignore=^/node_modules/.vite($|/)",
  ],
  {
    cwd: root,
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
