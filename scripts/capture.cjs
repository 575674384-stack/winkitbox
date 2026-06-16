const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

async function capture() {
  const outputDir = path.join(__dirname, "..", "artifacts");
  const outputPath = path.join(outputDir, "winkitbox-v0.1.png");

  fs.mkdirSync(outputDir, { recursive: true });

  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    show: false,
    backgroundColor: "#eef2f5",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  await new Promise((resolve) => setTimeout(resolve, 800));

  const image = await win.webContents.capturePage();
  fs.writeFileSync(outputPath, image.toPNG());
  console.log(outputPath);
  app.quit();
}

app.whenReady().then(capture);
