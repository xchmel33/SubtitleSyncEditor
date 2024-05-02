import tkinter as tk
from tkinter import filedialog

root = tk.Tk()
root.withdraw()  # Hide the main window (optional)

file_path = filedialog.askopenfilename()  # Show the file open dialog

if file_path:
    print(file_path)
else:
    print("Error: No file selected!")
