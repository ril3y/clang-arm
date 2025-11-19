# Custom YoWASP Build Plan for Embedded Development

## Your Question: Can we slim features and add STM32/ESP32/Arduino support?

**Short Answer**: YES! YoWASP is already highly optimized, but we can customize it for our specific needs.

## Target Architectures Analysis

### What We Need:

1. **STM32 (ARM Cortex-M)**
   - Target: `thumbv7m-none-eabi` (Cortex-M3, M4, M7)
   - Target: `thumbv6m-none-eabi` (Cortex-M0, M0+)
   - Backend: **ARM** ✅ (already in our modified build.sh)

2. **ESP32 (Xtensa)**
   - Target: `xtensa-esp32-elf`
   - Backend: **Xtensa** ❌ (NOT in LLVM by default)
   - **Problem**: Espressif maintains a fork of LLVM with Xtensa backend
   - **Alternative**: Use Espressif's esp-clang or keep using xtensa-gcc

3. **ESP32-C3/C6/H2 (RISC-V)**
   - Target: `riscv32imc-unknown-none-elf`
   - Backend: **RISCV** ✅ (available in LLVM)

4. **Arduino (AVR)**
   - Target: `avr`
   - Backend: **AVR** ⚠️ (deprecated in LLVM, experimental support)
   - **Better alternative**: Modern Arduino boards use ARM (ARM Cortex-M0+)

## Recommended Build Configuration

### Targets to Include:
```bash
-DLLVM_TARGETS_TO_BUILD="ARM;RISCV"
```

This gives us:
- ✅ **ARM**: All STM32, Arduino Due, Teensy, nRF52, etc.
- ✅ **RISC-V**: ESP32-C3/C6, SiFive, etc.
- ❌ **WebAssembly**: REMOVE (we don't need to compile *for* WASM, only *to* WASM)
- ❌ **Xtensa**: Not available without Espressif's fork
- ❌ **AVR**: Deprecated, most Arduino boards are ARM now

### Size Impact:

| Configuration | Estimated Size | What It Supports |
|---------------|----------------|------------------|
| Current YoWASP (WASM-only) | 97MB | WebAssembly compilation only |
| YoWASP + ARM | ~120MB | + STM32, Arduino (ARM), Teensy, nRF52 |
| ARM + RISC-V | ~105MB | STM32 + ESP32-C3/C6 (no WASM demos) |
| ARM + RISC-V + WASM | ~140MB | Everything except Xtensa ESP32 |

## What YoWASP Already Optimizes (That We Keep):

Looking at the build script, they've already disabled tons of stuff:

### ✅ Already Disabled (Good):
- Static analyzer (saves ~10MB)
- ARC migration tools
- Clang tooling (clang-tidy, etc)
- Most llvm-* utilities (they keep only essentials)
- Tests, examples, benchmarks
- Documentation
- Shared libraries (static only)
- Threading (not needed in WASM)
- PIC (position-independent code)

### ✅ They Keep (We Need):
- clang, clang++ compilers
- lld linker
- llvm-ar, llvm-nm, llvm-objcopy, llvm-objdump, llvm-size
- compiler-rt (builtins)
- libc++ (C++ standard library)
- wasi-libc (WASI syscalls)

## What We Can Further Optimize:

### Option 1: Remove WebAssembly Backend (Save ~15-20MB)
```bash
-DLLVM_TARGETS_TO_BUILD="ARM;RISCV"  # No WebAssembly
```
**Trade-off**: Can't demo WASM compilation, but focused on embedded use

### Option 2: Remove C++ Support (Save ~25MB)
```bash
-DLLVM_ENABLE_PROJECTS="clang;lld"  # Keep only clang, remove libcxx build
-DCLANG_LINKS_TO_CREATE="clang"     # Remove clang++ symlink
```
Skip libcxx/libcxxabi build (lines 254-280)
**Trade-off**: C-only, no C++ (most embedded code is C anyway)

### Option 3: Minimal Toolchain (Save ~30MB)
Disable these LLVM tools (they set to ON, we set to OFF):
```bash
-DLLVM_TOOL_LLVM_AR_BUILD=OFF
-DLLVM_TOOL_LLVM_OBJCOPY_BUILD=OFF
-DLLVM_TOOL_LLVM_OBJDUMP_BUILD=OFF
-DLLVM_TOOL_LLVM_SIZE_BUILD=OFF
-DLLVM_TOOL_LLVM_NM_BUILD=OFF
```
**Trade-off**: No binary inspection tools (but we can add them back if needed)

### Option 4: Disable Assertions (Save ~5-10MB, gain speed)
```bash
-DLLVM_ENABLE_ASSERTIONS=OFF  # Currently ON
```
**Trade-off**: Less debugging info if compiler crashes

## Recommended "BattleWithBytes Embedded Toolchain" Build

### Configuration:
```bash
# Targets: ARM (STM32) + RISC-V (ESP32-C3)
-DLLVM_TARGETS_TO_BUILD="ARM;RISCV"

# Keep C++ support (many modern embedded projects use it)
-DLLVM_ENABLE_PROJECTS="clang;lld"

# Keep essential tools for debugging
-DLLVM_TOOL_LLVM_AR_BUILD=ON
-DLLVM_TOOL_LLVM_OBJCOPY_BUILD=ON
-DLLVM_TOOL_LLVM_OBJDUMP_BUILD=ON
-DLLVM_TOOL_LLVM_SIZE_BUILD=ON

# Disable assertions for smaller size + speed
-DLLVM_ENABLE_ASSERTIONS=OFF

# Keep LTO for size optimization
-flto -Wl,--strip-all
```

### Expected Results:
- **Size**: 90-110MB uncompressed (~28-35MB gzip)
- **Supports**:
  - ✅ STM32 (all Cortex-M variants)
  - ✅ Arduino (ARM-based: Due, Zero, MKR, Nano 33)
  - ✅ Teensy 3.x/4.x
  - ✅ nRF52, nRF53
  - ✅ ESP32-C3, ESP32-C6, ESP32-H2 (RISC-V variants)
  - ✅ Raspberry Pi Pico (RP2040 - ARM Cortex-M0+)
  - ❌ ESP32, ESP32-S2, ESP32-S3 (Xtensa - need Espressif fork)
  - ❌ Old Arduino (AVR - use avr-gcc instead)

## ESP32 (Classic Xtensa) Strategy

Since Xtensa isn't in upstream LLVM, we have options:

### Option A: Use Espressif's LLVM Fork
- Clone https://github.com/espressif/llvm-project
- They maintain Xtensa backend
- **Problem**: Separate build, different codebase

### Option B: Server-Side Compilation for ESP32
- Keep esp-idf toolchain on server
- Client sends code → server compiles → client gets binary
- **Benefit**: Official Espressif toolchain, always up-to-date

### Option C: Hybrid Approach (Recommended)
- Use our custom YoWASP for STM32, ESP32-C3, Arduino (ARM)
- Add "ESP32 Classic: coming soon" message
- Later: Add server-side ESP32 compilation or integrate Espressif fork

## Modified build.sh Changes

### Line 78 (native build):
```bash
-DLLVM_TARGETS_TO_BUILD="ARM;RISCV" \
```

### Line 107 (WASM build):
```bash
-DLLVM_TARGETS_TO_BUILD="ARM;RISCV" \
```

### Line 93 (optional - disable assertions):
```bash
-DLLVM_ENABLE_ASSERTIONS=OFF \
```

## Build Size Comparison

| Configuration | Uncompressed | Compressed (gzip) | Supported Platforms |
|---------------|--------------|-------------------|---------------------|
| YoWASP Original | 97MB | 31MB | WASM only |
| + ARM only | 110MB | 35MB | STM32, Arduino (ARM) |
| + ARM + RISC-V | 105MB | 33MB | + ESP32-C3/C6 |
| + ARM + RISC-V + WASM | 140MB | 45MB | All three |
| ARM + RISC-V (no C++) | 80MB | 26MB | C-only embedded |

## Summary Recommendation

### Build This:
```bash
TARGETS: ARM + RISC-V (no WebAssembly)
SIZE: ~105MB (~33MB gzip)
SUPPORTS: 90% of embedded development needs
```

### Why This Configuration?
1. **STM32** is your primary focus → ARM backend required
2. **ESP32-C3/C6** (RISC-V) are growing in popularity → future-proof
3. **Remove WebAssembly** → You're compiling embedded code, not WASM demos
4. **Keep C++** → Modern embedded development uses C++ (Arduino, mbed, Zephyr)
5. **Keep essential tools** → objdump, size, objcopy needed for debugging

### What About ESP32 Classic?
- Add later via Espressif LLVM fork OR server-side compilation
- Most new ESP32 projects use C3/C6 anyway (better, cheaper, RISC-V)

## Next Steps

1. **Test**: Use current YoWASP to validate browser integration
2. **Fork**: Create `@battlewithbytes/embedded-clang` with ARM + RISC-V
3. **Build**: Set up GitHub Actions for automated Linux builds
4. **Deploy**: Publish to npm, update web app
5. **Iterate**: Add ESP32 Xtensa support later if demand is high

This gives you a **focused, optimized embedded compiler** at ~33MB compressed vs YoWASP's 31MB, but supporting real embedded targets instead of just WASM!
