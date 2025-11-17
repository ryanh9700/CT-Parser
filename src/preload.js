const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  chooseTemplate: () => ipcRenderer.invoke("choose-template"),
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  consumeDrop: (path) => ipcRenderer.invoke("consume-drop", path),
  parseFolder: (folderPath, templatePath) => ipcRenderer.invoke("parse-folder", { folderPath, templatePath }),
  listFolder: (folderPath) => ipcRenderer.invoke("list-folder", folderPath),

  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  chooseExportTemplate: () => ipcRenderer.invoke('choose-export-template'),
  exportDocx: (templatePath, saveDir, fileName, values) => ipcRenderer.invoke('export-docx', { templatePath, saveDir, fileName, values }),
});