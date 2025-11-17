import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';

const { spawn } = require("child_process");
const path = require("node:path");
const fs = require("fs");

let win;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
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
    const parsePath = path.resolve(
      __dirname,
      "..",
      "..",
      "src",
      "Python",
      "parse.py"
    );

    console.log("Running Python:", parsePath, "on folder:", folderPath);

    const py = spawn(
      process.platform === "win32" ? "python" : "python3", 
      ["-u", parsePath, folderPath, templatePath]
    );

    let stdoutData = "";
    let stdoutError = "";
    let final;

    py.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutData += text; 

      final = stdoutData.split("TR:");
    });

    py.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutError += text;
    });

    py.on("error", (err) => {
      const text = chunk.toString();
      stdoutError += text;
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

ipcMain.handle('export-docx', async (event, { templatePath, saveDir, fileName, values }) => {
  return new Promise((resolve, reject) => {
    const parsePath = path.resolve(
      __dirname,
      "..",
      "..",
      "src",
      "Python",
      "buildWordDocument.py"
    );

    console.log("Running Python:", parsePath);
    console.log(saveDir);
    const py = spawn(
      process.platform === "win32" ? "python" : "python3", 
      ["-u", parsePath, templatePath, saveDir, fileName, JSON.stringify(values)]
    );

    let stdoutData = "";
    let stdoutError = "";

    py.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutData += text; 
    });

    py.stderr.on("data", (err) => {
      stdoutError += err;
      reject(stdoutError)
    });

    py.on("error", (err) => {
      stdoutError += err;
      reject(stdoutError)
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