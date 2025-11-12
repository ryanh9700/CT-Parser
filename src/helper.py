""" Returns text with a specific color"""
# \033[41m red highlight
# \033[0m red
# \033[32m green
# \033[45m purple highlight
def colorText(text, color):
  return color + text + "\033[0m"


""" Parses and returns a given location """
def parseLocation(line):
  if line[1] == "US":
    city = line[3]

    if "Albuquer" in city:
      city = "Albuquerque"
    elif "Farmingto" in city:
      city = "Farmington"
    elif "Alamogord" in city:
      city = "Alamogordo"
    elif "Santa" in city:
      city = "Santa Fe"

    return (city + ", " + line[2])
  else:
    return "NONE"
  
  
""" Prints final results """
def printResults(numPDFs, CTList, numRed):
  print()
  print(colorText(f"Total in folder: {numPDFs} files.", "\033[45m") + "\n")
  print(colorText(f"Processed: {len(CTList)} files.", "\33[42m"))
  print(colorText(f"No Location: {numRed} files.", "\33[41m") + "\n")


  for i in range(len(CTList)):
    if i != len(CTList)-1:
      print(f"{CTList[i]},", end=' ')

    elif len(CTList) == 1:
      print(f"{CTList[i]}", end=' ')

    else:
      print(f"and {CTList[i]}", end=' ')

  print("\n")