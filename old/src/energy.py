import argparse
import os
import librosa
import numpy as np
import matplotlib.pyplot as plt
import ffmpeg


# supports mp3, wav
def load_audio(filename):
    if filename.endswith(".wav"):
        return librosa.load(filename, sr=None)
    tmp = 'temp.wav'
    stream = ffmpeg.input(filename)
    stream = ffmpeg.output(stream, tmp)
    ffmpeg.run(stream, quiet=True, overwrite_output=True)
    return librosa.load(filename, sr=None)


def visualize_audio(signal):
    plt.figure(figsize=(12, 4))
    plt.plot(signal)
    plt.title("Audio Signal")
    plt.ylabel("Amplitude (unitless)")
    plt.xlabel("Sample")
    plt.show()


# loudness / intensity of the signal
# sum of squares of the signal divided by the length of the signal
def calculate_energy(signal):
    return np.sum(signal**2) / len(signal)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process and visualize an audio signal.')
    parser.add_argument('filename', type=str, help='Path to the audio file')

    args = parser.parse_args()

    audio, sample_rate = load_audio(args.filename)
    visualize_audio(audio)
    energy = calculate_energy(audio)
    print(f"Energy of the audio signal (Unitless): {energy:.4f}")

    # clean up
    if os.path.exists('temp.wav'):
        os.remove('temp.wav')
