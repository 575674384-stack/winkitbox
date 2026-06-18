const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, net, session, shell } = require("electron");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
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
let activeProxyAgent = null;

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
    resizable: true,
    minimizable: true,
    maximizable: true,
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

  mainWindow.setMinimumSize(1040, 700);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(appRoot, "dist", "index.html"));
  }

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideMainWindowToTray();
    }
  });
}

if (gotSingleInstanceLock) {
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    createWindow();
    createAppTray();
    await applyStoredProxy().catch((error) => {
      console.error("Failed to apply proxy settings on startup:", error);
    });
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
  writeSettings(normalized);
  await applyStoredProxy();
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

ipcMain.handle("select-local-launcher", async (_event, currentPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择要添加到 WinKitBox 的程序",
    defaultPath: String(currentPath || app.getPath("desktop")),
    properties: ["openFile"],
    filters: [
      { name: "Windows 程序", extensions: ["exe", "lnk", "bat", "cmd", "ps1"] },
      { name: "所有文件", extensions: ["*"] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return undefined;
  }

  return result.filePaths[0];
});

ipcMain.handle("select-theme-background", async (_event, request) => {
  return selectThemeBackground(request);
});

ipcMain.handle("clear-theme-background", async (_event, request) => {
  return clearThemeBackground(request);
});

ipcMain.handle("check-updates", async () => {
  return checkForUpdates();
});

ipcMain.handle("download-update", async (event, request) => {
  return downloadUpdatePackage(request, event.sender);
});

ipcMain.handle("apply-update", async (_event, request) => {
  return applyUpdatePackage(request);
});

ipcMain.handle("system-info", async () => {
  return getSystemInfo();
});

ipcMain.handle("test-dns-servers", async (_event, servers, domain) => {
  return testDnsServers(
    Array.isArray(servers) ? servers.map(String) : [],
    String(domain ?? "")
  );
});

ipcMain.handle("apply-network-config", async (_event, request) => {
  return applyNetworkConfig(request);
});

ipcMain.handle("system-utf8-set", async (_event, request) => {
  return setSystemUtf8Beta(request);
});

ipcMain.handle("save-config-file", async (_event, request) => {
  return saveConfigFile(request);
});

ipcMain.handle("open-config-file", async () => {
  return openConfigFile();
});

ipcMain.handle("ai-list-models", async (_event, request) => {
  return listAiModels(request);
});

ipcMain.handle("ai-test-connection", async (_event, request) => {
  return testAiConnection(request);
});

ipcMain.handle("ai-generate-tool", async (_event, request) => {
  return generateToolWithAi(request);
});

ipcMain.handle("ai-recommend-repos", async (_event, request) => {
  return recommendGitHubReposWithAi(request);
});

ipcMain.handle("ai-fix-tool", async (_event, request) => {
  return fixToolWithAi(request);
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

function normalizeProxyUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

function parseWindowsProxyServer(server) {
  const trimmed = String(server ?? "").trim();
  if (!trimmed) return "";
  if (!trimmed.includes("=")) return normalizeProxyUrl(trimmed);

  const parts = trimmed.split(";");
  for (const part of parts) {
    const [scheme, address] = part.split("=", 2);
    if (scheme && address && scheme.trim().toLowerCase() === "https") {
      return normalizeProxyUrl(address.trim());
    }
  }
  for (const part of parts) {
    const [scheme, address] = part.split("=", 2);
    if (scheme && address && scheme.trim().toLowerCase() === "http") {
      return normalizeProxyUrl(address.trim());
    }
  }
  return "";
}

async function readWindowsSystemProxy() {
  try {
    const { stdout } = await runPowerShellCapture(`
      $reg = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
      $props = Get-ItemProperty -Path $reg -Name ProxyEnable, ProxyServer, ProxyOverride -ErrorAction SilentlyContinue
      [PSCustomObject]@{
        ProxyEnable = [bool]$props.ProxyEnable
        ProxyServer = $props.ProxyServer
        ProxyOverride = $props.ProxyOverride
      } | ConvertTo-Json -Compress
    `);
    const lines = stdout.trim().split("\n").map((line) => line.trim()).filter(Boolean);
    const data = JSON.parse(lines[lines.length - 1] || "{}");
    if (!data.ProxyEnable) return { enabled: false };
    return {
      enabled: true,
      server: parseWindowsProxyServer(data.ProxyServer),
      bypass: String(data.ProxyOverride || "").replace(/;/g, ",")
    };
  } catch {
    return { enabled: false };
  }
}

async function applyProxySettings(proxy) {
  let mode;
  let manualProxy;

  if (proxy && typeof proxy === "object") {
    mode = String(proxy.mode ?? "").trim();
    manualProxy = String(proxy.manualProxy ?? "").trim();
  }

  if (!mode) {
    const settings = readSettings();
    mode = settings.proxyMode;
    manualProxy = settings.proxyManual;
  }

  mode = normalizeProxyMode(mode);

  // Apply to Electron renderer network stack (net.fetch, web requests).
  if (mode === "direct") {
    await session.defaultSession.setProxy({ mode: "direct" });
  } else if (mode === "manual" && manualProxy) {
    await session.defaultSession.setProxy({
      mode: "fixed_servers",
      proxyRules: manualProxy
    });
  } else {
    await session.defaultSession.setProxy({ mode: "system" });
  }

  // Apply to Node.js http/https modules via environment variables.
  delete process.env.HTTP_PROXY;
  delete process.env.http_proxy;
  delete process.env.HTTPS_PROXY;
  delete process.env.https_proxy;
  delete process.env.NO_PROXY;
  delete process.env.no_proxy;
  activeProxyAgent = null;

  if (mode === "direct") {
    return;
  }

  let proxyUrl = "";
  let bypass = "";
  if (mode === "manual") {
    proxyUrl = normalizeProxyUrl(manualProxy);
  } else {
    const system = await readWindowsSystemProxy();
    if (system.enabled) {
      proxyUrl = system.server;
      bypass = system.bypass;
    }
  }

  if (proxyUrl) {
    process.env.HTTP_PROXY = proxyUrl;
    process.env.http_proxy = proxyUrl;
    process.env.HTTPS_PROXY = proxyUrl;
    process.env.https_proxy = proxyUrl;
    if (bypass) {
      process.env.NO_PROXY = bypass;
      process.env.no_proxy = bypass;
    }
    try {
      activeProxyAgent = new HttpsProxyAgent(proxyUrl);
    } catch (error) {
      activeProxyAgent = null;
      console.error("Failed to create HTTPS proxy agent:", error);
    }
  }
}

async function applyStoredProxy() {
  await applyProxySettings();
}

async function getSystemInfo() {
  const script = `
$ErrorActionPreference = 'Stop'
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$memory = Get-CimInstance Win32_ComputerSystem
$disks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" |
  ForEach-Object {
    [PSCustomObject]@{
      name = [string]$_.DeviceID
      volumeName = [string]$_.VolumeName
      fileSystem = [string]$_.FileSystem
      sizeGb = [math]::Round(([double]$_.Size / 1GB), 1)
      freeGb = [math]::Round(([double]$_.FreeSpace / 1GB), 1)
    }
  }
$physicalDisks = Get-CimInstance Win32_DiskDrive |
  ForEach-Object {
    [PSCustomObject]@{
      model = [string]$_.Model
      interfaceType = [string]$_.InterfaceType
      mediaType = [string]$_.MediaType
      sizeGb = [math]::Round(([double]$_.Size / 1GB), 1)
    }
  }
$gpus = Get-CimInstance Win32_VideoController |
  ForEach-Object {
    [PSCustomObject]@{
      name = [string]$_.Name
      adapterRamGb = if ($_.AdapterRAM) { [math]::Round(([double]$_.AdapterRAM / 1GB), 1) } else { $null }
      driverVersion = [string]$_.DriverVersion
    }
  }
$codePage = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage'
$adapters = Get-NetIPConfiguration |
  Where-Object { $_.NetAdapter.Status -ne 'Disabled' } |
  ForEach-Object {
    $dns = @(Get-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue).ServerAddresses
    [PSCustomObject]@{
      id = [string]$_.InterfaceIndex
      name = [string]$_.InterfaceAlias
      description = [string]$_.NetAdapter.InterfaceDescription
      status = [string]$_.NetAdapter.Status
      macAddress = [string]$_.NetAdapter.MacAddress
      dhcpEnabled = [bool]($_.NetIPv4Interface.Dhcp -eq 'Enabled')
      ipv4 = @($_.IPv4Address | ForEach-Object {
        [PSCustomObject]@{
          address = [string]$_.IPAddress
          prefixLength = [int]$_.PrefixLength
        }
      })
      gateway = [string]($_.IPv4DefaultGateway.NextHop | Select-Object -First 1)
      dnsServers = @($dns | ForEach-Object { [string]$_ })
    }
  }
[PSCustomObject]@{
  computerName = [string]$env:COMPUTERNAME
  os = [PSCustomObject]@{
    caption = [string]$os.Caption
    version = [string]$os.Version
    buildNumber = [string]$os.BuildNumber
  }
  cpu = [string]$cpu.Name
  memoryGb = [math]::Round(([double]$memory.TotalPhysicalMemory / 1GB), 1)
  disks = @($disks)
  physicalDisks = @($physicalDisks)
  gpus = @($gpus)
  utf8BetaEnabled = [bool]($codePage.ACP -eq '65001')
  adapters = @($adapters)
} | ConvertTo-Json -Depth 8 -Compress
`;

  const result = await runPowerShellCapture(script);
  if (result.code !== 0) {
    throw new Error(result.stderr || "读取本机信息失败。");
  }

  return JSON.parse(result.stdout.trim() || "{}");
}

function normalizeDnsDomain(domain) {
  const value = String(domain ?? "").trim().toLowerCase();
  if (/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(value)) {
    return value;
  }
  return "example.com";
}

async function testDnsServers(servers, domain) {
  const safeServers = servers
    .map((server) => String(server).trim())
    .filter((server) => /^[0-9a-fA-F:.]+$/.test(server))
    .slice(0, 20);
  const safeDomain = normalizeDnsDomain(domain);
  const payload = Buffer.from(JSON.stringify(safeServers), "utf8").toString("base64");
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$servers = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json
$domain = '${safeDomain}'
$results = foreach ($server in @($servers)) {
  $elapsed = $null
  $ok = $false
  $errorText = ''
  try {
    $watch = [Diagnostics.Stopwatch]::StartNew()
    $job = Start-Job -ScriptBlock {
      param($dnsServer, $dnsName)
      Resolve-DnsName -Name $dnsName -Server $dnsServer -DnsOnly -Type A -ErrorAction Stop | Select-Object -First 1
    } -ArgumentList $server, $domain
    if (Wait-Job $job -Timeout 3) {
      Receive-Job $job -ErrorAction Stop | Out-Null
      $watch.Stop()
      $elapsed = [int]$watch.ElapsedMilliseconds
      $ok = $true
    } else {
      Stop-Job $job -Force
      $errorText = '超时'
    }
    Remove-Job $job -Force -ErrorAction SilentlyContinue
  } catch {
    $errorText = $_.Exception.Message
  }
  [PSCustomObject]@{
    server = [string]$server
    latencyMs = $elapsed
    ok = [bool]$ok
    error = [string]$errorText
  }
}
@($results) | ConvertTo-Json -Depth 5 -Compress
`;

  const result = await runPowerShellCapture(script);
  if (result.code !== 0) {
    throw new Error(result.stderr || "DNS 延迟检测失败。");
  }

  const parsed = JSON.parse(result.stdout.trim() || "[]");
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function applyNetworkConfig(request) {
  const adapterId = String(request?.adapterId ?? "").trim();
  if (!/^\d+$/.test(adapterId)) {
    throw new Error("请选择有效的网卡。");
  }

  const dnsServers = Array.isArray(request?.dnsServers)
    ? request.dnsServers.map(String).map((server) => server.trim()).filter(Boolean)
    : [];
  const mode = String(request?.mode ?? "dns");
  const payload = Buffer.from(
    JSON.stringify({
      adapterId,
      mode,
      ipAddress: String(request?.ipAddress ?? "").trim(),
      prefixLength: Number(request?.prefixLength ?? 24),
      gateway: String(request?.gateway ?? "").trim(),
      dnsServers
    }),
    "utf8"
  ).toString("base64");
  const script = `
$ErrorActionPreference = 'Stop'
$data = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json
$interfaceIndex = [int]$data.adapterId
if ($data.mode -eq 'dhcp') {
  Set-NetIPInterface -InterfaceIndex $interfaceIndex -Dhcp Enabled
  Set-DnsClientServerAddress -InterfaceIndex $interfaceIndex -ResetServerAddresses
} else {
  if (-not [string]::IsNullOrWhiteSpace([string]$data.ipAddress)) {
    Set-NetIPInterface -InterfaceIndex $interfaceIndex -Dhcp Disabled
    Get-NetIPAddress -InterfaceIndex $interfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Remove-NetIPAddress -Confirm:$false -ErrorAction SilentlyContinue
    New-NetIPAddress -InterfaceIndex $interfaceIndex -IPAddress ([string]$data.ipAddress) -PrefixLength ([int]$data.prefixLength) -DefaultGateway ([string]$data.gateway) | Out-Null
  }
  $servers = @($data.dnsServers | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  if ($servers.Count -gt 0) {
    Set-DnsClientServerAddress -InterfaceIndex $interfaceIndex -ServerAddresses $servers
  }
}
`;
  const scriptPath = path.join(app.getPath("userData"), "apply-network-config.ps1");
  fs.writeFileSync(scriptPath, script, "utf8");

  return new Promise((resolve) => {
    const child = spawn("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Start-Process -FilePath powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath.replace(/"/g, '\\"')}"'`
    ]);

    child.on("close", (code) => {
      resolve({ code });
    });
  });
}

async function setSystemUtf8Beta(request) {
  const enabled = Boolean(request?.enabled);
  const settings = readSettings();
  const currentCodePages = await getCurrentCodePages();

  if (enabled && currentCodePages.acp !== "65001") {
    settings.previousCodePages = currentCodePages;
    writeSettings(settings);
  }

  const targetCodePages = enabled
    ? { acp: "65001", oemcp: "65001", maccp: "65001" }
    : settings.previousCodePages || { acp: "936", oemcp: "936", maccp: "10000" };
  const payload = Buffer.from(JSON.stringify(targetCodePages), "utf8").toString("base64");
  const script = `
$ErrorActionPreference = 'Stop'
$data = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json
$path = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage'
Set-ItemProperty -Path $path -Name ACP -Value ([string]$data.acp)
Set-ItemProperty -Path $path -Name OEMCP -Value ([string]$data.oemcp)
Set-ItemProperty -Path $path -Name MACCP -Value ([string]$data.maccp)
`;
  const scriptPath = path.join(app.getPath("userData"), "set-system-utf8.ps1");
  fs.writeFileSync(scriptPath, script, "utf8");

  return runElevatedPowerShellFile(scriptPath);
}

async function getCurrentCodePages() {
  const script = `
$ErrorActionPreference = 'Stop'
$codePage = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage'
[PSCustomObject]@{
  acp = [string]$codePage.ACP
  oemcp = [string]$codePage.OEMCP
  maccp = [string]$codePage.MACCP
} | ConvertTo-Json -Compress
`;
  const result = await runPowerShellCapture(script);
  if (result.code !== 0) {
    return { acp: "936", oemcp: "936", maccp: "10000" };
  }

  try {
    return normalizePreviousCodePages(JSON.parse(result.stdout.trim() || "{}")) || {
      acp: "936",
      oemcp: "936",
      maccp: "10000"
    };
  } catch {
    return { acp: "936", oemcp: "936", maccp: "10000" };
  }
}

function runElevatedPowerShellFile(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Start-Process -FilePath powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath.replace(/"/g, '\\"')}"'`
    ]);

    child.on("close", (code) => {
      resolve({ code });
    });
  });
}

async function saveConfigFile(request) {
  const defaultPath = path.join(app.getPath("documents"), "winkitbox-config.json");
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "导出 WinKitBox 配置",
    defaultPath,
    filters: [{ name: "WinKitBox 配置", extensions: ["json"] }]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  fs.writeFileSync(result.filePath, String(request?.content ?? ""), "utf8");
  return { canceled: false, filePath: result.filePath };
}

async function openConfigFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "导入 WinKitBox 配置",
    properties: ["openFile"],
    filters: [{ name: "WinKitBox 配置", extensions: ["json"] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const stat = fs.statSync(filePath);
  if (stat.size > 1024 * 1024) {
    throw new Error("配置文件超过 1MB，已拒绝导入。");
  }

  return {
    canceled: false,
    filePath,
    content: fs.readFileSync(filePath, "utf8")
  };
}

async function selectThemeBackground(request) {
  const themeId = normalizeThemeId(String(request?.themeId ?? "default"));
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择主题背景图",
    properties: ["openFile"],
    filters: [
      { name: "图片文件", extensions: ["png", "jpg", "jpeg", "webp"] },
      { name: "所有文件", extensions: ["*"] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const sourcePath = result.filePaths[0];
  const extension = path.extname(sourcePath).toLowerCase();
  const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
  if (!allowedExtensions.has(extension)) {
    throw new Error("请选择 png、jpg、jpeg 或 webp 图片。");
  }

  const targetDir = path.join(app.getPath("userData"), "theme-backgrounds");
  fs.mkdirSync(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, `${themeId}${extension}`);

  for (const name of fs.readdirSync(targetDir)) {
    if (name.toLowerCase().startsWith(`${themeId}.`)) {
      fs.rmSync(path.join(targetDir, name), { force: true });
    }
  }

  fs.copyFileSync(sourcePath, targetPath);
  const settings = readSettings();
  settings.themeBackgrounds[themeId] = pathToFileURL(targetPath).toString();
  writeSettings(settings);

  return {
    canceled: false,
    themeId,
    backgroundUrl: settings.themeBackgrounds[themeId]
  };
}

async function clearThemeBackground(request) {
  const themeId = normalizeThemeId(String(request?.themeId ?? "default"));
  const settings = readSettings();
  delete settings.themeBackgrounds[themeId];
  writeSettings(settings);

  const targetDir = path.join(app.getPath("userData"), "theme-backgrounds");
  if (fs.existsSync(targetDir)) {
    for (const name of fs.readdirSync(targetDir)) {
      if (name.toLowerCase().startsWith(`${themeId}.`)) {
        fs.rmSync(path.join(targetDir, name), { force: true });
      }
    }
  }

  return {
    themeId,
    backgroundUrl: ""
  };
}

async function listAiModels(request) {
  const baseUrl = String(request?.baseUrl ?? "").trim();
  const apiKey = String(request?.apiKey ?? "").trim();

  if (!baseUrl || !apiKey) {
    throw new Error("请先填写 AI 接口 URL 和 API Key。");
  }

  const response = await net.fetch(buildAiEndpoint(baseUrl, "models"), {
    method: "GET",
    headers: buildAiHeaders(apiKey)
  });

  if (!response.ok) {
    throw new Error(`模型列表获取失败：${response.status}`);
  }

  const payload = await response.json();
  const models = Array.isArray(payload?.data)
    ? payload.data.map((item) => String(item?.id ?? "")).filter(Boolean)
    : [];

  return { models };
}

async function testAiConnection(request) {
  const baseUrl = String(request?.baseUrl ?? "").trim();
  const apiKey = String(request?.apiKey ?? "").trim();
  const model = String(request?.model ?? "").trim();

  if (!baseUrl || !apiKey || !model) {
    throw new Error("请先填写 AI 接口 URL、API Key 和模型名称。");
  }

  const response = await net.fetch(buildAiEndpoint(baseUrl, "chat/completions"), {
    method: "POST",
    headers: buildAiHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: "Reply with OK."
        }
      ],
      temperature: 0,
      max_tokens: 8
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI 连通性测试失败：${response.status} ${text.slice(0, 160)}`);
  }

  return { ok: true };
}

async function fetchAiContent(baseUrl, apiKey, model, messages) {
  const endpoint = buildAiEndpoint(baseUrl, "chat/completions");
  const headers = buildAiHeaders(apiKey);

  const jsonModeResponse = await net.fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    })
  });

  if (!jsonModeResponse.ok) {
    const text = await jsonModeResponse.text();
    throw new Error(`AI 请求失败：${jsonModeResponse.status} ${text.slice(0, 160)}`);
  }

  const jsonModePayload = await jsonModeResponse.json();
  const jsonModeContent = extractAiMessageContent(jsonModePayload);
  if (jsonModeContent.trim()) {
    return jsonModeContent;
  }

  // Some models (e.g. DeepSeek-V4-Flash) return empty content when
  // response_format is set. Retry without it and rely on prompt/extraction.
  const plainResponse = await net.fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 2000
    })
  });

  if (!plainResponse.ok) {
    const text = await plainResponse.text();
    throw new Error(`AI 请求失败：${plainResponse.status} ${text.slice(0, 160)}`);
  }

  const plainPayload = await plainResponse.json();
  return extractAiMessageContent(plainPayload);
}

async function generateToolWithAi(request) {
  const baseUrl = String(request?.baseUrl ?? "").trim();
  const apiKey = String(request?.apiKey ?? "").trim();
  const model = String(request?.model ?? "").trim();
  const toolUrl = String(request?.toolUrl ?? request?.githubUrl ?? "").trim();
  const categoryId = String(request?.categoryId ?? "custom-add").trim() || "custom-add";

  if (!baseUrl || !apiKey || !model) {
    throw new Error("请先填写 AI 接口 URL、API Key 和模型名称。");
  }

  if (!/^https?:\/\//i.test(toolUrl)) {
    throw new Error("请填写有效的工具主页或下载页链接。");
  }

  const repoRef = parseGitHubRepoUrl(toolUrl);
  const context = repoRef
    ? await fetchGitHubToolContext(repoRef.owner, repoRef.repo)
    : await fetchGenericToolContext(toolUrl);
  const content = await fetchAiContent(
    baseUrl,
    apiKey,
    model,
    buildAiToolMessages(context, categoryId)
  );
  let candidate;
  try {
    candidate = parseJsonFromAi(content);
  } catch (error) {
    throw new Error(
      `${error.message}（原始响应：${content.replace(/\s+/g, " ").slice(0, 200)}）`
    );
  }

  return {
    candidate,
    context: {
      owner: context.owner,
      repo: context.repo,
      htmlUrl: context.htmlUrl,
      releaseApiUrl: context.releaseApiUrl,
      stars: context.stars,
      license: context.license
    }
  };
}

async function fixToolWithAi(request) {
  const baseUrl = String(request?.baseUrl ?? "").trim();
  const apiKey = String(request?.apiKey ?? "").trim();
  const model = String(request?.model ?? "").trim();
  const tool = request?.tool;
  const errorMessage = String(request?.errorMessage ?? "").trim();

  if (!baseUrl || !apiKey || !model) {
    throw new Error("请先填写 AI 接口 URL、API Key 和模型名称。");
  }

  if (!tool || typeof tool !== "object") {
    throw new Error("工具定义无效。");
  }

  const content = await fetchAiContent(
    baseUrl,
    apiKey,
    model,
    buildAiFixMessages(tool, errorMessage)
  );
  let candidate;
  try {
    candidate = parseJsonFromAi(content);
  } catch (error) {
    throw new Error(
      `${error.message}（原始响应：${content.replace(/\s+/g, " ").slice(0, 200)}）`
    );
  }

  return { candidate };
}

async function recommendGitHubReposWithAi(request) {
  const baseUrl = String(request?.baseUrl ?? "").trim();
  const apiKey = String(request?.apiKey ?? "").trim();
  const model = String(request?.model ?? "").trim();
  const prompt = String(request?.prompt ?? "").trim();

  if (!baseUrl || !apiKey || !model) {
    throw new Error("请先填写 AI 接口 URL、API Key 和模型名称。");
  }

  if (!prompt) {
    throw new Error("请先描述你想找的软件功能。");
  }

  const content = await fetchAiContent(
    baseUrl,
    apiKey,
    model,
    buildAiRepoRecommendationMessages(prompt)
  );

  try {
    return parseJsonFromAi(content);
  } catch (error) {
    throw new Error(
      `${error.message}（原始响应：${content.replace(/\s+/g, " ").slice(0, 200)}）`
    );
  }
}

function buildAiToolFixPrompt(tool, errorMessage) {
  return `Analyze this WinKitBox tool definition and its installation failure, then return a corrected install configuration.

Tool definition:
${JSON.stringify(tool, null, 2)}

Installation error message:
${errorMessage || "No specific error message provided."}

Return exactly one JSON object with this shape:
{
  "name": "keep or improve display name",
  "summary": "short Chinese summary, <= 30 chars",
  "description": "Chinese description, <= 90 chars",
  "license": "license id or Unknown",
  "tags": ["Chinese tag"],
  "risk": "low|medium|high",
  "install": {
    "type": "winget|installer|portable",
    "wingetId": "only when type is winget",
    "assetPattern": "regex matching a Windows release asset, only when type is installer or portable",
    "downloadUrl": "direct official Windows download URL, only when not using assetPattern",
    "archive": "zip|7z, only when portable",
    "executable": "relative exe path inside extracted archive, only when portable",
    "fileName": "installer file name, only when installer"
  },
  "launch": {
    "startMenuNames": ["possible Start Menu names"],
    "commands": ["possible executable command names"]
  }
}

Rules:
- Keep the same general purpose of the tool.
- Prefer a direct Windows installer asset (.exe or .msi) from the official source.
- Use portable only for .zip or .7z assets when the executable name is obvious.
- Use winget only if you are confident about the winget package id.
- Fix the install route based on the error message (e.g. wrong asset pattern, missing executable, outdated winget id).
- Do not invent unsupported install types.
- Do not return arbitrary PowerShell, shell scripts, browser-only instructions, or unsupported install types.
- Return JSON only. No markdown, no explanations, no trailing commas.`;
}

function buildAiRepoRecommendationPrompt(prompt) {
  return `Recommend GitHub open-source Windows software projects for this user need:
${prompt}

Return exactly one JSON object with this shape:
{
  "recommendations": [
    {
      "name": "project display name",
      "repoUrl": "https://github.com/owner/repo",
      "summary": "Chinese project summary, <= 70 chars",
      "reason": "Chinese reason this fits the user's need, <= 90 chars",
      "language": "primary language if known",
      "stars": 0,
      "license": "license id if known",
      "tags": ["short Chinese or English tag"]
    }
  ]
}

Rules:
- Recommend 4 to 8 projects.
- Projects must be GitHub repositories and must work on Windows or provide a Windows desktop/CLI utility.
- Prefer actively maintained, open-source, practical tools with a direct Windows release, installer, winget package, or portable build.
- Include several alternatives with different tradeoffs when possible.
- Do not recommend server-only, Android/iOS-only, macOS-only, browser-extension-only, or closed-source projects.
- Do not invent non-GitHub links. If unsure about a repo URL, omit that item.
- Return JSON only. No markdown, no explanations, no trailing commas.`;
}

function buildAiRepoRecommendationMessages(prompt) {
  return [
    {
      role: "system",
      content:
        "You recommend GitHub open-source Windows software for WinKitBox. CRITICAL: your entire response must be one valid JSON object, starting with { and ending with }. Do not write any introduction, explanation, reasoning, or conclusion. Do not wrap in markdown. Do not add trailing commas. Any non-JSON output will be rejected."
    },
    {
      role: "user",
      content:
        "I need software that can quickly search files and launch Windows apps."
    },
    {
      role: "assistant",
      content:
        '{"recommendations":[{"name":"Flow Launcher","repoUrl":"https://github.com/Flow-Launcher/Flow.Launcher","summary":"Windows 快速启动器和搜索工具","reason":"适合快速查找应用、文件和插件工作流。","language":"C#","stars":9000,"license":"MIT","tags":["launcher","windows","search"]},{"name":"EverythingToolbar","repoUrl":"https://github.com/srwi/EverythingToolbar","summary":"把 Everything 搜索集成到任务栏","reason":"适合高频文件搜索，Windows 桌面体验很轻。","language":"C#","stars":6000,"license":"MIT","tags":["search","taskbar","windows"]}]}'
    },
    {
      role: "user",
      content: buildAiRepoRecommendationPrompt(prompt)
    }
  ];
}

function buildAiFixMessages(tool, errorMessage) {
  return [
    {
      role: "system",
      content:
        "You fix WinKitBox Windows software install configurations. CRITICAL: your entire response must be one valid JSON object, starting with { and ending with }. Do not write any introduction, explanation, reasoning, or conclusion. Do not wrap in markdown. Do not add trailing commas. Any non-JSON output will be rejected."
    },
    {
      role: "user",
      content:
        'Fix this tool definition: {"name":"Example Editor","summary":"轻量文本编辑器","description":"一款简洁的 Windows 文本编辑器。","license":"MIT","tags":["文本编辑"],"risk":"low","install":{"type":"winget","wingetId":"Bad.Id"},"launch":{"startMenuNames":["Example Editor"],"commands":["example-editor"]}}. Error: winget id not found.'
    },
    {
      role: "assistant",
      content:
        '{"name":"Example Editor","summary":"轻量文本编辑器","description":"一款简洁的 Windows 文本编辑器。","license":"MIT","tags":["文本编辑"],"risk":"low","install":{"type":"winget","wingetId":"Example.ExampleEditor"},"launch":{"startMenuNames":["Example Editor"],"commands":["example-editor"]}}'
    },
    {
      role: "user",
      content: buildAiToolFixPrompt(tool, errorMessage)
    }
  ];
}

function buildAiEndpoint(baseUrl, route) {
  const normalized = String(baseUrl || "").trim().replace(/\/+$/g, "");

  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error("AI 接口 URL 必须以 http:// 或 https:// 开头。");
  }

  if (normalized.endsWith(`/${route}`)) {
    return normalized;
  }

  if (route === "models" && normalized.endsWith("/chat/completions")) {
    return normalized.replace(/\/chat\/completions$/i, "/models");
  }

  if (route === "chat/completions" && normalized.endsWith("/models")) {
    return normalized.replace(/\/models$/i, "/chat/completions");
  }

  if (normalized.endsWith("/v1")) {
    return `${normalized}/${route}`;
  }

  return `${normalized}/v1/${route}`;
}

function buildAiHeaders(apiKey) {
  return {
    "User-Agent": "WinKitBox/0.1",
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`
  };
}

function parseGitHubRepoUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com") {
      return undefined;
    }

    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) {
      return undefined;
    }

    return {
      owner,
      repo: repo.replace(/\.git$/i, "")
    };
  } catch {
    return undefined;
  }
}

async function fetchGitHubToolContext(owner, repo) {
  const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const releaseApiUrl = `${repoApiUrl}/releases/latest`;
  const headers = {
    "User-Agent": "WinKitBox/0.1",
    Accept: "application/vnd.github+json"
  };
  const repoResponse = await net.fetch(repoApiUrl, { headers });

  if (!repoResponse.ok) {
    throw new Error(`GitHub 仓库读取失败：${repoResponse.status}`);
  }

  const repoPayload = await repoResponse.json();
  let releasePayload = {};
  let releaseAssets = [];

  const releaseResponse = await net.fetch(releaseApiUrl, { headers });
  if (releaseResponse.ok) {
    releasePayload = await releaseResponse.json();
    releaseAssets = Array.isArray(releasePayload?.assets)
      ? releasePayload.assets.map((asset) => ({
          name: String(asset?.name ?? ""),
          size: Number(asset?.size ?? 0),
          downloadUrl: String(asset?.browser_download_url ?? "")
        }))
      : [];
  }

  return {
    owner,
    repo,
    htmlUrl: String(repoPayload?.html_url ?? `https://github.com/${owner}/${repo}`),
    description: String(repoPayload?.description ?? ""),
    language: String(repoPayload?.language ?? ""),
    topics: Array.isArray(repoPayload?.topics) ? repoPayload.topics.map(String) : [],
    stars: Number(repoPayload?.stargazers_count ?? 0),
    license: String(repoPayload?.license?.spdx_id ?? ""),
    releaseApiUrl,
    latestReleaseName: String(releasePayload?.name ?? releasePayload?.tag_name ?? ""),
    assets: releaseAssets
  };
}

async function fetchGenericToolContext(toolUrl) {
  const targetUrl = new URL(toolUrl);
  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    throw new Error("只支持 http 或 https 链接。");
  }

  let pageTitle = "";
  let pageDescription = "";
  let pageText = "";

  try {
    const response = await net.fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "WinKitBox/0.1",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8"
      }
    });

    if (response.ok) {
      const html = (await response.text()).slice(0, 60000);
      pageTitle = extractHtmlTitle(html);
      pageDescription = extractHtmlDescription(html);
      pageText = stripHtmlText(html).slice(0, 6000);
    }
  } catch {
    pageText = "";
  }

  return {
    htmlUrl: targetUrl.toString(),
    description: pageDescription,
    language: "",
    topics: [],
    stars: undefined,
    license: "",
    releaseApiUrl: "",
    pageTitle,
    pageDescription,
    pageText,
    assets: []
  };
}

function extractHtmlTitle(html) {
  return decodeHtmlEntities(String(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function extractHtmlDescription(html) {
  return decodeHtmlEntities(
    String(
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)?.[1] ??
        html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i)?.[1] ??
        ""
    )
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function stripHtmlText(html) {
  return decodeHtmlEntities(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function buildAiToolPrompt(context, preferredCategory) {
  const sourceLabel = context.owner && context.repo ? "GitHub repository" : "software website/download page";

  return `Analyze this ${sourceLabel} and create one Windows installable WinKitBox tool entry.

Preferred category id: ${preferredCategory || "custom-add"}

Source context:
${JSON.stringify(context, null, 2)}

Return exactly one JSON object with this shape:
{
  "name": "display name",
  "category": "${preferredCategory || "custom-add"}",
  "summary": "short Chinese summary, <= 30 chars",
  "description": "Chinese description, <= 90 chars",
  "license": "license id or Unknown",
  "tags": ["Chinese tag"],
  "risk": "low|medium|high",
  "install": {
    "type": "winget|installer|portable",
    "wingetId": "only when type is winget",
    "assetPattern": "regex matching a Windows release asset, only when type is installer or portable",
    "downloadUrl": "direct official Windows download URL, only when not using assetPattern",
    "archive": "zip|7z, only when portable",
    "executable": "relative exe path inside extracted archive, only when portable",
    "fileName": "installer file name, only when installer"
  },
  "launch": {
    "startMenuNames": ["possible Start Menu names"],
    "commands": ["possible executable command names"]
  }
}

Rules:
- Use the preferred category id unless the source clearly fits a better built-in category.
- Prefer a direct Windows installer asset (.exe or .msi) from latest release or official download page.
- Use portable only for .zip or .7z assets when the executable name is obvious.
- Use winget only if you are confident about the winget package id.
- Do not invent unsupported install types.
- Do not return arbitrary PowerShell, shell scripts, browser-only instructions, or unsupported install types.
- If no direct Windows install route exists, choose the closest direct Windows route from the assets/page if possible.
- Return JSON only. No markdown, no explanations, no trailing commas.`;
}

function buildAiToolMessages(context, categoryId) {
  return [
    {
      role: "system",
      content:
        "You generate WinKitBox Windows software catalog entries. CRITICAL: your entire response must be one valid JSON object, starting with { and ending with }. Do not write any introduction, explanation, reasoning, or conclusion. Do not wrap in markdown. Do not add trailing commas. Any non-JSON output will be rejected."
    },
    {
      role: "user",
      content:
        'Create a WinKitBox entry for a text editor hosted at https://example.com/editor. Preferred category: "files".'
    },
    {
      role: "assistant",
      content:
        '{"name":"Example Editor","category":"files","summary":"轻量文本编辑器","description":"一款简洁的 Windows 文本编辑器。","license":"MIT","tags":["文本编辑"],"risk":"low","install":{"type":"winget","wingetId":"Example.ExampleEditor"},"launch":{"startMenuNames":["Example Editor"],"commands":["example-editor"]}}'
    },
    {
      role: "user",
      content: buildAiToolPrompt(context, categoryId)
    }
  ];
}

function extractAiMessageContent(payload) {
  const message = payload?.choices?.[0]?.message;
  if (!message) {
    return "";
  }

  if (message.content) {
    return String(message.content);
  }

  if (message.reasoning_content) {
    return String(message.reasoning_content);
  }

  return "";
}

function stripAiReasoning(content) {
  return String(content)
    .replace(/<think[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking[\s\S]*?<\/thinking>/gi, "")
    .replace(/<reason[\s\S]*?<\/reason>/gi, "")
    .replace(/\u0000/g, "")
    .trim();
}

function extractFirstJsonObject(text) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{") {
      if (depth === 0) {
        start = i;
      }
      depth++;
    } else if (char === "}") {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start !== -1) {
          return text.slice(start, i + 1);
        }
      }
    }
  }

  return undefined;
}

function parseJsonFromAi(content) {
  let cleaned = stripAiReasoning(content);

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue to heuristic extraction.
  }

  const jsonText = extractFirstJsonObject(cleaned);
  if (!jsonText) {
    throw new Error("AI 没有返回 JSON。");
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    try {
      // Try removing trailing commas, a common model mistake.
      return JSON.parse(jsonText.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      throw new Error("AI 返回的 JSON 无法解析。");
    }
  }
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

function writeSettings(settings) {
  const normalized = normalizeSettings(settings);
  fs.writeFileSync(
    getSettingsPath(),
    JSON.stringify(
      {
        toolRootPath: normalized.toolRootPath,
        updateOnStartup: normalized.updateOnStartup,
        aiBaseUrl: normalized.aiBaseUrl,
        aiApiKey: normalized.aiApiKey,
        aiModel: normalized.aiModel,
        proxyMode: normalized.proxyMode,
        proxyManual: normalized.proxyManual,
        themeId: normalized.themeId,
        themeBackgrounds: normalized.themeBackgrounds,
        glassOpacity: normalized.glassOpacity,
        glassBlur: normalized.glassBlur,
        customTools: normalized.customTools,
        customCategories: normalized.customCategories,
        toolCategoryOverrides: normalized.toolCategoryOverrides,
        previousCodePages: normalized.previousCodePages
      },
      null,
      2
    )
  );
}

function normalizeSettings(settings) {
  const defaultToolRootPath = getDefaultToolRootPath();
  const toolRootPath = String(settings?.toolRootPath ?? defaultToolRootPath).trim() || defaultToolRootPath;

  return {
    toolRootPath,
    defaultToolRootPath,
    updateOnStartup: settings?.updateOnStartup !== false,
    aiBaseUrl: String(settings?.aiBaseUrl ?? "").trim(),
    aiApiKey: String(settings?.aiApiKey ?? "").trim(),
    aiModel: String(settings?.aiModel ?? "").trim(),
    proxyMode: normalizeProxyMode(String(settings?.proxyMode ?? "")),
    proxyManual: String(settings?.proxyManual ?? "").trim(),
    themeId: normalizeThemeId(String(settings?.themeId ?? defaultThemeId)),
    themeBackgrounds: normalizeThemeBackgrounds(settings?.themeBackgrounds),
    glassOpacity: normalizeGlassOpacity(settings?.glassOpacity),
    glassBlur: normalizeGlassBlur(settings?.glassBlur),
    customTools: normalizeCustomTools(settings?.customTools),
    customCategories: normalizeCustomCategories(settings?.customCategories),
    toolCategoryOverrides: normalizeToolCategoryOverrides(settings?.toolCategoryOverrides),
    previousCodePages: normalizePreviousCodePages(settings?.previousCodePages)
  };
}

const defaultCustomCategories = [
  { id: "custom-add", name: "自定义添加", builtin: true, protected: true },
  { id: "starter", name: "一键装机", builtin: true },
  { id: "ai", name: "AI 应用", builtin: true },
  { id: "ime", name: "输入法", builtin: true },
  { id: "system", name: "系统增强", builtin: true },
  { id: "files", name: "文件体验", builtin: true },
  { id: "capture", name: "截图剪贴", builtin: true },
  { id: "cleanup", name: "卸载清理", builtin: true },
  { id: "desktop", name: "桌面整理", builtin: true },
  { id: "network", name: "网络同步", builtin: true },
  { id: "rescue", name: "维护急救", builtin: true }
];

function normalizeCustomCategories(value) {
  const defaults = defaultCustomCategories.map((category) => ({ ...category }));
  const defaultById = new Map(defaults.map((category) => [category.id, category]));
  const nextById = new Map(defaults.map((category) => [category.id, category]));

  if (!Array.isArray(value)) {
    return Array.from(nextById.values());
  }

  for (const rawCategory of value) {
    if (!rawCategory || typeof rawCategory !== "object") {
      continue;
    }

    const id = sanitizeCategoryId(String(rawCategory.id ?? ""));
    const name = String(rawCategory.name ?? "").trim();
    if (!id || id === "all" || id === "uncategorized" || !name) {
      continue;
    }

    const defaultCategory = defaultById.get(id);
    if (defaultCategory?.protected) {
      nextById.set(id, defaultCategory);
      continue;
    }

    nextById.set(id, {
      id,
      name: name.slice(0, 20),
      builtin: Boolean(defaultCategory?.builtin),
      protected: Boolean(defaultCategory?.protected) || undefined,
      hidden: Boolean(rawCategory.hidden) || undefined
    });
  }

  return Array.from(nextById.values());
}

function normalizeToolCategoryOverrides(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === "string" && val.trim()) {
      result[key] = val.trim();
    }
  }
  return result;
}

function sanitizeCategoryId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeCustomTools(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((tool) =>
      tool &&
      typeof tool === "object" &&
      typeof tool.id === "string" &&
      typeof tool.name === "string" &&
      typeof tool.category === "string"
    )
    .slice(0, 200);
}

function normalizePreviousCodePages(value) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const acp = String(value.acp ?? "").trim();
  const oemcp = String(value.oemcp ?? "").trim();
  const maccp = String(value.maccp ?? "").trim();
  if (!acp && !oemcp && !maccp) {
    return undefined;
  }

  return { acp, oemcp, maccp };
}

const allowedThemeIds = new Set(["azure", "mint", "amber"]);
const defaultThemeId = "azure";

function normalizeThemeId(value) {
  return allowedThemeIds.has(value) ? value : defaultThemeId;
}

function normalizeThemeBackgrounds(value) {
  const result = {};

  if (!value || typeof value !== "object") {
    return result;
  }

  for (const [key, rawUrl] of Object.entries(value)) {
    if (
      allowedThemeIds.has(key) &&
      typeof rawUrl === "string" &&
      rawUrl.startsWith("file:///")
    ) {
      result[key] = rawUrl;
    }
  }

  return result;
}

function normalizeGlassOpacity(value) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return 0.72;
  }
  return Math.max(0.3, Math.min(0.95, num));
}

function normalizeGlassBlur(value) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return 28;
  }
  return Math.max(8, Math.min(48, Math.round(num)));
}

const allowedProxyModes = new Set(["system", "direct", "manual"]);

function normalizeProxyMode(value) {
  const trimmed = String(value ?? "").trim();
  return allowedProxyModes.has(trimmed) ? trimmed : "system";
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
    await applyStoredProxy();
    const release = await fetchGitHubJson(releaseUrl, currentVersion);

    if (!release || typeof release !== "object") {
      return {
        currentVersion,
        hasUpdate: false,
        assets: [],
        error: "GitHub 更新检查失败：返回数据无效。"
      };
    }

    const latestVersion = String(release.tag_name ?? "").replace(/^v/i, "");
    const assets = Array.isArray(release.assets)
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
      releaseUrl: String(release.html_url ?? ""),
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

function fetchGitHubJson(url, currentVersion) {
  return new Promise((resolve, reject) => {
    requestWithRedirects(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": `WinKitBox/${currentVersion}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        timeout: 30000
      },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        if (!response.statusCode || response.statusCode >= 400) {
          reject(new Error(`GitHub 更新检查失败：${response.statusCode}`));
          return;
        }

        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("GitHub 返回数据解析失败。"));
          }
        });
        response.on("error", (responseError) => reject(responseError));
      }
    );
  });
}

const MAX_DOWNLOAD_REDIRECTS = 5;
const DOWNLOAD_PROGRESS_THROTTLE_MS = 200;

function requestWithRedirects(url, options, callback) {
  let redirectCount = 0;

  function makeRequest(currentUrl, currentOptions) {
    const parsed = new URL(currentUrl);
    const client = parsed.protocol === "https:" ? https : http;
    const requestOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: currentOptions.method || "GET",
      headers: currentOptions.headers || {},
      timeout: currentOptions.timeout || 60000
    };

    if (client === https && activeProxyAgent) {
      requestOptions.agent = activeProxyAgent;
    }

    const request = client.request(requestOptions, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Consume (and discard) the redirect body so the underlying socket can
        // be released cleanly before we open the next request.
        response.resume();
        redirectCount++;
        if (redirectCount > MAX_DOWNLOAD_REDIRECTS) {
          callback(new Error("下载重定向次数过多。"));
          return;
        }
        const nextUrl = new URL(response.headers.location, currentUrl).toString();
        makeRequest(nextUrl, currentOptions);
        return;
      }
      callback(null, response);
    });

    request.on("error", (error) => callback(error));
    request.on("timeout", () => {
      request.destroy();
      callback(new Error("下载请求超时。"));
    });
    request.end();
  }

  makeRequest(url, options);
}

async function downloadSingleStream(url, filePath, sender) {
  const maxAttempts = 3;
  let total = 0;
  let lastProgressTime = 0;

  function sendProgress(downloaded, force = false) {
    const now = Date.now();
    if (!force && now - lastProgressTime < DOWNLOAD_PROGRESS_THROTTLE_MS) return;
    lastProgressTime = now;
    if (sender && !sender.isDestroyed() && total > 0) {
      sender.send("download-update-progress", {
        downloaded,
        total,
        percent: Math.round((downloaded / total) * 100)
      });
    }
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let startByte = 0;
    try {
      startByte = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    } catch {
      startByte = 0;
    }

    try {
      const result = await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filePath, { flags: startByte > 0 ? "a" : "w" });
        let downloaded = startByte;

        const headers = {
          "User-Agent": `WinKitBox/${app.getVersion()}`,
          Accept: "application/octet-stream"
        };
        if (startByte > 0) {
          headers.Range = `bytes=${startByte}-`;
        }

        requestWithRedirects(
          url,
          { method: "GET", headers, timeout: 60000 },
          (error, response) => {
            if (error) {
              fileStream.destroy();
              reject(error);
              return;
            }

            if (!response.statusCode || (response.statusCode >= 400 && response.statusCode !== 416)) {
              fileStream.destroy();
              reject(new Error(`下载更新包失败：${response.statusCode}`));
              return;
            }

            // Server doesn't support resume (or range is already satisfied); restart from scratch.
            if (startByte > 0 && response.statusCode !== 206) {
              fileStream.destroy();
              try {
                fs.rmSync(filePath, { force: true });
              } catch {
                // ignore
              }
              reject(new Error("服务器不支持断点续传，将重新下载。"));
              return;
            }

            if (startByte === 0) {
              total = Number(response.headers["content-length"]) || 0;
            } else if (response.statusCode === 206) {
              const contentRange = String(response.headers["content-range"] || "");
              const match = contentRange.match(/bytes\s+(\d+)-(\d+)\/(\d+)/);
              if (match) {
                total = Number(match[3]) || 0;
              } else {
                total = startByte + (Number(response.headers["content-length"]) || 0);
              }
            }

            response.on("data", (chunk) => {
              downloaded += chunk.length;
              sendProgress(downloaded);
            });

            response.pipe(fileStream);

            fileStream.on("finish", () => {
              fileStream.close(() => resolve({ filePath }));
            });
            fileStream.on("error", reject);
            response.on("error", reject);
          }
        );
      });
      return result;
    } catch (error) {
      // Do not retry if the server explicitly rejected the request.
      const isFatal = String(error.message).includes("下载更新包失败：") && !String(error.message).includes("断点续传");
      if (isFatal || attempt >= maxAttempts) throw error;
      sendProgress(startByte, true);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error("下载更新包失败：已达到最大重试次数。");
}

async function downloadUpdatePackage(request, sender) {
  const downloadUrl = String(request?.downloadUrl ?? "").trim();
  const fileName = String(request?.fileName ?? "").trim() || "WinKitBox-Setup.exe";

  if (!downloadUrl) {
    throw new Error("更新下载链接不能为空。");
  }

  await applyStoredProxy();

  const tempDir = path.join(os.tmpdir(), "WinKitBox");
  fs.mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, fileName);

  try {
    // Multipart download is disabled by default: GitHub release assets redirect
    // to a CDN that frequently resets parallel Range connections (ECONNRESET).
    // A single stream with retry + resume is more reliable.
    return await downloadSingleStream(downloadUrl, filePath, sender);
  } catch (error) {
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      // Ignore cleanup errors.
    }
    throw error;
  }
}

function applyUpdatePackage(request) {
  const installerPath = String(request?.installerPath ?? "").trim();

  if (!installerPath || !fs.existsSync(installerPath)) {
    throw new Error("更新安装包不存在。");
  }

  const child = spawn(installerPath, ["/S"], { detached: true, shell: false });

  child.on("error", (error) => {
    dialog.showErrorBox("更新失败", error.message);
  });

  setTimeout(() => {
    isQuitting = true;
    app.quit();
  }, 800);

  return { ok: true };
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
