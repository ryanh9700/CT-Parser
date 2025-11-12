# Ackerman Warrant Builder

### Beforehand:
#### 1. Installing Python
Ensure latest 3.xx version of Python is installed. It can be installed in two ways:
* Python can be downloaded on their [webpage](https://www.python.org/downloads/).
* Since some computers may not allow running downloaded files, it will work through downloading through Microsoft Store. Open MS Store, search "Python" and download the latest release.

Once installed, ensure it's properly working by opening the terminal (Mac) or Command Prompt (Windows) and typing ```python --version```. If this doesn't work, try ```python3 --version```.

#### 2. Installing Visual Studio Code (Optional)
Visual Studio Code (aka VS Code) is an easy way to edit programs. It's not required, but makes running everything easier. It can be installed in two ways:
* VS Code can be downloaded on their [webpage](https://code.visualstudio.com/).
* Since some computers may not allow running downloaded files, it will work through downloading through Microsoft Store. Open MS Store, search "Visual Studio Code" and download the app.

#### 3. Installing Libraries
This uses a libraries to parse PDF files. This needs to be installed by:
* If VS Code is installed, open it and at the top left click "File" then "Open Folder..." and open "CT-Reader". Then at the top click "Terminal" then "New Terminal".
* Otherwise, use the terminal to navigate to "CT-Reader".  

Once inside the folder and in the terminal, type:  
```pip install pdfplumber```  
```pip install pgeocode```

#### 4. Templates
Ensure the "summary_templates.txt" file exists inside the "templates" folder and has the correct text.

### How to Run
1. Download the PDFs of all CyberTips and place them into a folder (ideally grouped by ESP name).
1. Move folder into "CT-Reader/documents".
1. Inside VS Code terminal or the terminal, type ```python src/parse.py documents/[folder name]```
1. Results will print output to console, missing items (such as location) will be "NONE" and colored red.
