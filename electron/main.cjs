const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, net, session, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { createTrayMenuTemplate, getTrayIconPath } = require("./trayController.cjs");
const {
  buildDetectToolsScript,
  buildLaunchToolScript,
  normalizeLaunchDescriptor,
  normalizeLaunchDescriptors
} = require("./windowsTools.cjs");

let mainWindow;
let tray;
let isQuitting = false;

const appRoot = path.join(__dirname, "..");
const updateRepository = {
  owner: "575674384-stack",
  repo: "winkitbox"
};
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1040,
    minHeight: 700,
    title: "WinKitBox",
    icon: path.join(appRoot, "assets", "icon", "winkitbox-icon.png"),
    backgroundColor: "#f5f7f9",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(appRoot, "dist", "index.html"));
  }

  mainWindow.on("minimize", (event) => {
    event.preventDefault();
    hideMainWindowToTray();
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideMainWindowToTray();
    }
  });
}

if (gotSingleInstanceLock) {
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
    createAppTray();
  });

  app.on("second-instance", restoreMainWindow);

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      return;
    }

    restoreMainWindow();
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });
}

function createAppTray() {
  if (tray) {
    return;
  }

  tray = new Tray(getTrayIconPath(appRoot));
  tray.setToolTip("WinKitBox");
  tray.setContextMenu(
    Menu.buildFromTemplate(
      createTrayMenuTemplate({
        restoreWindow: restoreMainWindow,
        hideWindow: hideMainWindowToTray,
        quitApp
      })
    )
  );
  tray.on("double-click", restoreMainWindow);
}

function restoreMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function hideMainWindowToTray() {
  if (!tray) {
    createAppTray();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
}

function quitApp() {
  isQuitting = true;
  app.quit();
}

ipcMain.handle("open-url", async (_event, url) => {
  await shell.openExternal(url);
  return true;
});

ipcMain.handle("settings-get", async () => {
  return readSettings();
});

ipcMain.handle("settings-set", async (_event, settings) => {
  const normalized = normalizeSettings(settings);
  ensureDirectory(normalized.toolRootPath);
  fs.writeFileSync(getSettingsPath(), JSON.stringify({ toolRootPath: normalized.toolRootPath }, null, 2));
  return readSettings();
});

ipcMain.handle("select-tool-root", async (_event, currentPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择 WinKitBox 工具安装目录",
    defaultPath: String(currentPath || readSettings().toolRootPath),
    properties: ["openDirectory", "createDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return undefined;
  }

  return result.filePaths[0];
});

ipcMain.handle("check-updates", async () => {
  return checkForUpdates();
});

ipcMain.handle("github-fetch", async (_event, request) => {
  const targetUrl = new URL(String(request?.url ?? ""));
  const allowedHosts = new Set(["github.com", "api.github.com"]);

  if (!allowedHosts.has(targetUrl.hostname)) {
    throw new Error("Only github.com and api.github.com can be requested here.");
  }

  await applyProxySettings(request?.proxy);

  const headers = {
    "User-Agent": "WinKitBox/0.1",
    Accept: targetUrl.hostname === "api.github.com" ? "application/vnd.github+json" : "text/html"
  };

  const token = String(request?.token ?? "").trim();
  if (token && targetUrl.hostname === "api.github.com") {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await net.fetch(targetUrl.toString(), {
    method: "GET",
    headers
  });

  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    if (key.startsWith("x-ratelimit")) {
      responseHeaders[key] = value;
    }
  });

  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
    headers: responseHeaders
  };
});

ipcMain.handle("translate-text", async (_event, request) => {
  const targetUrl = new URL(String(request?.url ?? ""));

  if (targetUrl.hostname !== "translate.googleapis.com" || targetUrl.pathname !== "/translate_a/single") {
    throw new Error("Only translate.googleapis.com translation requests can be made here.");
  }

  await applyProxySettings(request?.proxy);

  const response = await net.fetch(targetUrl.toString(), {
    method: "GET",
    headers: {
      "User-Agent": "WinKitBox/0.1",
      Accept: "application/json"
    }
  });

  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
    headers: {}
  };
});

ipcMain.handle("run-powershell", async (event, script) => {
  return runPowerShellScript(event, script);
});

ipcMain.handle("detect-tools", async (_event, descriptors) => {
  const safeDescriptors = normalizeLaunchDescriptors(descriptors);
  const script = buildDetectToolsScript(safeDescriptors);

  const result = await runPowerShellCapture(script);
  if (result.code !== 0) {
    return safeDescriptors.map((descriptor) => ({
      toolId: descriptor.toolId,
      installed: false,
      launcherFound: false,
      launcherType: "",
      message: "检测失败。"
    }));
  }

  try {
    const parsed = JSON.parse(result.stdout.trim() || "[]");
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
});

ipcMain.handle("launch-tool", async (event, descriptor) => {
  const safeDescriptor = normalizeLaunchDescriptor(descriptor);
  const script = buildLaunchToolScript(safeDescriptor);

  return runPowerShellScript(event, script);
});

function runPowerShellScript(event, script) {
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script
    ]);

    child.stdout.on("data", (chunk) => {
      event.sender.send("run-output", chunk.toString());
    });

    child.stderr.on("data", (chunk) => {
      event.sender.send("run-output", chunk.toString());
    });

    child.on("close", (code) => {
      resolve({ code });
    });
  });
}

function runPowerShellCapture(script) {
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script
    ]);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function applyProxySettings(proxy) {
  const mode = String(proxy?.mode ?? "system");
  const manualProxy = String(proxy?.manualProxy ?? "").trim();

  if (mode === "direct") {
    await session.defaultSession.setProxy({ mode: "direct" });
    return;
  }

  if (mode === "manual" && manualProxy) {
    await session.defaultSession.setProxy({
      mode: "fixed_servers",
      proxyRules: manualProxy
    });
    return;
  }

  await session.defaultSession.setProxy({ mode: "system" });
}

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function getDefaultToolRootPath() {
  return path.join(process.env.LOCALAPPDATA || app.getPath("appData"), "WinKitBox");
}

function readSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getSettingsPath(), "utf8"));
    return normalizeSettings(parsed);
  } catch {
    return normalizeSettings({});
  }
}

function normalizeSettings(settings) {
  const defaultToolRootPath = getDefaultToolRootPath();
  const toolRootPath = String(settings?.toolRootPath ?? defaultToolRootPath).trim() || defaultToolRootPath;

  return {
    toolRootPath,
    defaultToolRootPath
  };
}

function ensureDirectory(targetPath) {
  const expandedPath = expandEnvironmentVariables(String(targetPath || ""));

  if (!expandedPath.trim()) {
    throw new Error("工具安装目录不能为空。");
  }

  fs.mkdirSync(expandedPath, { recursive: true });
}

function expandEnvironmentVariables(value) {
  return value.replace(/%([^%]+)%/g, (_match, name) => process.env[name] || `%${name}%`);
}

async function checkForUpdates() {
  const currentVersion = app.getVersion();
  const releaseUrl = `https://api.github.com/repos/${updateRepository.owner}/${updateRepository.repo}/releases/latest`;

  try {
    const response = await net.fetch(releaseUrl, {
      headers: {
        "User-Agent": `WinKitBox/${currentVersion}`,
        Accept: "application/vnd.github+json"
      }
    });

    if (!response.ok) {
      return {
        currentVersion,
        hasUpdate: false,
        assets: [],
        error: `GitHub 更新检查失败：${response.status}`
      };
    }

    const release = await response.json();
    const latestVersion = String(release?.tag_name ?? "").replace(/^v/i, "");
    const assets = Array.isArray(release?.assets)
      ? release.assets
          .filter((asset) => asset?.name && asset?.browser_download_url)
          .map((asset) => ({
            name: String(asset.name),
            browser_download_url: String(asset.browser_download_url)
          }))
      : [];

    return {
      currentVersion,
      latestVersion,
      releaseUrl: String(release?.html_url ?? ""),
      hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
      assets
    };
  } catch (error) {
    return {
      currentVersion,
      hasUpdate: false,
      assets: [],
      error: error instanceof Error ? error.message : "更新检查失败。"
    };
  }
}

function compareVersions(left, right) {
  const leftParts = normalizeVersion(left).split(".").map(toVersionNumber);
  const rightParts = normalizeVersion(right).split(".").map(toVersionNumber);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index++) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return 0;
}

function normalizeVersion(version) {
  return String(version || "").trim().replace(/^v/i, "");
}

function toVersionNumber(value) {
  const parsed = Number.parseInt(String(value).replace(/\D.*/, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
