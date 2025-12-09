const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');

// Force esbuild to use the native Windows binary to avoid EPERM spawns when
// postinstall cannot write the default shim.
const esbuildBinary = path.join(__dirname, '..', 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe');
if (!process.env.ESBUILD_BINARY_PATH && fs.existsSync(esbuildBinary)) {
  process.env.ESBUILD_BINARY_PATH = esbuildBinary;
}

// Some Windows environments reject spawning processes when windowsHide=true.
// Normalize to windowsHide=false so esbuild/Vite can start their helper binaries.
function normalizeOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return options;
  }

  if (options.windowsHide === false) {
    return options;
  }

  return { ...options, windowsHide: false };
}

function patchMethod(methodName) {
  const original = childProcess[methodName];

  childProcess[methodName] = (...args) => {
    const lastArgIndex = args.length - 1;
    if (lastArgIndex >= 0) {
      args[lastArgIndex] = normalizeOptions(args[lastArgIndex]);
    }
    return original(...args);
  };
}

patchMethod('spawn');
patchMethod('spawnSync');
