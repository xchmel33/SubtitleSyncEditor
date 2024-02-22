# Subtitle Sync Editor

**Author:** Lukas Chmelo  
**VUT Login:** xchmel33  

**Supervisor:**  Ing. Tomáš Milet, Ph.D.  
 
## Version control

https://github.com/xchmel33/SubtitleSyncEditor

## Description

Bachelors thesis project for the course **BIT** at **FIT VUT** in Brno.

This project is an implementation of a multi-platform tool designed for the simultaneous editing of subtitle files 
across several video versions. The application enables the concurrent creation and editing of subtitles for different 
variations of a single video, accommodating different cuts and inserted scenes. This feature addresses a significant 
challenge in subtitle editing. 

Key features of the application include:
- Spell checking
- Speech timing editing features

Additionally, the focus on user-friendliness and cross-platform compatibility ensures ease of use across common 
operating systems.

## Requirements

- Python 3.10 or higher
- Linux - Ubuntu 22.04 or higher (other distributions untested) || Windows 10 or higher
- TODO: How to install Python 3.10 on Ubuntu 20.04: https://zomro.com/blog/faq/299-kak-ustanovit-python-310-na-ubuntu-2004

## 📦 Installation [development]

### Python 3.10 & pip3
```bash
sudo apt-get update
sudo apt-get install python3.10 pip3
```

## Dependencies
```bash
pip3 install -r requirements.txt
```


## Installer [production]

### For Linux on Windows host
```ps1
./intstall/win-installer.ps1 linux build
```


### Windows
```ps1
./intstall/win-installer.ps1 windows build
```

## 👾 Usage [development]

### Run
```bash
python3 src/app.py
```

## 👾 Usage [build]

### Run [Linux, unstable]
```bash
```bash
./dist/app
```

### Run [Windows, stable]
```ps1
# 1st option
.\dist\app.exe

# 2nd option
./intstall/win-installer.ps1 windows run
```

### TODO
- Better display of audio signal with controls of the timeline
  - replace matplotlib with custom component
  - add zoom
  - add highlights of recognized words 
- Video player
- Multiple videos support
- Upload/parse subtitles from video
- Merging subtitles
- Installer
  - this should be done in the end, when the app is stable, when all dependencies are known and resolved