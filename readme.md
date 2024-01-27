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

## 📦 Installation

todo!

## 👾 Commands

Run example project **Subtitle Editor** in Docker:
```bash
docker-compose -f subtitleeditor/docker-compose.yaml run --rm subtitleeditor
```
Build the project documentation:
```bash
pdflatex -output-directory=doc doc/projekt.tex
```
Run 1st task calculating the overall energy of a signal:
```bash 
python src/energy.py speech_examples/1-4.mp3
python src/energy.py speech_examples/access-granted.mp3
python src/energy.py speech_examples/countdown-to-fight.mp3
python src/energy.py speech_examples/hey_give_it_back.mp3
```