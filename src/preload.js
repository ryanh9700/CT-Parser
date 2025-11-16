const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  chooseTemplate: () => ipcRenderer.invoke("choose-template"),
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  consumeDrop: (path) => ipcRenderer.invoke("consume-drop", path),
  parseFolder: (folderPath, templatePath) => ipcRenderer.invoke("parse-folder", { folderPath, templatePath }),
  listFolder: (folderPath) => ipcRenderer.invoke("list-folder", folderPath),

  onProgressFile: (cb) => ipcRenderer.on("progress:file", (_e, name) => cb(name)),
  onProgressOut: (cb)  => ipcRenderer.on("progress:out",  (_e, line) => cb(line)),
  onProgressDone: (cb) => ipcRenderer.on("progress:done", (_e, code) => cb(code)),
  onProgressError: (cb) => ipcRenderer.on("progress:error", (_e, err) => cb(err)),
});