import sys
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton, QLabel, QFileDialog, QSlider
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
from moviepy.editor import VideoFileClip
import numpy as np
from scipy.io import wavfile


class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.rate = None
        self.data = None
        self.layout = QVBoxLayout()

        self.label = QLabel("Upload a video file to extract and visualize audio")
        self.layout.addWidget(self.label)

        self.btnUpload = QPushButton("Upload Video")
        self.btnUpload.clicked.connect(self.uploadFile)
        self.layout.addWidget(self.btnUpload)

        self.canvas = FigureCanvas(Figure(figsize=(5, 3)))
        self.layout.addWidget(self.canvas)

        self.slider = QSlider()
        self.slider.setOrientation(Qt.Horizontal)
        self.slider.valueChanged.connect(self.onSliderValueChanged)
        self.currentZoomLevel = 1.0
        self.layout.addWidget(self.slider)

        self.setLayout(self.layout)
        self.currentZoomLevel = 1.0
        self.setWindowTitle("Subtitle Sync Editor")

    def onSliderValueChanged(self, value):
        if hasattr(self, 'data') and hasattr(self, 'rate'):
            # Calculate the time range to display
            max_time = len(self.data) / self.rate
            window_size = max_time / self.currentZoomLevel
            start_time = (value / 100) * (max_time - window_size)

            # Update plot
            ax = self.canvas.figure.subplots()
            ax.clear()
            ax.plot(np.arange(start_time, start_time + window_size, 1 / self.rate),
                    self.data[int(start_time * self.rate):int((start_time + window_size) * self.rate)])
            ax.set_xlabel("Time (s)")
            ax.set_ylabel("Amplitude")
            self.canvas.draw()

    def uploadFile(self):
        dialog = QFileDialog(self)
        filename, _ = dialog.getOpenFileName(self, "Open Video", "", "Video Files (*.mp4 *.avi *.mkv)")
        if filename:
            self.label.setText(f"Processing {filename}")
            self.extractAndVisualizeAudio(filename)

    def extractAndVisualizeAudio(self, video_path):
        try:
            video = VideoFileClip(video_path)
            audio = video.audio

            # Get audio data as numpy array
            # audio_data = audio.to_soundarray(fps=44100, nbytes=2)  # Adjust fps and nbytes as needed

            audio_path = "extracted_audio.wav"
            audio.write_audiofile(audio_path, verbose=False, logger=None)

            # Read the audio file
            rate, audio_data = wavfile.read(audio_path)

            # Assuming audio_data is stereo (2 channels), we take only one channel for simplicity
            if audio_data.ndim == 2:
                audio_data = audio_data[:, 0]  # Use the first channel

            # Create a time axis in seconds
            rate = audio.fps  # Audio sampling rate
            time = np.linspace(0, len(audio_data) / rate, num=len(audio_data))

            # Calculate figure width based on audio duration (e.g., 1 second = 0.1 width units)
            duration = len(audio_data) / rate
            fig_width = max(5, duration * 0.1)

            # Create figure and axis for the plot
            self.canvas.figure.set_size_inches(fig_width, 3)
            ax = self.canvas.figure.subplots()
            ax.clear()
            ax.plot(time, audio_data)
            ax.set_xlabel("Time (s)")
            ax.set_ylabel("Amplitude")
            self.canvas.draw()

            self.data = audio_data
            self.rate = rate

        except Exception as e:
            print(e)
            self.label.setText(f"Error: {e}")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = MainWindow()
    win.show()
    sys.exit(app.exec())
