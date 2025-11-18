import pgeocode as pg
import re

ZIP_RE = re.compile(r'^\d{5}(-\d{4})?$')  # 12345 or 12345-6789

""" Returns text with a specific color"""
# \033[41m red highlight
# \033[31m red
# \033[32m green
# \033[42m green highlight
# \033[45m purple highlight
def colorText(text, color):
  return color + text + "\033[0m"


""" Get zip code """
def extract_zip(tokens):
  for t in tokens:
      cand = re.sub(r'[^0-9-]', '', t)
      if ZIP_RE.fullmatch(cand):
          return cand.split('-')[0] 
      
  return None
   

""" Parses and returns a given location """
def parseLocation(line):
  if len(line) > 1 and line[1] == "US":
    nomi = pg.Nominatim(line[1])
    state = line[2]
    city = line[3]
    zip = extract_zip(line)
    
    # Lookup city based on zip code
    location_data = nomi.query_postal_code(zip)
    if location_data is not None:
        foundCity = location_data['place_name']
        foundState = location_data['state_code']

        # Validate city
        if (state == foundState and city in foundCity):
           city = foundCity
        else:
           city = "[Attempted finding city but failed]"

    return (city + ", " + state)
  
  return "NONE"
  
  
""" Prints final results """
def printResults(numPDFs, CTList, numRed):
  print()
  print("TR:", end='')
  for i in range(len(CTList)):
    if i != len(CTList)-1:
      print(f"{CTList[i]},", end=' ')

    elif len(CTList) == 1:
      print(f"{CTList[i]}", end=' ')

    else:
      print(f"and {CTList[i]}", end=' ')

  print("TR:")
  print(colorText(f"Total in folder:\n{numPDFs} files.", "\033[45m"))
  print(colorText(f"Processed:\n{len(CTList)} files.\n", "\33[42m"))
  print(colorText(f"No Location:\n{numRed} files.", "\33[41m"))
