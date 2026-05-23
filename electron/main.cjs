const { app, BrowserWindow, ipcMain, Menu, nativeImage, protocol, shell } = require("electron");
const { execFile } = require("node:child_process");
const crypto = require("node:crypto");
const nodeFs = require("node:fs");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { promisify } = require("node:util");

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".tif", ".tiff", ".bmp", ".avif"]);
const browserImageExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".avif"]);
const videoExtensions = new Set([".mov", ".mp4", ".m4v", ".avi", ".mkv", ".webm", ".3gp", ".hevc"]);
const textureExtensions = new Set([".atx", ".ktx", ".ktx2"]);
const pdfExtensions = new Set([".pdf"]);
const audioExtensions = new Set([".m4a", ".mp3", ".aac", ".wav", ".caf", ".aiff", ".amr"]);
const documentExtensions = new Set([
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".rtf",
  ".csv",
  ".zip",
  ".pages",
  ".numbers",
  ".key",
  ".ai",
]);
const fileIndex = new Map();
const thumbnailCache = new Map();
const previewCache = new Map();
const fullPreviewCache = new Map();
const execFileAsync = promisify(execFile);
const maxQuickLookJobs = 2;
let activeQuickLookJobs = 0;
const quickLookQueue = [];

protocol.registerSchemesAsPrivileged([
  {
    scheme: "messages-media",
    privileges: {
      bypassCSP: true,
      secure: true,
      standard: true,
      supportFetchAPI: true,
    },
  },
]);

function defaultRoots() {
  const home = os.homedir();
  return [
    {
      label: "Messages Attachments",
      path: path.join(home, "Library", "Messages", "Attachments"),
    },
    {
      label: "Messages Caches",
      path: path.join(home, "Library", "Messages", "Caches"),
    },
    {
      label: "MobileSMS Temporary Media",
      path: path.join(
        home,
        "Library",
        "Containers",
        "com.apple.MobileSMS",
        "Data",
        "tmp",
        "TemporaryItems",
        "com.apple.MobileSMS",
        "Media",
      ),
    },
    {
      label: "Notification Images",
      path: path.join(
        home,
        "Library",
        "Group Containers",
        "group.com.apple.UserNotifications",
        "Library",
        "UserNotifications",
        "Remote",
        "default",
      ),
    },
    {
      label: "Notification Remote 344D9707",
      path: path.join(
        home,
        "Library",
        "Group Containers",
        "group.com.apple.UserNotifications",
        "Library",
        "UserNotifications",
        "Remote",
        "default",
        "344D9707-7BF9-427D-9D7D-25149BB997A0",
      ),
    },
  ];
}

function imageId(filePath) {
  return crypto.createHash("sha256").update(filePath).digest("base64url");
}

function mediaUrl(id) {
  return `messages-media://file/${id}`;
}

function thumbnailUrl(id) {
  return `messages-media://thumb/${id}`;
}

function previewUrl(id) {
  return `messages-media://preview/${id}`;
}

function fullPreviewUrl(id) {
  return `messages-media://full/${id}`;
}

function isVisualPreviewKind(kind) {
  return kind === "image" || kind === "video" || kind === "texture";
}

function shouldUseGeneratedPreview(kind, extension) {
  if (kind === "image") return !browserImageExtensions.has(extension);
  return kind === "video" || kind === "texture";
}

function imageContentType(extension) {
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".bmp") return "image/bmp";
  if (extension === ".avif") return "image/avif";
  return "application/octet-stream";
}

function fileContentType(extension) {
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".mp4" || extension === ".m4v") return "video/mp4";
  if (extension === ".webm") return "video/webm";
  if (extension === ".avi") return "video/x-msvideo";
  if (extension === ".mkv") return "video/x-matroska";
  if (extension === ".3gp") return "video/3gpp";
  if (imageExtensions.has(extension)) return imageContentType(extension);
  if (extension === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

async function fileResponse(filePath, request) {
  const extension = path.extname(filePath).toLowerCase();
  const stat = await fs.stat(filePath);
  const range = request.headers.get("range");
  const baseHeaders = {
    "accept-ranges": "bytes",
    "content-type": fileContentType(extension),
  };

  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!match) {
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, "content-range": `bytes */${stat.size}` },
      });
    }

    const requestedStart = match[1] ? Number.parseInt(match[1], 10) : 0;
    const requestedEnd = match[2] ? Number.parseInt(match[2], 10) : stat.size - 1;
    const start = Math.min(Math.max(requestedStart, 0), stat.size - 1);
    const end = Math.min(Math.max(requestedEnd, start), stat.size - 1);
    const stream = nodeFs.createReadStream(filePath, { start, end });

    return new Response(Readable.toWeb(stream), {
      status: 206,
      headers: {
        ...baseHeaders,
        "content-length": String(end - start + 1),
        "content-range": `bytes ${start}-${end}/${stat.size}`,
      },
    });
  }

  const stream = nodeFs.createReadStream(filePath);
  return new Response(Readable.toWeb(stream), {
    headers: {
      ...baseHeaders,
      "content-length": String(stat.size),
    },
  });
}

function classifyFile(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (imageExtensions.has(extension)) return { extension, kind: "image", kindLabel: "Image" };
  if (videoExtensions.has(extension)) return { extension, kind: "video", kindLabel: "Video" };
  if (textureExtensions.has(extension)) return { extension, kind: "texture", kindLabel: "Texture" };
  if (pdfExtensions.has(extension)) return { extension, kind: "pdf", kindLabel: "PDF" };
  if (audioExtensions.has(extension)) return { extension, kind: "audio", kindLabel: "Audio" };
  if (documentExtensions.has(extension)) return { extension, kind: "document", kindLabel: "Document" };
  return { extension: extension || "(none)", kind: "other", kindLabel: "Other" };
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (character) => {
    const entities = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });
}

function placeholderPreview(extension) {
  const label = escapeXml((extension || "FILE").replace(/^\./, "").toUpperCase());
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
      <rect width="640" height="640" rx="42" fill="#f5f5f7"/>
      <rect x="194" y="132" width="252" height="328" rx="22" fill="#ffffff" stroke="#d1d1d6" stroke-width="8"/>
      <path d="M384 132v86c0 16 13 29 29 29h33" fill="none" stroke="#d1d1d6" stroke-width="8"/>
      <text x="320" y="350" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="62" font-weight="760" fill="#3a3a3c">${label}</text>
      <text x="320" y="406" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="24" font-weight="600" fill="#86868b">No preview available</text>
    </svg>`,
  );
}

function drainQuickLookQueue() {
  if (activeQuickLookJobs >= maxQuickLookJobs || quickLookQueue.length === 0) return;

  const job = quickLookQueue.shift();
  activeQuickLookJobs += 1;
  Promise.resolve()
    .then(job.task)
    .then(job.resolve, job.reject)
    .finally(() => {
      activeQuickLookJobs -= 1;
      drainQuickLookQueue();
    });
}

function scheduleQuickLook(task) {
  return new Promise((resolve, reject) => {
    quickLookQueue.push({ task, resolve, reject });
    drainQuickLookQueue();
  });
}

async function quickLookThumbnail(filePath, size) {
  return scheduleQuickLook(async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "messages-cleaner-ql-"));
    try {
      await execFileAsync("/usr/bin/qlmanage", ["-t", "-s", String(size), "-o", tempDir, filePath], {
        timeout: 12000,
        windowsHide: true,
      });
      const entries = await fs.readdir(tempDir);
      const pngFile = entries.find((entry) => entry.toLowerCase().endsWith(".png"));
      if (!pngFile) return null;
      const buffer = await fs.readFile(path.join(tempDir, pngFile));
      return buffer.length > 0 ? buffer : null;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
}

async function browserImageThumbnail(filePath, extension, size) {
  return scheduleQuickLook(async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "messages-cleaner-sips-"));
    const outputPath = path.join(tempDir, "thumb.jpg");
    try {
      await execFileAsync(
        "/usr/bin/sips",
        ["--resampleHeightWidthMax", String(size), "--setProperty", "format", "jpeg", "--setProperty", "formatOptions", "78", filePath, "--out", outputPath],
        { timeout: 12000, windowsHide: true },
      );
      const buffer = await fs.readFile(outputPath);
      return buffer.length > 0 ? { buffer, contentType: "image/jpeg" } : null;
    } catch {
      const buffer = await fs.readFile(filePath);
      return { buffer, contentType: imageContentType(extension) };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
}

async function sipsImagePreview(filePath, size, quality = "86") {
  return scheduleQuickLook(async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "messages-cleaner-sips-preview-"));
    const outputPath = path.join(tempDir, "preview.jpg");
    try {
      await execFileAsync(
        "/usr/bin/sips",
        [
          "--resampleHeightWidthMax",
          String(size),
          "--setProperty",
          "format",
          "jpeg",
          "--setProperty",
          "formatOptions",
          quality,
          filePath,
          "--out",
          outputPath,
        ],
        { timeout: 15000, windowsHide: true },
      );
      const buffer = await fs.readFile(outputPath);
      return buffer.length > 0 ? { buffer, contentType: "image/jpeg" } : null;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
}

async function generatedPreview(filePath, extension, size) {
  if (imageExtensions.has(extension)) {
    try {
      const converted = await sipsImagePreview(filePath, size);
      if (converted) return converted;
    } catch {
      // Fall through to Electron/Quick Look for unusual image containers.
    }
  }

  const thumbnail = await nativeImage.createThumbnailFromPath(filePath, { width: size, height: size });
  if (!thumbnail.isEmpty()) {
    return { buffer: thumbnail.toPNG(), contentType: "image/png" };
  }

  try {
    const quickLook = await quickLookThumbnail(filePath, size);
    if (quickLook) {
      return { buffer: quickLook, contentType: "image/png" };
    }
  } catch {
    // Some Messages cache artifacts are partial media files. Keep the UI useful instead of surfacing a broken image.
  }

  return { buffer: placeholderPreview(extension), contentType: "image/svg+xml" };
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(root, rootLabel, items, errors, seenPaths) {
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    errors.push(`${rootLabel}: ${error.message}`);
    return;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);
      try {
        if (entry.isSymbolicLink()) return;
        if (entry.name.startsWith(".")) return;
        if (entry.isDirectory()) {
          await walkFiles(entryPath, rootLabel, items, errors, seenPaths);
          return;
        }
        if (!entry.isFile()) return;

        if (seenPaths.has(entryPath)) return;

        const stat = await fs.stat(entryPath);
        if (stat.size === 0) return;

        const classification = classifyFile(entry.name);
        const hasVisualPreview = isVisualPreviewKind(classification.kind);
        const needsGeneratedPreview = shouldUseGeneratedPreview(classification.kind, classification.extension);
        const id = imageId(entryPath);
        seenPaths.add(entryPath);
        fileIndex.set(id, entryPath);
        items.push({
          id,
          name: entry.name,
          path: entryPath,
          folder: path.dirname(entryPath),
          extension: classification.extension,
          kind: classification.kind,
          kindLabel: classification.kindLabel,
          sourceLabel: rootLabel,
          size: stat.size,
          modifiedAt: stat.mtimeMs,
          fileUrl: mediaUrl(id),
          previewUrl: needsGeneratedPreview ? previewUrl(id) : mediaUrl(id),
          fullPreviewUrl: needsGeneratedPreview ? fullPreviewUrl(id) : mediaUrl(id),
          thumbnailUrl: hasVisualPreview ? thumbnailUrl(id) : mediaUrl(id),
        });
      } catch (error) {
        errors.push(`${entryPath}: ${error.message}`);
      }
    }),
  );
}

async function scanFiles() {
  const roots = defaultRoots();
  const items = [];
  const errors = [];
  const seenPaths = new Set();
  fileIndex.clear();
  thumbnailCache.clear();
  previewCache.clear();
  fullPreviewCache.clear();

  for (const root of roots) {
    if (await pathExists(root.path)) {
      await walkFiles(root.path, root.label, items, errors, seenPaths);
    } else {
      errors.push(`${root.label}: folder does not exist at ${root.path}`);
    }
  }

  items.sort((a, b) => b.modifiedAt - a.modifiedAt);
  return { items, errors };
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "Messages Image Cleaner",
    backgroundColor: "#eef1ed",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  protocol.handle("messages-media", async (request) => {
    const parsed = new URL(request.url);
    const id = parsed.pathname.replace(/^\//, "");
    const filePath = fileIndex.get(id);
    if (!filePath) {
      return new Response("Unknown media item", { status: 404 });
    }
    if (parsed.hostname === "thumb" || parsed.hostname === "preview" || parsed.hostname === "full") {
      try {
        const cache =
          parsed.hostname === "thumb" ? thumbnailCache :
          parsed.hostname === "preview" ? previewCache :
          fullPreviewCache;
        const extension = path.extname(filePath).toLowerCase();
        const cached = cache.get(id);
        if (cached) {
          return new Response(cached.buffer, { headers: { "content-type": cached.contentType } });
        }

        const size =
          parsed.hostname === "thumb" ? 320 :
          parsed.hostname === "preview" ? 1000 :
          2400;
        const preview =
          parsed.hostname === "thumb" && browserImageExtensions.has(extension)
            ? await browserImageThumbnail(filePath, extension, size)
            : await generatedPreview(filePath, extension, size);
        cache.set(id, preview);
        return new Response(preview.buffer, { headers: { "content-type": preview.contentType } });
      } catch {
        const fallback = placeholderPreview(path.extname(filePath));
        return new Response(fallback, { headers: { "content-type": "image/svg+xml" } });
      }
    }

    return fileResponse(filePath, request);
  });

  ipcMain.handle("roots:get", () => defaultRoots());
  ipcMain.handle("settings:full-disk-access", () =>
    shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"),
  );
  ipcMain.handle("images:scan", () => scanFiles());
  ipcMain.handle("items:reveal", async (_event, id) => {
    const filePath = fileIndex.get(id);
    if (!filePath) throw new Error("Item is no longer available.");
    shell.showItemInFolder(filePath);
    return true;
  });
  ipcMain.handle("items:open", async (_event, id) => {
    const filePath = fileIndex.get(id);
    if (!filePath) throw new Error("Item is no longer available.");
    const error = await shell.openPath(filePath);
    if (error) throw new Error(error);
    return true;
  });
  ipcMain.handle("items:context-menu", (event, id) => {
    const filePath = fileIndex.get(id);
    if (!filePath) throw new Error("Item is no longer available.");

    const menu = Menu.buildFromTemplate([
      {
        label: "Show in Finder",
        click: () => shell.showItemInFolder(filePath),
      },
      {
        label: "Open File",
        click: async () => {
          await shell.openPath(filePath);
        },
      },
    ]);

    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
    return true;
  });
  ipcMain.handle("items:trash", async (_event, ids) => {
    const deletedIds = [];
    const errors = [];
    for (const id of ids) {
      const filePath = fileIndex.get(id);
      if (!filePath) {
        errors.push("An item was skipped because it is no longer available.");
        continue;
      }
      try {
        await shell.trashItem(filePath);
        fileIndex.delete(id);
        deletedIds.push(id);
      } catch (error) {
        errors.push(`${filePath}: ${error.message}`);
      }
    }
    return { deletedIds, errors };
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
