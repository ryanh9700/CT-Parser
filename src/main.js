import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';

const { spawn, spawnSync } = require("child_process");
const path = require("node:path");
const fs = require("fs");

const REQUIRED_PYTHON_MODULES = ["pdfplumber", "docxtpl", "pgeocode"];

function hasPythonModules(pythonPath) {
  try {
    const check = spawnSync(
      pythonPath,
      ["-c", `import ${REQUIRED_PYTHON_MODULES.join(", ")}`],
      { stdio: "ignore" }
    );
    return check.status === 0;
  } catch (err) {
    return false;
  }
}

function resolvePythonExecutable() {
  const candidates = [
    process.env.PYTHON_EXECUTABLE,
    "python3",
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
    "/usr/bin/python3",
    process.platform === "win32" ? "python" : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (hasPythonModules(candidate)) {
      return candidate;
    }
  }

  console.warn(
    "Falling back to system python. Install required modules or set PYTHON_EXECUTABLE."
  );
  return process.platform === "win32" ? "python" : "python3";
}

const PYTHON_BIN = resolvePythonExecutable();

function resolvePythonScript(scriptName) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "Python", scriptName);
  }

  return path.resolve(__dirname, "..", "..", "src", "Python", scriptName);
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
  

  // Open the DevTools.
  // win.webContents.openDevTools();

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url); // Open the URL in the user's default browser
    return { action: 'deny' }; // Prevent Electron from opening the URL internally
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
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
  console.warn("running parse-folder with:", folderPath);

  try {
    const result = await runPy(folderPath, templatePath);
    return result;

  } catch (err) {
    console.error("Python error:", err);
    throw err; // propagates back to renderer
  }
});


function runPy(folderPath, templatePath) {
  return new Promise((resolve, reject) => {
    const parsePath = resolvePythonScript("parse.py");

    console.log("\nRunning Python:", parsePath, "on folder:", folderPath);

    const py = spawn(PYTHON_BIN, ["-u", parsePath, folderPath, templatePath]);

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
  });
}

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
    const parsePath = resolvePythonScript("buildWordDocument.py");

    console.log("\nRunning Python:", parsePath);
    console.log(saveDir);
    const py = spawn(PYTHON_BIN, ["-u", parsePath, templatePath, saveDir, fileName, resultsPath]);

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
