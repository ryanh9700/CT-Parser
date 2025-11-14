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


const picker = document.getElementById("picker");
const columns = document.getElementById("columns");
const filesEl = document.getElementById("files");
const outputEl = document.getElementById("output");

const resultsEl        = document.getElementById("results");
const btnCopySummary   = document.getElementById("btnCopySummary");
const btnCopyCyberTips = document.getElementById("btnCopyCyberTips");

let currentTemplatePath = null;
let currentFolderPath = null;

let summary = "";
let allCyberTips = "";
let copyReady = false;

function showColumns() {
  picker.style.display = "none";
  columns.style.display = "grid";
}

function appendFile(name) {
  const div = document.createElement("div");
  div.className = "file";
  div.textContent = name;
  filesEl.appendChild(div);
  filesEl.scrollTop = filesEl.scrollHeight;
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
  filesEl.innerHTML = "";
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
  let temp = path.split("/");
  let fileName = temp[temp.length-1];
  templatePathBadge.textContent = fileName;
  templatePathBadge.classList.add("badge-ready");
  updateStartButtonState();
}

btnStart.onclick = async () => {
  if (currentTemplatePath == null || currentFolderPath == null) return;
  
  setCopyButtonsEnabled(false);
  resultsEl.textContent = "";
  outputEl.textContent = "";

  outputHeader.textContent = "Running..."
  let text = await window.api.parseFolder(currentFolderPath, currentTemplatePath);
  summary = text[0];
  allCyberTips = text[1];

  // All Cyber Tips
  outputHeader.textContent = "Output"
  createPopUp(allCyberTips);

  // Summary Results
  appendOutput(summary);

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
  
  setCopyButtonsEnabled(true);
}

function setCopyButtonsEnabled(enabled) {
  btnCopySummary.disabled = !enabled;
  btnCopyCyberTips.disabled = !enabled;

  if (enabled) {
    btnCopySummary.classList.add("button-ready");
    btnCopyCyberTips.classList.add("button-ready");
    copyReady = true;
  } else {
    btnCopySummary.classList.remove("button-ready");
    btnCopyCyberTips.classList.remove("button-ready");
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

  clearPanels();
  showColumns();

  let temp = folder.split("/");
  filesHeader.textContent = temp[temp.length-1];

  // Add files to column
  const files = await window.api.listFolder(folder);
  for (let i = 0; i < files.length; i++) {
    appendFile((i+1) + ". " + files[i]);
  }

  updateStartButtonState();
}

btnFolder.onclick = async () => {
  selectFolderAndRun();
}

btnSelectInside.onclick = async () => {
  selectFolderAndRun();
}
function openInstructions(){
  if (instructionsModal){
    instructionsModal.classList.remove('hidden');
  }
}

function closeInstructionsModal(){
  if (instructionsModal){
    instructionsModal.classList.add('hidden');
  }
}

if (instructBtn){
  instructBtn.addEventListener('click', openInstructions);
}

if (closeInstructions){
  closeInstructions.addEventListener('click', closeInstructionsModal);
}

// Optional: click on the dark background to close
if (instructionsModal){
  instructionsModal.addEventListener('click', (e) => {
    if (e.target === instructionsModal){
      closeInstructionsModal();
    }
  });
}



function createPopUp(text) {
  const html = ansiToHtml(text);

  const line = document.createElement("div");
  line.className = "sticky-header";
  line.innerHTML = html;

  outputEl.appendChild(line);
}

// Progress channels from main
window.api.onProgressFile((name) => appendFile(name));
window.api.onProgressOut((line) => appendOutput(line));
window.api.onProgressDone((code) => {
  appendOutput(`\n--- Parsing finished with exit code ${code} ---`);
});
window.api.onProgressError((err) => {
  appendOutput(`ERROR: ${err}`);
});