# Use a specific Ubuntu base image
FROM ubuntu:20.04

# Set environment variables to avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Update and install necessary packages and dependencies
RUN apt-get update && apt-get install -y \
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
    libenchant-dev \
    && rm -rf /var/lib/apt/lists/*

# Generate and set the en_US.UTF-8 locale
RUN locale-gen en_US.UTF-8 \
    && update-locale LANG=en_US.UTF-8

ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8

# Set the library path
ENV LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH

# Clone the Subtitle Editor repository
RUN git clone https://github.com/kitone/subtitleeditor.git

# Move to the subtitleeditor directory
WORKDIR /subtitleeditor

# Run the install scripts and check for errors
RUN sudo ./autogen.sh && sudo ./configure && sudo make && sudo make install

# Change ENTRYPOINT to an interactive shell
ENTRYPOINT ["/bin/bash"]
