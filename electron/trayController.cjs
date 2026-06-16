const path = require("node:path");

function getTrayIconPath(rootDir) {
  return path.join(rootDir, "assets", "icon", "winkitbox-icon.ico");
}

function createTrayMenuTemplate({ restoreWindow, hideWindow, quitApp }) {
  return [
    {
      label: "打开 WinKitBox",
      click: restoreWindow
    },
    {
      label: "隐藏到托盘",
      click: hideWindow
    },
    {
      type: "separator"
    },
    {
      label: "退出",
      click: quitApp
    }
  ];
}

module.exports = {
  createTrayMenuTemplate,
  getTrayIconPath
};
