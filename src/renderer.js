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

const exportBtn = document.getElementById("exportBtn");


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


function showColumns() {
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

  // scroll the container, not the tbody itself
  filesEl.scrollTop = filesEl.scrollHeight;
}

function updateTable(summary) {
  let temp = summary.split(/\r?\n/);
  temp = temp.filter(item => item !== "")

  for (let i = 0; i < temp.length; i++) {
    const entry = temp[i];

    const firstInstance = entry.indexOf("[42m")+4;
    const fileName = entry.substring(firstInstance, entry.indexOf("[0m", firstInstance)-1).trim();

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
  //outputEl.scrollTop = outputEl.scrollHeight;
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
  updateStartButtonState();
}

btnStart.onclick = async () => {
  if (currentTemplatePath == null || currentFolderPath == null) return;
  
  resetFileStatuses();

  setResultButtonsEnabled(false);
  resultsEl.textContent = "";
  outputEl.textContent = "";

  outputHeader.textContent = "Running..."
  let text = await window.api.parseFolder(currentFolderPath, currentTemplatePath);

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
  appendOutput(summary);
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
}

function setResultButtonsEnabled(enabled) {
  btnCopySummary.disabled = !enabled;
  btnCopyCyberTips.disabled = !enabled;
  exportBtn.disabled = !enabled;

  if (enabled) {
    btnCopySummary.classList.add("button-ready");
    btnCopyCyberTips.classList.add("button-ready");
    exportBtn.classList.add("export-ready");
    copyReady = true;
  } else {
    btnCopySummary.classList.remove("button-ready");
    btnCopyCyberTips.classList.remove("button-ready");
    exportBtn.classList.remove("export-ready");
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

  updateStartButtonState();
}

function isValidFolder(files) {
  if (files.length == 0) return false;

  for (let i = 0; i < files.length; i++) {
    const temp = files[i].split(".");
    const ext = temp[temp.length-1];

    if (ext == "pdf") return true;
  }

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



///


function createPopUp(text) {
  const html = ansiToHtml(text);

  const line = document.createElement("div");
  line.className = "sticky-header";
  line.innerHTML = html;

  outputEl.appendChild(line);
}