FROM ubuntu:latest
LABEL authors="lukXmelo"

COPY . /subsynceditor


RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    build-essential \
    autoconf \
    automake \
    libtool \
    pkg-config \
    intltool \
    libglib2.0-dev \
    libgtk2.0-dev \
    libxml++2.6-dev \
    libglademm-2.4-dev \
    libgtkmm-2.4-dev \
    libboost-dev \
    libltdl-dev \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-tools \
    libgstreamermm-1.0-dev \
    git \
    libgtkmm-3.0-dev \
    locales \
    && rm -rf /var/lib/apt/lists/*
# Set the working directory
WORKDIR /subsynceditor

# Install PySide6 and PyInstaller
RUN pip3 install -r requirements.txt



