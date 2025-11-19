const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  chooseTemplate: () => ipcRenderer.invoke("choose-template"),
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  consumeDrop: (path) => ipcRenderer.invoke("consume-drop", path),
  parseFolder: (folderPath, templatePath) => ipcRenderer.invoke("parse-folder", { folderPath, templatePath }),
  onParseProgress: (callback) => ipcRenderer.on("parse-progress", (_event, data) => callback(data)),
  listFolder: (folderPath) => ipcRenderer.invoke("list-folder", folderPath),

  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  chooseExportTemplate: () => ipcRenderer.invoke('choose-export-template'),
  exportDocx: (templatePath, saveDir, fileName, resultsPath) => ipcRenderer.invoke('export-docx', { templatePath, saveDir, fileName, resultsPath }),
  writeJSON: (data) => ipcRenderer.invoke('write-JSON', { data }),
});
