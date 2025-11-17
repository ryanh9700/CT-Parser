from docx import Document
from pathlib import Path
import argparse
import json

def replace_variables_in_doc(doc_path, output_path, replacements):
  document = Document(doc_path)

  for paragraph in document.paragraphs:
      for placeholder, value in replacements.items():
          if placeholder in paragraph.text:
              paragraph.text = paragraph.text.replace(placeholder, value)

  # Handle replacements within tables if needed
  for table in document.tables:
      for row in table.rows:
          for cell in row.cells:
              for paragraph in cell.paragraphs:
                  for placeholder, value in replacements.items():
                      if placeholder in paragraph.text:
                          paragraph.text = paragraph.text.replace(placeholder, value)

  document.save(output_path)
  print("\033[32mSucessfully saved document\033[0m")


parser = argparse.ArgumentParser(description="Create a warrant with existing template.")
parser.add_argument("template", help="Path to folder containing *template* .docx file.")
parser.add_argument("saveDestination", help="Path of save directory.")
parser.add_argument(
    "outputName",
    nargs="?",
    default="Warrant_Output.docx",
    help="Name of the output .docx file (default: Warrant_Output.docx).",
)
parser.add_argument("values", help="Parsed values.")
args = parser.parse_args()


TEMPLATE_PATH = Path(args.template)
if not TEMPLATE_PATH.exists():
  raise SystemExit(f"\033[41mNot a valid folder name or path:\033[0m {TEMPLATE_PATH.resolve()}")

SAVE_PATH = Path(args.saveDestination)
if not SAVE_PATH.is_dir():
  raise SystemExit(f"\033[41mNot a valid save path:\033[0m {SAVE_PATH.resolve()}")

OUTPUT_PATH = Path(SAVE_PATH / args.outputName)

if OUTPUT_PATH.exists():
  raise SystemExit(f"\033[41mFile already exists\033[0m {OUTPUT_PATH.resolve()}")

values = json.loads(args.values)

try: 
  replace_variables_in_doc(TEMPLATE_PATH, OUTPUT_PATH, values)
except Exception as e:
   print(f"\033[31mSomething went wrong: {e}\033[0m")