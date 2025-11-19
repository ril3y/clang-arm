# Dockerfile for building YoWASP Clang with ARM backend
# Based on Ubuntu 22.04 (matches GitHub Actions environment)

FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    cmake \
    ninja-build \
    ccache \
    python3 \
    python3-pip \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set up ccache for faster rebuilds
ENV PATH="/usr/lib/ccache:${PATH}"
ENV CCACHE_DIR=/build/.ccache

# Create build directory
WORKDIR /build

# Copy build script
COPY build.sh /build/
RUN chmod +x /build/build.sh

# Environment for build - will be overridden by docker-compose
ENV MAKEFLAGS="-j24"
ENV CCACHE_MAXSIZE="10G"

# Labels
LABEL maintainer="battlewithbytes"
LABEL description="YoWASP Clang builder with ARM backend for embedded development"
LABEL version="1.0.0"
LABEL targets="ARM Cortex-M (STM32, Arduino, Teensy, etc.)"

# Default command: run the build
CMD ["/bin/bash", "/build/build.sh"]
