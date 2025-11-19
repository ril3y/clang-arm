# Quick Start: Build YoWASP Clang with ARM Backend

## Prerequisites
- Docker Desktop installed
- Git submodules initialized
- 16GB RAM allocated to Docker
- ~20GB free disk space
- 2-4 hours of build time

## Step 1: Check Submodules

```bash
cd experiments/yowasp-clang

# Make sure submodules are initialized
git submodule update --init --recursive
```

This will download:
- `llvm-src/` - LLVM source (~2GB)
- `wasi-libc-src/` - WASI libc source

## Step 2: Build with Docker Compose

### Option A: One Command Build
```bash
docker-compose up --build
```

This will:
1. Build the Docker image (~5 min)
2. Download WASI SDK (~2 min)
3. Build Clang WASM with ARM backend (~2-4 hours)

### Option B: Interactive Build
```bash
# Build and enter container
docker-compose run --rm builder bash

# Inside container, run build manually:
./build.sh

# Or run specific steps:
# ./build.sh 2>&1 | tee build.log
```

## Step 3: Monitor Progress

The build has these phases:

1. **Download WASI SDK** (2-5 min)
   ```
   Downloading wasi-sdk-27.0...
   ```

2. **Build llvm-tblgen** (10-20 min)
   ```
   cmake -B llvm-tblgen-build...
   Building llvm-tblgen...
   ```

3. **Build Clang WASM** (2-4 hours) ⏰
   ```
   cmake -B llvm-build...
   Building CXX object...
   ```
   Watch for ARM backend references in logs!

4. **Build compiler-rt** (5-10 min)
   ```
   cmake -B compiler-rt-build...
   ```

5. **Build wasi-libc** (3-5 min)
   ```
   make -C wasi-libc-src...
   ```

6. **Build libc++** (20-30 min)
   ```
   cmake -B libcxx-build...
   ```

## Step 4: Check Output

After build completes:

```bash
# Check main executable
ls -lh llvm-build/bin/llvm-driver
# Should be ~30-40MB

# Check libraries
ls -lh wasi-prefix/usr/lib/wasm32-unknown-wasip1/
# Should have: libc.a, libc++.a, libclang_rt.builtins.a
```

## Step 5: Test (Quick)

```bash
# In container or local (if you have node):
node -e "
  const commands = require('@yowasp/clang').commands;
  commands.clang(['--version']).then(() => console.log('Build successful!'));
"
```

## Troubleshooting

### Out of Memory
```bash
# Increase Docker memory in Docker Desktop settings:
# Settings → Resources → Memory → 16GB

# Or reduce parallelism:
export MAKEFLAGS="-j2"
docker-compose up --build
```

### Submodules Not Found
```bash
# Initialize submodules:
git submodule update --init --recursive

# Check status:
git submodule status
```

### Build Fails Mid-Way
```bash
# Clean and restart:
rm -rf llvm-tblgen-build llvm-build compiler-rt-build wasi-libc-build libcxx-build
docker-compose up --build
```

### Docker Network Issues
```bash
# If WASI SDK download fails, retry:
docker-compose down
docker-compose up --build
```

## Next Steps

After successful build:

1. **Compress output**:
   ```bash
   gzip -9 -c llvm-build/bin/llvm-driver > clang-arm.wasm.gz
   ls -lh clang-arm.wasm.gz  # Should be ~25-30MB
   ```

2. **Test locally**:
   ```bash
   # Copy to web app
   cp clang-arm.wasm.gz ../../apps/web/public/compiler/
   ```

3. **Create npm package**:
   - See BUILD.md for npm packaging instructions

## Build Time Expectations

| System | Cores | RAM | Time |
|--------|-------|-----|------|
| Docker Desktop (Windows) | 4 | 16GB | 3-4 hours |
| Docker Desktop (Windows) | 8 | 16GB | 2-3 hours |
| WSL2 | 4 | 16GB | 2-3 hours |
| Native Linux | 8 | 16GB | 1-2 hours |
| GitHub Actions | 2 | 7GB | 5-6 hours |

## Expected Output Size

- `llvm-driver` (WASM): ~35-40MB uncompressed
- `llvm-driver` (gzip): ~28-32MB compressed
- Full package (with libs): ~75-80MB total

## Verify ARM Backend

Check build logs for ARM backend:

```bash
# In logs, look for:
grep -i "ARM" build.log

# Should see:
# LLVM_TARGETS_TO_BUILD="ARM"
# Building ARM backend...
```

## Common Issues

**Issue**: "cmake: command not found"
**Fix**: Docker image not built properly, run `docker-compose build`

**Issue**: "Out of memory"
**Fix**: Increase Docker memory to 16GB in settings

**Issue**: "Submodule 'llvm-src' not found"
**Fix**: Run `git submodule update --init --recursive`

## Success Indicators

✅ Build complete when you see:
```
-- Install the project...
-- Install configuration: "MinSizeRel"
```

✅ Output files exist:
```bash
llvm-build/bin/llvm-driver           # ~35MB
wasi-prefix/usr/lib/wasm32-*/libc.a  # ~3MB
```

✅ Test runs without error:
```bash
# Should print Clang version
file llvm-build/bin/llvm-driver
# Output: "WebAssembly (wasm) binary module version 0x1 (MVP)"
```
