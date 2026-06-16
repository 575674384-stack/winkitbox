const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("winKitBox", {
  openUrl: (url) => ipcRenderer.invoke("open-url", url),
  fetchGitHub: (request) => ipcRenderer.invoke("github-fetch", request),
  translateText: (request) => ipcRenderer.invoke("translate-text", request),
  getSettings: () => ipcRenderer.invoke("settings-get"),
  setSettings: (settings) => ipcRenderer.invoke("settings-set", settings),
  selectToolRoot: (currentPath) => ipcRenderer.invoke("select-tool-root", currentPath),
  checkUpdates: () => ipcRenderer.invoke("check-updates"),
  runPowerShell: (script) => ipcRenderer.invoke("run-powershell", script),
  detectTools: (descriptors) => ipcRenderer.invoke("detect-tools", descriptors),
  launchTool: (descriptor) => ipcRenderer.invoke("launch-tool", descriptor),
  onRunOutput: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on("run-output", listener);
    return () => ipcRenderer.removeListener("run-output", listener);
  }
});
