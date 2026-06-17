const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("winKitBox", {
  openUrl: (url) => ipcRenderer.invoke("open-url", url),
  fetchGitHub: (request) => ipcRenderer.invoke("github-fetch", request),
  translateText: (request) => ipcRenderer.invoke("translate-text", request),
  getSettings: () => ipcRenderer.invoke("settings-get"),
  setSettings: (settings) => ipcRenderer.invoke("settings-set", settings),
  selectToolRoot: (currentPath) => ipcRenderer.invoke("select-tool-root", currentPath),
  selectLocalLauncher: (currentPath) => ipcRenderer.invoke("select-local-launcher", currentPath),
  selectThemeBackground: (request) => ipcRenderer.invoke("select-theme-background", request),
  clearThemeBackground: (request) => ipcRenderer.invoke("clear-theme-background", request),
  checkUpdates: () => ipcRenderer.invoke("check-updates"),
  downloadUpdate: (request) => ipcRenderer.invoke("download-update", request),
  applyUpdate: (request) => ipcRenderer.invoke("apply-update", request),
  getSystemInfo: () => ipcRenderer.invoke("system-info"),
  testDnsServers: (servers) => ipcRenderer.invoke("test-dns-servers", servers),
  applyNetworkConfig: (request) => ipcRenderer.invoke("apply-network-config", request),
  setSystemUtf8Beta: (request) => ipcRenderer.invoke("system-utf8-set", request),
  saveConfigFile: (request) => ipcRenderer.invoke("save-config-file", request),
  openConfigFile: () => ipcRenderer.invoke("open-config-file"),
  listAiModels: (request) => ipcRenderer.invoke("ai-list-models", request),
  testAiConnection: (request) => ipcRenderer.invoke("ai-test-connection", request),
  generateAiTool: (request) => ipcRenderer.invoke("ai-generate-tool", request),
  fixAiTool: (request) => ipcRenderer.invoke("ai-fix-tool", request),
  runPowerShell: (script) => ipcRenderer.invoke("run-powershell", script),
  detectTools: (descriptors) => ipcRenderer.invoke("detect-tools", descriptors),
  launchTool: (descriptor) => ipcRenderer.invoke("launch-tool", descriptor),
  onRunOutput: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on("run-output", listener);
    return () => ipcRenderer.removeListener("run-output", listener);
  }
});
