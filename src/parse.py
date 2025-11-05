import pdfplumber
from pathlib import Path
import argparse

def parseLocation(line):
  if line[1] == "US":
    return (line[3] + ", " + line[2])
  else:
    raise SystemExit("\033[31mError parsing location\033[0m")


def extract(fileName):
  CTNum = -1
  ESPName = "NONE"
  ESPReceive = "NONE"
  NCMECReceive = "NONE"
  DOJReceive = "NONE"
  Location = "NONE"

  with pdfplumber.open(fileName) as pdf:
    for page in pdf.pages:
      text = page.extract_text()
      lines = [ln.strip() for ln in text.splitlines() if ln and ln.strip()]
      counter = 0

      for line in lines:
        # Report Number
        if CTNum == -1 and "CyberTipline Report" in line:
          CTNum = line.split(' ')[2]

        # if str(fileName).split(' ')[1].split('.')[0] != CTNum:
        #   raise SystemExit(f"\n\033[31mFile name: {str(fileName).split(' ')[1]} doesn't match CT Num: {CTNum}\033[0m")

        # ESP Name
        if ESPName == "NONE" and "Submitter:" in line:
          ESPName = lines[counter+1].split()[0]

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
        if Location == "NONE" and "Code Code" in line:
          Location = parseLocation(lines[counter+1].split())
          
        counter += 1
  
  if CTNum == -1 or ESPName == "NONE" or ESPReceive == "NONE" or NCMECReceive == "NONE" or DOJReceive == "NONE":
    raise SystemExit(f"\033[31mSomething went with wrong with file: {fileName.name}\033[0m")

  print(f"CT #: {CTNum}")
  print(f"ESP-N: {ESPName}")
  print(f"ESP: {ESPReceive}")
  print(f"NCMEC: {NCMECReceive}")
  print(f"DOJ: {DOJReceive}")
  print(f"Location: {Location}")
  print()
  
parser = argparse.ArgumentParser(description="Parse CyberTip PDFs in a folder.")
parser.add_argument("folder", help="Path to folder containing PDFs")
args = parser.parse_args()

folder = Path(args.folder)
if not folder.exists() or not folder.is_dir():
  raise SystemExit(f"\033[31mNot a folder: {folder.resolve()}\033[0m")

pdfs = sorted(list(folder.glob("*.pdf")))

if not pdfs:
  raise SystemExit(f"\033[31mNo PDFs found in: {folder.resolve()}\033[0m")

for indivPDF in pdfs:
  #try:
      extract(indivPDF)
 # except Exception as e:
  ##    raise SystemExit(f"\033[31mError with: {indivPDF.name}: {e}\033[0m")