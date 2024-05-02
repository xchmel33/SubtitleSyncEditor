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
- install nvm:
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    ```
- restart your terminal

- install node and npm:
    ```bash
    nvm install v20.10.0
    ```
- use installed node version:
    ```bash
    nvm use v20.10.0
    ```
- verify installation:
    ```bash
    node --version
    ```
- install dependencies:
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
now go to localhost:8080 in web browser and you can use the app
