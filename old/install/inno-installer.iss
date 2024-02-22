[Setup]
AppName=My PySide6 App
AppVersion=1.0
DefaultDirName={autopf}\My PySide6 App
DefaultGroupName=My PySide6 App
OutputDir=.
OutputBaseFilename=MyPySide6AppInstaller
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Files]
Source: "dist\hello_world.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\My PySide6 App"; Filename: "{app}\hello_world.exe"
Name: "{commondesktop}\My PySide6 App"; Filename: "{app}\hello_world.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\hello_world.exe"; Description: "Launch My PySide6 App"; Flags: nowait postinstall skipifsilent

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:"
