import './index.css';

const btnTemplate = document.getElementById("btnTemplate");
const btnFolder = document.getElementById("btnFolder");
const btnSelectInside = document.getElementById("btnSelectInside");
const templatePathBadge = document.getElementById("templatePath");
const btnStart = document.getElementById("btnStart");
const filesHeader = document.getElementById("fileHeader");
const outputHeader = document.getElementById("outputHeader");

const instructBtn = document.getElementById("instructBtn");
const instructionsModal  = document.getElementById('instructionsModal');
const closeInstructions  = document.getElementById('closeInstructions');

const legendBtn = document.getElementById("legendBtn");
const legendModal  = document.getElementById('legendModal');
const closeLegend  = document.getElementById('closeLegend');

const startExportBtn = document.getElementById("exportBtn");
const exportWindow = document.getElementById("exportWindow");
const closeExportWindow = document.getElementById("closeExport");
const finalExportBtn = document.getElementById("confirmExport");
const browseBtn = document.getElementById("btnBrowseSaveLocation");
const DOCXTemplateInput = document.getElementById('uploadTemplate');
const saveFileName = document.getElementById("exportFileName");
const uploadText = document.getElementById("uploadText");

const ESPNameLabel = document.getElementById("finalESPName");

const picker = document.getElementById("picker");
const columns = document.getElementById("columns");
const filesEl   = document.getElementById("files");
const filesBody = document.getElementById("filesBody");
const outputEl = document.getElementById("output");

const resultsEl        = document.getElementById("results");
const btnCopySummary   = document.getElementById("btnCopySummary");
const btnCopyCyberTips = document.getElementById("btnCopyCyberTips");

let currentTemplatePath = null;
let currentFolderPath = null;

let summary = "";
let allCyberTips = "";
let copyReady = false;
let fileRowCount = 0;

let saveDirectoryPath = null;
let DOCXTemplatePath = null;

let typedESPName = null;
let intendedSaveFileName = saveFileName.placeholder;
let parseProgressActive = false;
let parseSummaryBuffer = "";
let parseStreamBuffer = "";
let parseTotalsReached = false;

window.api.onParseProgress((chunk) => {
  if (!parseProgressActive || parseTotalsReached) return;

  parseStreamBuffer += chunk;
  const markerIndex = parseStreamBuffer.indexOf("TR:");
  let summaryChunk;

  if (markerIndex === -1) {
    summaryChunk = parseStreamBuffer;
    parseStreamBuffer = "";
  } else {
    summaryChunk = parseStreamBuffer.slice(0, markerIndex);
    parseStreamBuffer = parseStreamBuffer.slice(markerIndex);
    parseTotalsReached = true;
  }

  if (!summaryChunk) return;

  parseSummaryBuffer += summaryChunk;
  appendOutput(summaryChunk);
  updateTable(parseSummaryBuffer);
});

function showColumns() {
  if (templatePathBadge.textContent == "No Template") {
    outputHeader.textContent = "> Upload a Template to Begin <";
  }

  picker.style.display = "none";
  columns.style.display = "grid";
}

function appendFile(name) {
  fileRowCount += 1;

  const tr = document.createElement("tr");
  tr.dataset.filename = name; // so we can find this row later if needed

  const numberCell = document.createElement("td");
  numberCell.textContent = fileRowCount;

  const nameCell = document.createElement("td");
  nameCell.textContent = name;
  nameCell.className = "file-name";
  nameCell.classList.add("file-status-pending");

  tr.appendChild(numberCell);
  tr.appendChild(nameCell);

  filesBody.appendChild(tr);
}

function updateTable(summary) {
  let temp = summary.split(/\r?\n/);
  temp = temp.filter(item => item !== "")

  const rows = filesBody.querySelectorAll("tr");
  const limit = Math.min(temp.length, rows.length);

  for (let i = 0; i < limit; i++) {
    const entry = temp[i];

    if (temp[i].includes("[31m")) {
      setFileStatus("error", i);

    } else {
      setFileStatus("ok", i);
    }
  }
}


function ansiToHtml(text) {
  return text
    .replace(/\u001b\[32m/g, '<span class="ansi-green">')
    .replace(/\u001b\[31m/g, '<span class="ansi-red">')
    .replace(/\u001b\[41m/g, '<span class="ansi-red">')
    .replace(/\u001b\[42m/g, '<span class="ansi-green">')
    .replace(/\u001b\[45m/g, '<span class="ansi-magenta">')
    .replace(/\u001b\[0m/g, '</span>');
}

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function appendOutput(text) {
  const html = ansiToHtml(text);

  const line = document.createElement("div");
  line.className = "output-line";
  line.innerHTML = html;

  outputEl.appendChild(line);
  outputEl.scrollTop = outputEl.scrollHeight;
}


function clearPanels() {
  filesBody.innerHTML = "";
  fileRowCount = 0;

  outputEl.textContent = "";
  resultsEl.innerHTML = "";
}

function updateStartButtonState() {
  const ready = currentTemplatePath && currentFolderPath;

  btnStart.disabled = !ready;

  if (ready) {
    btnStart.classList.add("button-ready");
  } else {
    btnStart.classList.remove("button-ready");
  }
}

btnTemplate.onclick = async () => {
  const path = await window.api.chooseTemplate();
  if (!path) return;

  currentTemplatePath = path;

  let temp = path.split(/[\\/]/);
  let fileName = temp[temp.length-1];
  templatePathBadge.textContent = fileName;
  templatePathBadge.classList.add("badge-ready");

  outputHeader.textContent = "Press Start";

  setResultButtonsEnabled(false);
  updateStartButtonState();
}

btnStart.onclick = async () => {
  if (currentTemplatePath == null || currentFolderPath == null) return;
  
  saveFileName.value = "";
  DOCXTemplatePath = null;
  typedESPName = null;
  ESPNameLabel.value = "";
  saveDirectoryPath = null;
  uploadText.textContent = "No template selected"
  exportSavePathLabel.textContent = "No folder selected"

  resetFileStatuses();
  setResultButtonsEnabled(false);
  resultsEl.textContent = "";
  outputEl.textContent = "";
  parseSummaryBuffer = "";
  parseStreamBuffer = "";
  parseTotalsReached = false;
  parseProgressActive = true;

  outputHeader.textContent = "Running..."
  let text = await window.api.parseFolder(currentFolderPath, currentTemplatePath);
  parseProgressActive = false;

  if (!Array.isArray(text)) {
    outputHeader.textContent = "Error Encountered"
    createPopUp(text);
    return;
  }

  summary = text[0];
  allCyberTips = text[1];

  // All Cyber Tips
  outputHeader.textContent = "Output"
  createPopUp(allCyberTips);

  // Summary Results
  updateTable(summary);

  // Results
  setResults(text[2]);

}



function setResults(text) {
  const html = ansiToHtml(text);

  resultsEl.innerHTML = "";
  html.split(/\r?\n/).forEach((lineHtml) => {
    const div = document.createElement("div");
    div.className = "output-line";
    div.innerHTML = lineHtml;
    resultsEl.appendChild(div);
  });

  setResultButtonsEnabled(true);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function setResultButtonsEnabled(enabled) {
  btnCopySummary.disabled = !enabled;
  btnCopyCyberTips.disabled = !enabled;
  startExportBtn.disabled = !enabled;

  if (enabled) {
    btnCopySummary.classList.add("button-ready");
    btnCopyCyberTips.classList.add("button-ready");
    startExportBtn.classList.add("export-ready");
    copyReady = true;
  } else {
    btnCopySummary.classList.remove("button-ready");
    btnCopyCyberTips.classList.remove("button-ready");
    startExportBtn.classList.remove("export-ready");
    copyReady = false;
  }
}

async function copyToClipboard(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    console.log("Copied to clipboard");
  } catch (err) {
    console.error("Clipboard copy failed:", err);
  }
}

btnCopySummary.addEventListener('click', () => {
  if (!copyReady) return;
  copyToClipboard(stripAnsi(summary));
});

btnCopyCyberTips.addEventListener('click', () => {
  if (!copyReady) return;
  copyToClipboard(stripAnsi(allCyberTips));
});

async function selectFolderAndRun() {
  const folder = await window.api.chooseFolder();
  if (!folder) return null;

  currentFolderPath = folder;

  // Add files to column
  const files = await window.api.listFolder(folder);
  if (!isValidFolder(files)) return;
  showColumns();
  clearPanels();
  let temp = folder.split(/[\\/]/);
  filesHeader.textContent = temp[temp.length-1];

  for (let i = 0; i < files.length; i++) {
    const temp = files[i].split(".");
    const ext = temp[temp.length-1];

    if (ext != "pdf") continue;
    appendFile(files[i]);
  }

  setResultButtonsEnabled(false);
  updateStartButtonState();
}

function isValidFolder(files) {
  for (let i = 0; i < files.length; i++) {
    const temp = files[i].split(".");
    const ext = temp[temp.length-1];

    if (ext == "pdf") return true;
  }

  currentFolderPath = null;
  return false;
}

function setFileStatus(status, i) {
  const nameCell   = filesBody.querySelectorAll("tr")[i].children[1];
       
  nameCell.classList.remove(
    "file-status-pending",
    "file-name-ok",
    "file-name-error"
  );

  if (status === "ok" || status === "green") {
    nameCell.classList.add("file-name-ok");

  } else if (status === "error" || status === "red") {
    nameCell.classList.add("file-name-error");
  }
}

function resetFileStatuses() {
  const rows = filesBody.querySelectorAll("tr");

  rows.forEach((row) => {
    const nameCell = row.children[1];

    nameCell.classList.remove("file-name-ok", "file-name-error");
    nameCell.classList.add("file-status-pending");
  });
}


btnFolder.onclick = async () => {
  selectFolderAndRun();
}

btnSelectInside.onclick = async () => {
  selectFolderAndRun();
}

instructionsModal.addEventListener('click', (e) => {
  if (e.target === instructionsModal){
    instructionsModal.classList.add('hidden');
  }
});

legendModal.addEventListener('click', (e) => {
  if (e.target === legendModal){
    legendModal.classList.add('hidden');
  }
});

instructBtn.addEventListener('click', () => {
  if (instructionsModal.classList.contains("hidden")) {
    instructionsModal.classList.remove('hidden');
  } else {
    instructionsModal.classList.add('hidden');
  }
});

closeInstructions.addEventListener('click', () => {
  instructionsModal.classList.add('hidden');
});

closeLegend.addEventListener('click', () => {
  legendModal.classList.add('hidden');
});

legendBtn.addEventListener('click', () => {
  if (legendModal.classList.contains("hidden")) {
    legendModal.classList.remove('hidden');
  } else {
    legendModal.classList.add('hidden');
  }
});


startExportBtn.addEventListener('click', () => {
  if (exportWindow.classList.contains("hidden")) {
    exportWindow.classList.remove('hidden');
  } else {
    exportWindow.classList.add('hidden');
  }
});

closeExportWindow.addEventListener('click', () => {
  exportWindow.classList.add('hidden');
});

exportWindow.addEventListener('click', (e) => {
  if (e.target === exportWindow){
    exportWindow.classList.add('hidden');
  }
});


DOCXTemplateInput.onclick = async () => {
  const file = await window.api.chooseExportTemplate();
  if (!file) return;

  DOCXTemplatePath = file;

  // Get file name of template
  let temp = DOCXTemplatePath.split(/[\\/]/); 
  uploadText.textContent = temp[temp.length-1];

  // Update finalExportBtn visual
  console.log("Template path: " + DOCXTemplatePath);
  console.log("File name: " + intendedSaveFileName);
  console.log("ESP: " + typedESPName);
  console.log("Save: " + saveDirectoryPath);

  if (DOCXTemplatePath && intendedSaveFileName && typedESPName && saveDirectoryPath) {
    finalExportBtn.disabled = false;
    finalExportBtn.classList.add("button-ready");
  }
}

// Browse for save location (Electron-side folder picker)
browseBtn.onclick = async () => {
  const folderPath = await window.api.pickFolder();

  if (!folderPath) return; 

  saveDirectoryPath = folderPath;
  document.getElementById("exportSavePathLabel").textContent = saveDirectoryPath;

  // Update finalExportBtn visual
  if (DOCXTemplatePath && intendedSaveFileName && typedESPName && saveDirectoryPath) {
    finalExportBtn.disabled = false;
    finalExportBtn.classList.add("button-ready");
  }
}

saveFileName.addEventListener('input', async () => {
  intendedSaveFileName = saveFileName.value.trim();

  // Update finalExportBtn visual
  if (DOCXTemplatePath && intendedSaveFileName && typedESPName && saveDirectoryPath) {
    finalExportBtn.disabled = false;
    finalExportBtn.classList.add("button-ready");
  } else {
    finalExportBtn.disabled = true;
    finalExportBtn.classList.remove("button-ready");
  }
});


ESPNameLabel.addEventListener('input', async () => {
  typedESPName = ESPNameLabel.value.trim();

  // Update finalExportBtn visual
  if (DOCXTemplatePath && intendedSaveFileName && typedESPName && saveDirectoryPath) {
    finalExportBtn.disabled = false;
    finalExportBtn.classList.add("button-ready");
  } else {
    finalExportBtn.disabled = true;
    finalExportBtn.classList.remove("button-ready");
  }
});

// Confirm export
finalExportBtn.addEventListener('click', async () => {
  if (!intendedSaveFileName) intendedSaveFileName = saveFileName.placeholder;

  if (!intendedSaveFileName.toLowerCase().endsWith('.docx')) {
    intendedSaveFileName += '.docx';
  }

  console.log(intendedSaveFileName);
  console.log(typedESPName);

  const data = {
    "{ESPNameBold}": typedESPName,
    "{ESPName}": typedESPName,
    "{allCTNums}": stripAnsi(allCyberTips).trim(),
    "{fullSummary}": stripAnsi(summary).trim()
  }

  const jsonString = JSON.stringify(data);
  await window.api.writeJSON(jsonString);
 
  let results = await window.api.exportDocx(DOCXTemplatePath, saveDirectoryPath, intendedSaveFileName);
  console.log(results);
  exportWindow.classList.add('hidden');
});



function createPopUp(text) {
  const html = ansiToHtml(text);

  const line = document.createElement("div");
  line.className = "sticky-header";
  line.innerHTML = html;

  outputEl.appendChild(line);
}
