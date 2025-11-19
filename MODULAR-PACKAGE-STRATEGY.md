# Modular Architecture Package Strategy

## Core Concept: Load Only What You Need

Instead of one monolithic 140MB package with all architectures, create separate packages per architecture. Users only download what they're working with.

## Package Structure

### Core Package (Required)
**Package**: `@battlewithbytes/clang-core`
**Size**: ~50-60MB compressed
**Contains**:
- Clang compiler frontend
- LLVM optimizer
- Standard libraries (libc, compiler-rt)
- Common tools (ar, nm, objcopy)
- **NO target backends**

### Architecture Packages (On-Demand)
Load these only when user selects a specific platform:

#### ARM Package
**Package**: `@battlewithbytes/clang-arm`
**Size**: ~20-25MB compressed
**Contains**:
- ARM backend (Thumb, Cortex-M, Cortex-A)
- ARM-specific builtins
**Supports**:
- STM32 (all Cortex-M: M0, M0+, M3, M4, M7)
- Arduino ARM (Due, Zero, Nano 33, MKR)
- Teensy 3.x/4.x
- nRF52/nRF53
- Raspberry Pi Pico (RP2040)

#### RISC-V Package
**Package**: `@battlewithbytes/clang-riscv`
**Size**: ~15-20MB compressed
**Contains**:
- RISC-V backend (RV32I, RV32IM, RV32IMC)
- RISC-V builtins
**Supports**:
- ESP32-C3, ESP32-C6, ESP32-H2
- SiFive boards
- RISC-V development boards

#### Xtensa Package (Future)
**Package**: `@battlewithbytes/clang-xtensa`
**Size**: ~18-22MB compressed
**Contains**:
- Xtensa backend (from Espressif fork)
**Supports**:
- ESP32, ESP32-S2, ESP32-S3

#### AVR Package (Optional)
**Package**: `@battlewithbytes/clang-avr`
**Size**: ~12-15MB compressed
**Contains**:
- AVR backend (experimental)
**Supports**:
- Classic Arduino (Uno, Mega, Nano)

## Loading Strategy

### Initial Page Load
```javascript
// User visits /tools/stm32-ide
// Load ONLY core package (60MB)
import { ClangCore } from '@battlewithbytes/clang-core';

const core = new ClangCore();
await core.initialize();  // 60MB download (first time only)

// UI shows: "Select target platform..."
```

### When User Selects Platform
```javascript
// User clicks "STM32" from dropdown
// NOW load ARM backend (20MB)
import { ARMBackend } from '@battlewithbytes/clang-arm';

await core.loadBackend(ARMBackend);  // 20MB download (first time only)

// UI shows: "Compiler ready for STM32!"
// Total downloaded: 80MB (vs 140MB for everything)
```

### Cached After First Load
```javascript
// User returns tomorrow, selects STM32 again
// Already cached! Instant load from IndexedDB
await core.loadBackend(ARMBackend);  // 0 bytes, <100ms

// If they switch to ESP32-C3:
import { RISCVBackend } from '@battlewithbytes/clang-riscv';
await core.loadBackend(RISCVBackend);  // 15MB (first time)
```

## Size Comparison

### Monolithic Approach (Current YoWASP)
```
User Working On: STM32 only
Must Download: Everything (140MB)
Wasted: 60MB of RISC-V, Xtensa, etc. they'll never use
```

### Modular Approach (Our Strategy)
```
User Working On: STM32 only
Must Download: Core (60MB) + ARM (20MB) = 80MB
Savings: 60MB (43% smaller!)
```

### Multi-Platform Developer
```
User Working On: STM32 + ESP32-C3
Monolithic: 140MB (download once)
Modular: 60MB (core) + 20MB (ARM) + 15MB (RISC-V) = 95MB
Savings: 45MB (32% smaller!)
```

### Hobbyist (Single Platform)
```
User Working On: Just STM32
Monolithic: 140MB
Modular: 80MB
Savings: 60MB (43% smaller!)
```

## Implementation Plan

### Phase 1: Build ARM-Only Package (This Week)
```bash
# In yowasp-clang/build.sh:
-DLLVM_TARGETS_TO_BUILD="ARM"

# Package as:
@battlewithbytes/clang-arm

# Size: ~70-80MB compressed (core + ARM together)
```

**Goal**: Get STM32 working ASAP with smallest possible package.

### Phase 2: Split Core + Backends (Next Month)
1. **Build Core Package** (no backends, just LLVM infrastructure)
2. **Build ARM Backend** (separate WASM with just ARM codegen)
3. **Create Loader** that dynamically loads backend WASMs
4. **Test** modular loading in browser

**Challenge**: LLVM wasn't designed for modular WASM loading. Might need:
- Custom linker tricks
- WebAssembly dynamic linking
- Alternative: Just have separate full builds, but share common code via HTTP cache

### Phase 3: Add RISC-V Package (Later)
Build RISC-V variant same way, users can load either/both.

### Phase 4: Add Xtensa (If Demand)
Integrate Espressif's fork as separate package.

## Technical Implementation

### Option A: True Modular WASMs (Complex)
```javascript
// Load core
const coreWasm = await loadWasm('@battlewithbytes/clang-core/clang-core.wasm');

// Dynamically load ARM backend as separate WASM module
const armWasm = await loadWasm('@battlewithbytes/clang-arm/arm-backend.wasm');

// Link them together (WebAssembly dynamic linking)
await linkModules(coreWasm, armWasm);
```

**Pros**: True modularity, minimal duplication
**Cons**: Complex, WebAssembly dynamic linking is experimental

### Option B: Separate Full Builds + Smart Caching (Simpler)
```javascript
// Each package is a complete Clang build with one backend
const clangArm = await loadWasm('@battlewithbytes/clang-arm/clang.wasm');  // 80MB
const clangRiscv = await loadWasm('@battlewithbytes/clang-riscv/clang.wasm');  // 75MB

// BUT: HTTP cache shares common code sections
// Actual download: 80MB + 15MB (only diff) = 95MB vs 155MB
```

**Pros**: Simple, works today, HTTP cache does the magic
**Cons**: Some duplication (but HTTP cache mitigates)

### Option C: Hybrid - Shared Base Package (Recommended)
```javascript
// Base package (compiler frontend, no backends): 60MB
import { ClangBase } from '@battlewithbytes/clang-base';

// Backend packages (just codegen): 20MB each
import { armBackend } from '@battlewithbytes/clang-arm';
import { riscvBackend } from '@battlewithbytes/clang-riscv';

// Base package can work with any backend
const compiler = new ClangBase();
await compiler.loadBackend(armBackend);
```

**Pros**: Best of both worlds, reasonable complexity
**Cons**: Need to build base + backends separately

## Recommended Approach for Phase 1

**Start Simple**: Build complete ARM-only package.

```bash
# yowasp-clang/build.sh
-DLLVM_TARGETS_TO_BUILD="ARM"

# Publish as:
@battlewithbytes/clang-arm@1.0.0

# Size: ~70-80MB compressed
# Supports: STM32, Arduino ARM, Teensy, etc.
```

**Why Start Here**:
1. ✅ Gets STM32 working immediately
2. ✅ Proves the build process works
3. ✅ Smaller than YoWASP (80MB vs 97MB)
4. ✅ Simple - no complex loading logic needed
5. ✅ Can add modularity later without breaking users

## Package Naming Convention

```
@battlewithbytes/clang-arm       → ARM Cortex-M (STM32, etc.)
@battlewithbytes/clang-riscv     → RISC-V (ESP32-C3, etc.)
@battlewithbytes/clang-xtensa    → Xtensa (ESP32 classic)
@battlewithbytes/clang-avr       → AVR (classic Arduino)
@battlewithbytes/clang-all       → Everything (convenience package)
```

## User Experience

### UI Design
```
┌─────────────────────────────────────────┐
│  Select Platform:                       │
│  ○ STM32 (ARM Cortex-M)     [70MB]     │
│  ○ ESP32-C3 (RISC-V)        [75MB]     │
│  ○ ESP32 Classic (Xtensa)   [78MB]     │
│  ○ Arduino (AVR)            [65MB]     │
│                                         │
│  [ Load Compiler ]                      │
└─────────────────────────────────────────┘

After selection:
┌─────────────────────────────────────────┐
│  ⬇️ Downloading STM32 compiler...       │
│  ████████████░░░░░░░  72%  (50MB/70MB) │
│                                         │
│  First time only - cached afterwards!   │
└─────────────────────────────────────────┘
```

## Size Summary Table

| Package | Size (Compressed) | Targets | Use Case |
|---------|------------------|---------|----------|
| `clang-arm` | 70-80MB | ARM Cortex-M | STM32, Arduino ARM, Teensy |
| `clang-riscv` | 65-75MB | RISC-V | ESP32-C3/C6, SiFive |
| `clang-xtensa` | 75-85MB | Xtensa | ESP32, ESP32-S2/S3 |
| `clang-avr` | 60-70MB | AVR | Classic Arduino |
| `clang-all` | 140-150MB | Everything | Power users |

## Next Actions

1. ✅ **Updated build.sh** for ARM-only
2. ⏳ **Test build** on Linux (Docker or GitHub Actions)
3. ⏳ **Package to npm** as `@battlewithbytes/clang-arm`
4. ⏳ **Update YoWaspCompiler** to use new package
5. ⏳ **Document** for users: "70MB one-time download"

Future: Add RISC-V, Xtensa as separate packages when needed.
