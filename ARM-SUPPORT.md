# Adding ARM Support to YoWASP Clang

## Summary

YoWASP provides an excellent, maintained LLVM/Clang WebAssembly build that:
- ✅ Automatically downloads and caches WASM (~97MB)
- ✅ Provides clean npm API via `@yowasp/clang`
- ✅ Actively maintained (version 21.1.4 as of Jan 2025)
- ❌ Only includes WebAssembly backend (not ARM)

## Changes Required

Modified `build.sh` to add ARM backend support by changing:

```bash
-DLLVM_TARGETS_TO_BUILD=WebAssembly
```

To:

```bash
-DLLVM_TARGETS_TO_BUILD="WebAssembly;ARM"
```

This change appears in 2 locations:
- Line 78: Native build for tblgen tools
- Line 107: WASM build for the compiler itself

## Build Process

### Requirements
- Linux (Ubuntu recommended) - x86_64 only
- Docker alternative available
- Build time: ~2-4 hours
- Output size: ~97MB WASM (current), likely ~120-150MB with ARM backend

### Steps

1. **Clone with submodules**:
   ```bash
   git clone --recurse-submodules https://github.com/YoWASP/clang.git
   cd clang
   ```

2. **Apply ARM support patch**:
   - Modify `build.sh` as shown above

3. **Build**:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

4. **Package for npm**:
   ```bash
   ./package-npmjs.sh
   ```

## Integration Options

### Option A: Fork and Build (Long-term)
1. Fork YoWASP/clang to battlewithbytes organization
2. Apply ARM backend patch
3. Set up GitHub Actions to auto-build
4. Publish to npm as `@battlewithbytes/yowasp-clang-arm`
5. Update web app to use custom package

**Pros**: Complete control, can add other architectures later
**Cons**: 2-4 hour builds, maintenance burden, need Linux CI

### Option B: Use Current YoWASP + Server-side ARM Compilation (Pragmatic)
1. Keep `@yowasp/clang` for WebAssembly target demos
2. Add optional server-side ARM compilation endpoint
3. Use official arm-none-eabi-gcc via Docker API

**Pros**: Fast to implement, no build maintenance, official toolchain
**Cons**: Requires server, not pure client-side

### Option C: Hybrid Approach (Recommended)
1. **Phase 1** (this week): Integrate current `@yowasp/clang`
   - Get compiler UI working with WebAssembly target
   - Prove the architecture with working code
2. **Phase 2** (next month): Fork and add ARM backend
   - Set up proper build pipeline
   - Test extensively before deploying
3. **Phase 3** (later): Add other architectures (RISC-V, x86, etc.)

## Current Status

- ✅ YoWASP Clang installed and tested
- ✅ Package version 21.1.4-3 working
- ✅ API confirmed: `runClang(['clang', ...args])`
- ✅ Build script modified for ARM support
- ⏳ Need to integrate into STM32 IDE UI
- ⏳ Need to build custom WASM with ARM backend

## Next Steps

1. **Immediate**: Adapt ClangWasmLoader to use `@yowasp/clang` npm API
2. **Test**: Compile simple programs with current package
3. **Decide**: Choose integration option (A, B, or C)
4. **Execute**: Based on decision above

## Size Estimates

| Package | Size Compressed | Size Uncompressed |
|---------|----------------|-------------------|
| Current YoWASP (WASM-only) | 31MB (gzip) | 97MB |
| With ARM backend (estimate) | 38-45MB (gzip) | 120-150MB |
| Our failed Clang build | 14MB (gzip) | 40MB |

Note: YoWASP includes more complete tooling (LLD linker, compiler-rt, libc++), explaining larger size.

## References

- YoWASP GitHub: https://github.com/YoWASP/clang
- npm package: https://www.npmjs.com/package/@yowasp/clang
- Build script: experiments/yowasp-clang/build.sh (modified)
