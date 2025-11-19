# @battlewithbytes/clang-arm

**LLVM/Clang WebAssembly Compiler for ARM Embedded Development**

Compile C/C++ code for ARM Cortex-M microcontrollers directly in your browser. No installation, no toolchain setup - just load and compile!

## What This Is

A WebAssembly-compiled version of LLVM/Clang 21.x optimized specifically for ARM embedded development. Based on [YoWASP](https://yowasp.org/), customized for embedded developers.

## Supported Platforms

- ✅ **STM32** (all Cortex-M variants: M0, M0+, M3, M4, M7, M33)
- ✅ **Arduino ARM** (Due, Zero, Nano 33 IoT, Nano 33 BLE, MKR series)
- ✅ **Teensy 3.x/4.x** (Cortex-M4/M7)
- ✅ **nRF52/nRF53** (Nordic Semiconductor)
- ✅ **Raspberry Pi Pico** (RP2040 - Cortex-M0+)
- ✅ **Any ARM Cortex-M/A/R** device

## Installation

```bash
npm install @battlewithbytes/clang-arm
```

## Usage

```javascript
import { commands } from '@battlewithbytes/clang-arm';

// Compile C code for STM32F4 (Cortex-M4)
const result = await commands.clang([
  '-target', 'thumbv7em-none-eabi',  // Cortex-M4
  '-mcpu=cortex-m4',
  '-mthumb',
  '-O2',
  '-c',
  '-o', 'output.o',
  'main.c'
], {
  'main.c': `
    #include <stdint.h>

    void delay(uint32_t ms) {
      for (volatile uint32_t i = 0; i < ms * 1000; i++);
    }

    int main(void) {
      while (1) {
        delay(1000);
      }
    }
  `
});

// result contains the compiled object file
const objectFile = result['output.o'];
```

## Target Triples

| Platform | Target Triple | CPU |
|----------|--------------|-----|
| STM32F0/L0 (Cortex-M0) | `thumbv6m-none-eabi` | `cortex-m0` |
| STM32F1 (Cortex-M3) | `thumbv7m-none-eabi` | `cortex-m3` |
| STM32F3/F4/L4 (Cortex-M4) | `thumbv7em-none-eabi` | `cortex-m4` |
| STM32F7/H7 (Cortex-M7) | `thumbv7em-none-eabi` | `cortex-m7` |
| STM32L5/U5 (Cortex-M33) | `thumbv8m.main-none-eabi` | `cortex-m33` |

## Common Flags

```bash
# Cortex-M4 with FPU
-target thumbv7em-none-eabihf -mcpu=cortex-m4 -mfpu=fpv4-sp-d16 -mfloat-abi=hard

# Cortex-M4 without FPU
-target thumbv7em-none-eabi -mcpu=cortex-m4 -mfloat-abi=soft

# Cortex-M0+ (RP2040, Arduino Zero)
-target thumbv6m-none-eabi -mcpu=cortex-m0plus

# Size optimization
-Os -ffunction-sections -fdata-sections

# Link-time optimization
-flto
```

## Size

- **First Download**: ~70-80MB (one-time, cached in browser)
- **Subsequent Loads**: Instant (loads from cache)

## Comparison

| Package | Size | Targets | Notes |
|---------|------|---------|-------|
| YoWASP Clang | 97MB | WebAssembly only | Not for embedded |
| GCC ARM Embedded | ~200MB | ARM | Requires install |
| **This Package** | **~75MB** | **ARM only** | **Browser-based** |

## Features

- ✅ Full C11/C++17 support
- ✅ ARM CMSIS support
- ✅ Inline assembly
- ✅ Hardware floating-point
- ✅ Link-time optimization (LTO)
- ✅ Size optimization (-Os, -Oz)
- ✅ Linker (LLD) included
- ✅ Binary utilities (objcopy, objdump, size)

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 89+
- Safari 15+

Requires WebAssembly support and ~150MB available memory.

## Example: STM32 Blink

```javascript
import { commands } from '@battlewithbytes/clang-arm';

const code = `
#include <stdint.h>

#define RCC_AHB1ENR   (*(volatile uint32_t*)0x40023830)
#define GPIOD_MODER   (*(volatile uint32_t*)0x40020C00)
#define GPIOD_ODR     (*(volatile uint32_t*)0x40020C14)

void delay(uint32_t ms) {
  for (volatile uint32_t i = 0; i < ms * 8000; i++);
}

int main(void) {
  // Enable GPIOD clock
  RCC_AHB1ENR |= (1 << 3);

  // Set PD12 as output (LED on STM32F4-Discovery)
  GPIOD_MODER |= (1 << 24);

  while (1) {
    GPIOD_ODR ^= (1 << 12);  // Toggle LED
    delay(500);
  }
}
`;

const result = await commands.clang([
  '-target', 'thumbv7em-none-eabihf',
  '-mcpu=cortex-m4',
  '-mfpu=fpv4-sp-d16',
  '-mfloat-abi=hard',
  '-nostdlib',
  '-O2',
  '-c',
  '-o', 'blink.o',
  'blink.c'
], {
  'blink.c': code
});

console.log('Compiled!', result['blink.o']);
```

## What's NOT Included

- ❌ **Standard libraries** - Use newlib-nano or build your own
- ❌ **Startup code** - Provide your own startup_stm32xxx.s
- ❌ **Linker scripts** - Use STM32CubeMX or reference examples
- ❌ **RISC-V, Xtensa, AVR** - Use separate packages

For complete projects, you'll need:
1. This compiler (clang)
2. Standard library (newlib-nano)
3. Startup code (.s file)
4. Linker script (.ld file)
5. Device headers (CMSIS)

## Building from Source

```bash
git clone --recurse-submodules https://github.com/battlewithbytes/clang-arm
cd clang-arm
./build.sh  # Requires Linux, 2-4 hours
```

See `BUILDING.md` for details.

## License

This package is Apache-2.0 licensed (same as LLVM/Clang).

Original YoWASP work by [@whitequark](https://github.com/whitequark).

## Related Packages

- `@battlewithbytes/clang-riscv` - RISC-V (ESP32-C3/C6)
- `@battlewithbytes/clang-xtensa` - Xtensa (ESP32 classic)
- `@battlewithbytes/clang-all` - All architectures

## Support

- Issues: https://github.com/battlewithbytes/clang-arm/issues
- Docs: https://battlewithbytes.io/tools/stm32-ide
- Website: https://battlewithbytes.io

## Credits

- LLVM/Clang: LLVM Foundation
- YoWASP: @whitequark
- Embedded optimizations: BattleWithBytes team
