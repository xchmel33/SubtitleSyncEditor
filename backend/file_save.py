import tkinter as tk
from tkinter import filedialog
import sys

root = tk.Tk()
root.withdraw()  # Hide the main window

# Retrieve command-line arguments
default_filename = sys.argv[1] if len(sys.argv) > 1 else 'Untitled'
extensions = sys.argv[2] if len(sys.argv) > 2 else '.txt'

# Parse the extensions and prepare file types for the dialog
extensions_list = extensions.split(',')
file_types = [(f"{ext.strip().upper()} files", f"*{ext.strip()}") for ext in extensions_list]
file_types.append(('All files', '*.*'))

file_path = filedialog.asksaveasfilename(
    initialfile=default_filename,
    defaultextension=extensions_list[0],  # Use the first extension as the default
    filetypes=file_types
)

if file_path:
    print(file_path)
else:
    print("Error: No file selected!")
