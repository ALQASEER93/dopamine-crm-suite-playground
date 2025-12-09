const childProcess = require('child_process');

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

