# Building @battlewithbytes/clang-arm

This document describes how to build the ARM-enabled Clang WASM compiler.

## Requirements

- **Platform**: Linux x86_64 (Ubuntu recommended)
- **Time**: 2-4 hours
- **Disk Space**: ~15-20GB
- **Memory**: 8GB minimum (16GB recommended)
- **Dependencies**: curl, git, cmake, ninja-build, python3

## Build Options

### Option 1: GitHub Actions (Recommended)
Use GitHub Actions for automated builds - no local Linux needed!

**Pros**: No local setup, free for public repos, reproducible
**Cons**: 6-hour timeout limit, need GitHub account

### Option 2: Docker on Windows
Build inside a Docker container on Windows.

**Pros**: Works on Windows, isolated environment
**Cons**: Requires Docker Desktop (WSL2), slower on Windows

### Option 3: WSL2 on Windows
Build directly in Windows Subsystem for Linux.

**Pros**: Native Linux performance, integrated with Windows
**Cons**: Requires WSL2 setup, uses Windows disk space

### Option 4: Native Linux
If you have a Linux machine.

**Pros**: Fastest, most control
**Cons**: Need Linux machine

## Quick Start (GitHub Actions)

1. **Push to GitHub** (when ready):
   ```bash
   # Create new repo on GitHub: battlewithbytes/clang-arm
   git remote add origin https://github.com/battlewithbytes/clang-arm.git
   git push -u origin develop
   ```

2. **Create workflow**: `.github/workflows/build.yml`
   ```yaml
   name: Build Clang ARM
   on:
     push:
       branches: [develop, main]
     workflow_dispatch:

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
           with:
             submodules: recursive

         - name: Install dependencies
           run: |
             sudo apt-get update
             sudo apt-get install -y cmake ninja-build ccache

         - name: Build
           run: |
             chmod +x build.sh
             ./build.sh

         - name: Upload artifact
           uses: actions/upload-artifact@v4
           with:
             name: clang-arm-wasm
             path: llvm-build/bin/*
   ```

3. **Trigger build**: Push or use "Run workflow" button

## Manual Build (Docker on Windows)

### 1. Create Dockerfile
```dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    curl \
    git \
    cmake \
    ninja-build \
    ccache \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
```

### 2. Build in Docker
```bash
# From experiments/yowasp-clang directory
docker build -t clang-arm-builder .

docker run -it -v ${PWD}:/build clang-arm-builder bash

# Inside container:
cd /build
chmod +x build.sh
./build.sh
```

### 3. Get artifacts
Built files will be in `llvm-build/bin/` and `wasi-prefix/`

## Manual Build (WSL2 on Windows)

### 1. Install WSL2 with Ubuntu
```powershell
# In PowerShell (Admin):
wsl --install -d Ubuntu-22.04
```

### 2. Install dependencies in WSL
```bash
# In WSL Ubuntu terminal:
sudo apt update
sudo apt install -y curl git cmake ninja-build ccache python3 build-essential
```

### 3. Navigate and build
```bash
cd /mnt/x/bwb2/battlewithbytes.io/experiments/yowasp-clang
chmod +x build.sh
./build.sh
```

## Build Process Details

The `build.sh` script does:

1. **Download WASI SDK** (~500MB)
   - Downloads wasi-sdk-27.0 from GitHub releases
   - Provides WebAssembly cross-compilation tools

2. **Build llvm-tblgen** (Host tools, ~15 min)
   - Native x86_64 Linux tools for code generation
   - Required to build the actual WASM compiler

3. **Build LLVM/Clang for WASM** (~2-4 hours)
   - Compiles Clang to run AS WebAssembly
   - Includes ARM backend for target compilation
   - Optimization: MinSizeRel + LTO (-Os + -flto)

4. **Build compiler-rt** (~10 min)
   - Runtime builtins for compiled code

5. **Build wasi-libc** (~5 min)
   - C standard library for WASI

6. **Build libc++** (~30 min)
   - C++ standard library

## Output Files

After build completes (2-4 hours), you'll have:

```
llvm-build/bin/
  └── llvm-driver         # Main executable (30-40MB)

wasi-prefix/usr/
  ├── include/            # Headers
  └── lib/
      └── wasm32-unknown-wasip1/
          ├── libclang_rt.builtins.a
          ├── libc.a
          ├── libc++.a
          └── libc++abi.a
```

## Packaging for npm

After build:

1. **Compress WASM**:
   ```bash
   gzip -9 -c llvm-build/bin/llvm-driver > clang.wasm.gz
   ```

2. **Create npm package** (copy files):
   ```bash
   mkdir -p npm-package/dist
   cp clang.wasm.gz npm-package/dist/
   cp -r wasi-prefix/usr npm-package/dist/
   ```

3. **Add package.json**:
   ```json
   {
     "name": "@battlewithbytes/clang-arm",
     "version": "1.0.0",
     "description": "LLVM/Clang for ARM embedded development (WebAssembly)",
     "main": "lib/index.js",
     "files": ["dist/", "lib/"],
     "license": "Apache-2.0"
   }
   ```

4. **Publish**:
   ```bash
   npm publish --access public
   ```

## Build Customization

### Change Target Backend

Edit `build.sh` lines 78 and 107:

```bash
# ARM only (current):
-DLLVM_TARGETS_TO_BUILD="ARM"

# Add RISC-V:
-DLLVM_TARGETS_TO_BUILD="ARM;RISCV"

# Multiple targets:
-DLLVM_TARGETS_TO_BUILD="ARM;RISCV;WebAssembly"
```

### Optimization Levels

Currently using `MinSizeRel` (line 92):
```bash
-DCMAKE_BUILD_TYPE=MinSizeRel   # -Os optimization
```

Options:
- `Release` - Maximum speed, larger size
- `MinSizeRel` - Smaller size (current)
- `Debug` - No optimization, debug info

### Disable Assertions

Line 93 to reduce size:
```bash
-DLLVM_ENABLE_ASSERTIONS=OFF   # Currently ON
```
Saves ~5-10MB but less debugging info.

## Troubleshooting

### Out of Memory
```bash
# Reduce parallelism:
cmake --build llvm-build --target llvm-driver -j2
```

### Timeout (GitHub Actions)
- Split build into stages
- Use ccache to cache intermediate files
- Consider self-hosted runner

### Build Fails
```bash
# Clean and retry:
rm -rf llvm-tblgen-build llvm-build compiler-rt-build wasi-libc-build libcxx-build
./build.sh
```

## Estimated Sizes

| Component | Build Size | Final Size (gzip) |
|-----------|-----------|------------------|
| LLVM/Clang (ARM) | ~500MB | ~30MB |
| compiler-rt | ~50MB | ~5MB |
| wasi-libc | ~20MB | ~3MB |
| libc++ | ~100MB | ~8MB |
| **Total** | ~670MB | **~75MB** |

## Next Steps

After successful build:
1. Test locally with Node.js
2. Create npm package structure
3. Publish to npm
4. Update web app to use new package

## Current Status

- ✅ Build configuration modified for ARM
- ✅ Documentation created
- ⏳ Awaiting build execution
- ⏳ Need to test output
- ⏳ Need to package for npm

## Build Time Expectations

| Machine | Time |
|---------|------|
| GitHub Actions (2 cores) | 4-6 hours |
| WSL2 (4 cores) | 2-3 hours |
| Linux Desktop (8 cores) | 1-2 hours |
| Linux Workstation (16+ cores) | 30-60 min |
