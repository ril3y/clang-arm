#!/usr/bin/env node
/**
 * Inspect WASM binary imports
 *
 * Usage: node inspect-wasm-imports.js <path-to-wasm-file>
 */

const fs = require('fs');
const path = require('path');

const wasmFile = process.argv[2] || './llvm-build/bin/llvm';

console.log(`\nInspecting WASM imports from: ${wasmFile}\n`);

async function inspectWasm() {
  try {
    const wasmBuffer = fs.readFileSync(wasmFile);
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    const imports = WebAssembly.Module.imports(wasmModule);

    console.log(`Total imports: ${imports.length}\n`);

    // Group by module
    const byModule = {};
    for (const imp of imports) {
      if (!byModule[imp.module]) {
        byModule[imp.module] = [];
      }
      byModule[imp.module].push(imp);
    }

    // Print grouped imports
    for (const [moduleName, moduleImports] of Object.entries(byModule)) {
      console.log(`\n${moduleName} (${moduleImports.length} imports):`);
      console.log('─'.repeat(60));

      // Sort by name
      moduleImports.sort((a, b) => a.name.localeCompare(b.name));

      for (const imp of moduleImports) {
        console.log(`  ${imp.name.padEnd(40)} ${imp.kind}`);
      }
    }

    // Generate WASI stub code
    if (byModule['wasi_snapshot_preview1']) {
      console.log('\n\n' + '='.repeat(60));
      console.log('WASI FUNCTIONS TO IMPLEMENT:');
      console.log('='.repeat(60));

      const wasiFuncs = byModule['wasi_snapshot_preview1']
        .filter(imp => imp.kind === 'function')
        .map(imp => imp.name)
        .sort();

      console.log('\n');
      for (const funcName of wasiFuncs) {
        console.log(`    ${funcName}: (...args: any[]) => {`);
        console.log(`      console.log('[WASI] ${funcName} called:', args);`);
        console.log(`      return 0; // ENOSYS - not implemented`);
        console.log(`    },\n`);
      }
    }

  } catch (error) {
    console.error('Error inspecting WASM:', error.message);
    process.exit(1);
  }
}

inspectWasm();
