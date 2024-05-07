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
variations of a single video, targeting videos of different cuts and inserted scenes. This feature addresses a significant
challenge in subtitle editing.

Key features of the application include:
- Spell checking
- Speech timing editing features

Additionally, the focus on user-friendliness and cross-platform compatibility ensures ease of use across common
operating systems.


# Setup
1. Activate node environment:
```bash
  # for linux
  chmod +x ./install/env/env.linux.sh
  source ./install/env/env.linux.sh
  
  # for windows
  ./install/env/env.win.bat
  
  # for mac
  chmod +x ./install/env/env.mac.sh
  source ./install/env/env.mac.sh
```
2. verify installation:
```bash
node --version
```
3. install dependencies:
```bash
npm install
```

## Build for production
- create vue3 build:
```bash
npm run build
cp -r videos/ dist/
```
- start electron:
```bash
npm run electron
```

## Use for Development
```bash
npm run dev
npm run devapp
```
now go to localhost:8081 in web browser and you can use the app

[Please use chrome browser, currently broken styles in firefox]

