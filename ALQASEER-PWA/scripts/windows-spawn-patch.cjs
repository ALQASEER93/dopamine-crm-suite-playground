const childProcess = require('child_process');
const Module = require('module');
const path = require('path');
const fs = require('fs');
// Force esbuild to use the native Windows binary to avoid EPERM spawns when
// postinstall cannot write the default shim.
const esbuildBinary = path.join(__dirname, '..', 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe');
const esbuildTempDir = path.join(__dirname, '..', '.codex', '_esbuild');
const esbuildTempBinary = path.join(esbuildTempDir, 'esbuild.exe');
if (!process.env.ESBUILD_BINARY_PATH && fs.existsSync(esbuildBinary)) {
  try {
    fs.mkdirSync(esbuildTempDir, { recursive: true });
    const sourceStat = fs.statSync(esbuildBinary);
    const tempStat = fs.existsSync(esbuildTempBinary) ? fs.statSync(esbuildTempBinary) : null;
    if (!tempStat || tempStat.size !== sourceStat.size || tempStat.mtimeMs < sourceStat.mtimeMs) {
      fs.copyFileSync(esbuildBinary, esbuildTempBinary);
    }
    process.env.ESBUILD_BINARY_PATH = esbuildTempBinary;
  } catch (error) {
    process.env.ESBUILD_BINARY_PATH = esbuildBinary;
  }
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
    const isEsbuild =
      args[0] && typeof args[0] === 'string' && args[0].toLowerCase().endsWith('esbuild.exe');
    const lastArgIndex = args.length - 1;
    const hasOptions =
      lastArgIndex >= 0 &&
      args[lastArgIndex] &&
      typeof args[lastArgIndex] === 'object' &&
      !Array.isArray(args[lastArgIndex]);
    const options = normalizeOptions(hasOptions ? args[lastArgIndex] : {});

    if (isEsbuild) {
      if (fs.existsSync(esbuildTempBinary)) {
        args[0] = esbuildTempBinary;
      }
      options.shell = true;
    }

    if (hasOptions) {
      args[lastArgIndex] = options;
    } else {
      args.push(options);
    }
    return original(...args);
  };
}

patchMethod('spawn');
patchMethod('spawnSync');

function wrapEsbuildModule(esbuild) {
  if (!esbuild || esbuild.__dpmSyncWrapped) {
    return esbuild;
  }

  const wrapped = { ...esbuild };
  if (typeof esbuild.buildSync === 'function') {
    wrapped.build = (options) => Promise.resolve(esbuild.buildSync(options));
  }
  if (typeof esbuild.transformSync === 'function') {
    wrapped.transform = (input, options) => Promise.resolve(esbuild.transformSync(input, options));
  }
  if (typeof esbuild.formatMessagesSync === 'function') {
    wrapped.formatMessages = (messages, options) =>
      Promise.resolve(esbuild.formatMessagesSync(messages, options));
  }
  if (typeof esbuild.analyzeMetafileSync === 'function') {
    wrapped.analyzeMetafile = (metafile, options) =>
      Promise.resolve(esbuild.analyzeMetafileSync(metafile, options));
  }
  wrapped.__dpmSyncWrapped = true;
  return wrapped;
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  const exported = originalLoad.call(this, request, parent, isMain);
  if (request === 'esbuild') {
    return wrapEsbuildModule(exported);
  }
  return exported;
};
