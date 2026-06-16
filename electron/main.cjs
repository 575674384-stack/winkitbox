const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, net, session, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
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
  writeSettings(normalized);
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

ipcMain.handle("system-info", async () => {
  return getSystemInfo();
});

ipcMain.handle("test-dns-servers", async (_event, servers) => {
  return testDnsServers(Array.isArray(servers) ? servers.map(String) : []);
});

ipcMain.handle("apply-network-config", async (_event, request) => {
  return applyNetworkConfig(request);
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

async function getSystemInfo() {
  const script = `
$ErrorActionPreference = 'Stop'
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$memory = Get-CimInstance Win32_ComputerSystem
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
  adapters = @($adapters)
} | ConvertTo-Json -Depth 8 -Compress
`;

  const result = await runPowerShellCapture(script);
  if (result.code !== 0) {
    throw new Error(result.stderr || "读取本机信息失败。");
  }

  return JSON.parse(result.stdout.trim() || "{}");
}

async function testDnsServers(servers) {
  const safeServers = servers
    .map((server) => String(server).trim())
    .filter((server) => /^[0-9a-fA-F:.]+$/.test(server))
    .slice(0, 20);
  const payload = Buffer.from(JSON.stringify(safeServers), "utf8").toString("base64");
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$servers = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json
$results = foreach ($server in @($servers)) {
  $elapsed = $null
  $ok = $false
  $errorText = ''
  try {
    $watch = [Diagnostics.Stopwatch]::StartNew()
    $job = Start-Job -ScriptBlock {
      param($dnsServer)
      Resolve-DnsName -Name 'www.microsoft.com' -Server $dnsServer -DnsOnly -Type A -ErrorAction Stop | Select-Object -First 1
    } -ArgumentList $server
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

async function generateToolWithAi(request) {
  const baseUrl = String(request?.baseUrl ?? "").trim();
  const apiKey = String(request?.apiKey ?? "").trim();
  const model = String(request?.model ?? "").trim();
  const githubUrl = String(request?.githubUrl ?? "").trim();

  if (!baseUrl || !apiKey || !model) {
    throw new Error("请先填写 AI 接口 URL、API Key 和模型名称。");
  }

  const repoRef = parseGitHubRepoUrl(githubUrl);
  if (!repoRef) {
    throw new Error("请填写有效的 GitHub 仓库主页链接。");
  }

  const context = await fetchGitHubToolContext(repoRef.owner, repoRef.repo);
  const response = await net.fetch(buildAiEndpoint(baseUrl, "chat/completions"), {
    method: "POST",
    headers: buildAiHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You generate WinKitBox Windows software catalog entries. Return JSON only. Never return markdown."
        },
        {
          role: "user",
          content: buildAiToolPrompt(context)
        }
      ],
      temperature: 0.2,
      max_tokens: 900
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI 生成工具失败：${response.status} ${text.slice(0, 160)}`);
  }

  const payload = await response.json();
  const content = String(payload?.choices?.[0]?.message?.content ?? "");
  const candidate = parseJsonFromAi(content);

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

function buildAiToolPrompt(context) {
  return `Analyze this GitHub repository and create one Windows installable WinKitBox tool entry.

Repository:
${JSON.stringify(context, null, 2)}

Return exactly one JSON object with this shape:
{
  "name": "display name",
  "category": "starter|system|files|capture|cleanup|desktop|network|rescue|ai|ime",
  "summary": "short Chinese summary, <= 30 chars",
  "description": "Chinese description, <= 90 chars",
  "license": "license id or Unknown",
  "tags": ["Chinese tag"],
  "risk": "low|medium|high",
  "install": {
    "type": "winget|installer|portable",
    "wingetId": "only when type is winget",
    "assetPattern": "regex matching a Windows release asset, only when type is installer or portable",
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
- Prefer a direct Windows installer asset (.exe or .msi) from latest release.
- Use portable only for .zip or .7z release assets when the executable name is obvious.
- Use winget only if you are confident about the winget package id.
- Do not invent unsupported install types.
- If no direct Windows install route exists, still choose the closest direct Windows route from the assets if possible.
- Return JSON only.`;
}

function parseJsonFromAi(content) {
  const trimmed = content.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? trimmed.match(/\{[\s\S]*\}/)?.[0];

  if (!jsonText) {
    throw new Error("AI 没有返回 JSON。");
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error("AI 返回的 JSON 无法解析。");
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
        themeId: normalized.themeId,
        themeBackgrounds: normalized.themeBackgrounds
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
    themeId: normalizeThemeId(String(settings?.themeId ?? "default")),
    themeBackgrounds: normalizeThemeBackgrounds(settings?.themeBackgrounds)
  };
}

function normalizeThemeId(value) {
  const allowed = new Set(["default", "bleach", "naruto", "jianlai", "doraemon"]);
  return allowed.has(value) ? value : "default";
}

function normalizeThemeBackgrounds(value) {
  const allowed = new Set(["default", "bleach", "naruto", "jianlai", "doraemon"]);
  const result = {};

  if (!value || typeof value !== "object") {
    return result;
  }

  for (const [key, rawUrl] of Object.entries(value)) {
    if (allowed.has(key) && typeof rawUrl === "string" && rawUrl.startsWith("file:///")) {
      result[key] = rawUrl;
    }
  }

  return result;
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
