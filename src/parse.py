import pdfplumber
from pathlib import Path
import argparse

def parseLocation(line):
  if line[0] == "US":
    return (line[2] + ", " + line[1])
  else:
    raise SystemExit("\033[Error parsing location\033[0m")


def extract(fileName):
  CTNum = -1
  ESPName = ""
  ESPReceive = ""
  NCMECReceive = ""
  DOJReceive = ""
  Location = ""

  with pdfplumber.open(fileName) as pdf:
    for page in pdf.pages:
      text = page.extract_text()
      lines = [ln.strip() for ln in text.splitlines() if ln and ln.strip()]
      counter = 0

      for line in lines:
        # Report Number
        if CTNum == -1 and "CyberTipline Report" in line:
          CTNum = line.split(' ')[2]

          if str(fileName).split(' ')[1].split('.')[0] != CTNum:
            raise TypeError(f"\n\033[31mFile name: {str(fileName).split('/')[1]} doesn't match CT Num: {CTNum}\033[0m")

        # ESP Name
        if ESPName == "" and "Submitter:" in line:
          ESPName = lines[counter+1].split(' ')[0]

        # ESP Recieve Date
        if ESPReceive == "" and "Incident Time:" in line:
          ESPReceive = line.split(' ')[0]

        # NCMEC Recieve Date
        if NCMECReceive == "" and "Received by NCMEC" in line:
          NCMECReceive = line.split(' ')[4]

        # DOJ Recieve Date
        if DOJReceive == "" and "Time/Date was made available:" in line:
          DOJReceive = line.split(' ')[4]

        # Suspected Location
        if Location == "" and "Code Code" in line:
          Location = parseLocation(lines[counter+1].split(' '))
          
        counter += 1

  if CTNum == -1 or ESPName == "" or ESPReceive == "" or NCMECReceive == "" or DOJReceive == "" or Location == "":
    raise SystemExit(f"\n\033[31mSomething went with wrong with file: {str(fileName).split('/')[1]}\033[0m")

  print(f"CT #: {CTNum}")
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

pdfs = sorted(list(folder.glob("*.pdf")) + list(folder.glob("*.PDF")))

if not pdfs:
  raise SystemExit(f"\033[31mNo PDFs found in: {folder.resolve()}\033[0m")

for indivPDF in pdfs:
  try:
      extract(indivPDF)
  except Exception as e:
      print(f"\033[31mError with: {indivPDF.name}: {e}\033[0m")