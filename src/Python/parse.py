import helper
import pdfplumber
from pathlib import Path
import argparse

CTList = []
redTotal = 0
globalCounter = 0

""" Final relevant information from PDF and places into summary template """
def extract(fileName):
  CTNum = -1
  ESPName = "NONE"
  ESPReceive = "NONE"
  NCMECReceive = "NONE"
  DOJReceive = "NONE"
  Location = "NONE"

  with pdfplumber.open(fileName) as pdf:
    global redTotal

    for page in pdf.pages:
      text = page.extract_text()
      lines = [ln.strip() for ln in text.splitlines() if ln and ln.strip()]
      counter = 0

      for line in lines:
        # Report Number
        if CTNum == -1 and "CyberTipline Report" in line:
          CTNum = line.split(' ')[2]
          CTList.append(CTNum)

        # ESP Name
        if ESPName == "NONE" and "Submitter:" in line:
          tempName = lines[counter+1].split()[0]

          if tempName[len(tempName)-1] == ",":
            tempName = tempName[:-1]
          ESPName = tempName

        # ESP Recieve Date
        if ESPReceive == "NONE" and "Incident Time:" in line:
          ESPReceive = line.split()[2]

        # NCMEC Recieve Date
        if NCMECReceive == "NONE" and "Received by NCMEC" in line:
          NCMECReceive = line.split()[4]

        # DOJ Recieve Date
        if DOJReceive == "NONE" and "Time/Date was made available:" in line:
          DOJReceive = line.split()[4]

        # Suspected Location
        if Location == "NONE" or "NM" not in Location:
          Location = helper.parseLocation(line.split())

        counter += 1
  
  # All of these should exist
  if CTNum == -1 or ESPName == "NONE" or ESPReceive == "NONE" or NCMECReceive == "NONE" or DOJReceive == "NONE":
    raise SystemExit(f"\033[41mSomething went wrong with file:\033[0m {fileName.name}")

  try:
    template_text = TEMPLATE_PATH.read_text(encoding="utf-8").strip()
  except FileNotFoundError:
    raise SystemExit(helper.colorText("Template file not found.", "\033[41m"))

  # Fill and color values

  if Location == "NONE" or "NM" not in Location:
    Location = helper.colorText(Location, "\033[31m")
    redTotal = redTotal + 1
    CTList[globalCounter] = helper.colorText(CTList[globalCounter], "\033[31m")
  else:
    Location = helper.colorText(Location, "\033[32m")
    CTList[globalCounter] = helper.colorText(CTList[globalCounter], "\033[32m")

  ESPReceive = helper.colorText(ESPReceive, "\033[32m")
  ESPName = helper.colorText(ESPName, "\033[32m")
  NCMECReceive = helper.colorText(NCMECReceive, "\033[32m")
  CTNum = helper.colorText(CTNum, "\033[42m")
  DOJReceive = helper.colorText(DOJReceive, "\033[32m")

  narrative = template_text.format(
      ESPReceive=ESPReceive,
      ESPName=ESPName,
      NCMECReceive=NCMECReceive,
      Location=Location,
      CTNum=CTNum,
      DOJReceive=DOJReceive,
  )

  print(narrative + "\n")


  
parser = argparse.ArgumentParser(description="Parse CyberTip PDFs in a folder.")
parser.add_argument("folder", help="Path to folder containing PDFs")
parser.add_argument("template", help="Path to template")
args = parser.parse_args()

folder = Path(args.folder)
if not folder.exists() or not folder.is_dir():
  raise SystemExit(f"\033[41mNot a valid folder name or path:\033[0m {folder.resolve()}")

TEMPLATE_PATH = Path(args.template)
if not TEMPLATE_PATH.exists():
  raise SystemExit(f"\033[41mNot a valid template name or path:\033[0m {TEMPLATE_PATH.resolve()}")

pdfs = sorted(list(folder.glob("*.pdf")))

if not pdfs:
  raise SystemExit(f"\033[41mNo PDFs found in:\033[0m {folder.resolve()}")

# Evaluate PDFs
# print(helper.colorText("Summary:", "\033[45m"))
for indivPDF in pdfs:
  extract(indivPDF)
  globalCounter += 1

# Print results
helper.printResults(len(pdfs), CTList, redTotal)