import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';

const { spawn } = require("child_process");
const path = require("node:path");
const fs = require("fs");

function resolveExecutable(scriptName) {
  const exeName = `${path.parse(scriptName).name}.exe`;

  const searchPaths = app.isPackaged
    ? [
        path.join(process.resourcesPath, "dist", exeName),
        path.join(app.getAppPath?.() ?? "", exeName),
      ].filter(Boolean)
    : [
        path.resolve(__dirname, "..", "..", "dist", exeName),
      ];

  for (const candidate of searchPaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getPythonCommand(scriptName, args = []) {
  const exePath = resolveExecutable(scriptName);
  if (!exePath) {
    throw new Error(`Unable to locate executable for ${scriptName}`);
  }

  return { command: exePath, args };
}

function spawnPythonProcess(command, args) {
  const env = {
    ...process.env,
    PYTHONUNBUFFERED: "1",
  };

  return spawn(command, args, { env });
}

let win;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
  try {
    const squirrelStartup = require('electron-squirrel-startup');
    if (squirrelStartup) {
      app.quit();
    }
  } catch (err) {
  }
}

const createWindow = () => {
  win = new BrowserWindow({
    width: 1000,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
  
  // win.webContents.openDevTools();

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url); 
    return { action: 'deny' };
  });
};

// This method will be called when Electron has finished
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


// Quiting
app.on('window-all-closed', () => {
  if (process.platform != 'darwin') {
    app.quit();
  }
});


ipcMain.handle("choose-template", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Choose summary_template.txt",
    properties: ["openFile"],
    filters: [{ name: "Text", extensions: ["txt"] }],
  });

  if (canceled || !filePaths[0]) {
    return null;
  }

  return filePaths[0];
});

ipcMain.handle("choose-folder", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Select folder containing PDFs",
    properties: ["openDirectory"],
  });
  
  if (canceled || !filePaths[0]) {
    return null;
  }

  return filePaths[0];
});

ipcMain.handle("consume-drop", async (_evt, maybePath) => {
  try {
    if (!maybePath) return null;
    const stat = fs.statSync(maybePath);

    if (stat.isDirectory()) {
      return maybePath
    } else {
      return path.dirname(maybePath)
    }
    
  } catch {
    return null;
  }
});

ipcMain.handle("list-folder", async (_evt, folderPath) => {
  const files = await fs.promises.readdir(folderPath);

  return files;
});

ipcMain.handle("parse-folder", async (_evt, { folderPath, templatePath }) => {
  return new Promise((resolve, reject) => {
    const { command, args } = getPythonCommand("parse.py", [
      folderPath,
      templatePath,
    ]);

    const py = spawnPythonProcess(command, args);

    let stdoutData = "";
    let stdoutError = "";
    let final;

    py.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutData += text; 

      if (win && !win.isDestroyed()) {
        win.webContents.send("parse-progress", text);
      }

      final = stdoutData.split("TR:");
    });

    py.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      console.error(text)
      stdoutError += text;
    });

    py.on("error", (err) => {
      console.error(err);
      stdoutError += String(err);
    });

    py.on("close", (code) => {
      // Success
      if (code === 0) {
        resolve(final);

      // Fail
      } else {
        resolve(stdoutError);
      }
    });
  })
});


ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || !result.filePaths.length) return null;
  
  return result.filePaths[0];
});

ipcMain.handle("choose-export-template", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Choose a .docx",
    properties: ["openFile"],
    filters: [{ name: "Docx", extensions: ["docx"] }],
  });

  if (canceled || !filePaths[0]) {
    return null;
  }

  return filePaths[0];
});

ipcMain.handle('export-docx', async (event, { templatePath, saveDir, fileName, resultsPath }) => {
  return new Promise((resolve, reject) => {
    const { command, args } = getPythonCommand("buildWordDocument.py", [
      templatePath,
      saveDir,
      fileName,
      resultsPath,
    ]);

    console.log("\nRunning Python:", command);
    console.log(saveDir);
    const py = spawnPythonProcess(command, args);

    let stdoutData = "";
    let stdoutError = "";

    py.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutData += text; 
    });

    py.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutError += text; 
      console.error(text);
    });

    py.on("error", (err) => {
      reject(err)
    });

    py.on("close", (code) => {
      // Success
      if (code === 0) {
        resolve(stdoutData);

      // Fail
      } else {
        resolve(stdoutError);
      }
    });
  });
});

ipcMain.handle('write-JSON', async (event, { data }) => {
  try {
    const resourcesDir = app.isPackaged
      ? path.join(app.getPath("userData"), "resources")
      : path.resolve(__dirname, "..", "..", "resources");

    await fs.promises.mkdir(resourcesDir, { recursive: true });
    const jsonPath = path.join(resourcesDir, "results.json");

    await fs.promises.writeFile(jsonPath, data, "utf-8");
    console.log("Wrote JSON to", jsonPath);
    return { ok: true, jsonPath };

  } catch (err) {
    console.error("Failed to write JSON:", err);
    throw err;
  }
});
