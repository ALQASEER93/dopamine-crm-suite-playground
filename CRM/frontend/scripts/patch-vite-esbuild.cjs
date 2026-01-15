const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const wasmDir = path.join(rootDir, 'node_modules', 'esbuild-wasm');
const viteEsbuildDir = path.join(rootDir, 'node_modules', 'vite', 'node_modules', 'esbuild');
const mainJs = path.join(viteEsbuildDir, 'lib', 'main.js');
const wrapperTag = 'DPM_ESBUILD_WASM_WRAPPER';

if (!fs.existsSync(wasmDir)) {
  process.exit(0);
}

if (fs.existsSync(mainJs)) {
  const current = fs.readFileSync(mainJs, 'utf8');
  if (current.includes(wrapperTag)) {
    process.exit(0);
  }
}

if (fs.existsSync(viteEsbuildDir)) {
  fs.rmSync(viteEsbuildDir, { recursive: true, force: true });
}

fs.cpSync(wasmDir, viteEsbuildDir, { recursive: true });

const wrapper = `// ${wrapperTag}: force esbuild-wasm browser runtime in Node without spawn.
const fs = require('fs');
const path = require('path');

if (typeof globalThis.self === 'undefined') {
  globalThis.self = globalThis;
}

const esbuild = require('./browser.js');
const backslash = String.fromCharCode(92);

let initPromise;

async function ensureInitialized() {
  if (!initPromise) {
    const wasmPath = path.join(__dirname, '..', 'esbuild.wasm');
    const wasm = fs.readFileSync(wasmPath);
    const wasmModule = await WebAssembly.compile(wasm);
    initPromise = esbuild.initialize({ wasmModule, worker: false });
  }
  return initPromise;
}

function normalizeAbsWorkingDir(options) {
  if (!options || typeof options !== 'object') {
    return options;
  }
  if (typeof options.absWorkingDir === 'string') {
    const value = options.absWorkingDir;
    if (value.length > 2 && value[1] === ':' && (value[2] === backslash || value[2] === '/')) {
      const drive = value[0].toUpperCase();
      const rest = value.slice(3).split(backslash).join('/');
      const normalized = '/' + drive + ':/' + rest;
      return { ...options, absWorkingDir: normalized };
    }
  }
  return options;
}

function normalizeArgs(args) {
  return args.map((arg) => normalizeAbsWorkingDir(arg));
}

function wrapAsync(fn) {
  return async (...args) => {
    await ensureInitialized();
    return fn(...normalizeArgs(args));
  };
}

exports.build = wrapAsync(esbuild.build);
exports.context = wrapAsync(esbuild.context);
exports.transform = wrapAsync(esbuild.transform);
exports.formatMessages = wrapAsync(esbuild.formatMessages);
exports.analyzeMetafile = wrapAsync(esbuild.analyzeMetafile);

exports.buildSync = esbuild.buildSync;
exports.transformSync = esbuild.transformSync;
exports.formatMessagesSync = esbuild.formatMessagesSync;
exports.analyzeMetafileSync = esbuild.analyzeMetafileSync;
exports.initialize = esbuild.initialize;
exports.stop = esbuild.stop;
exports.version = esbuild.version;

exports.default = exports;
`;

fs.mkdirSync(path.dirname(mainJs), { recursive: true });
fs.writeFileSync(mainJs, wrapper, 'utf8');
