const path = require('path');

const DEFAULT_IMPORT_ROOT = path.resolve(process.cwd(), 'data', 'imports');

const resolveImportPath = (inputPath, { allowAbsolute = false } = {}) => {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    throw new Error('filePath is required.');
  }

  const trimmed = inputPath.trim();
  if (path.isAbsolute(trimmed)) {
    if (!allowAbsolute) {
      throw new Error('Absolute import paths are disabled.');
    }
    return path.resolve(trimmed);
  }

  const baseDir = path.resolve(process.env.IMPORT_BASE_DIR || DEFAULT_IMPORT_ROOT);
  const resolved = path.resolve(baseDir, trimmed);
  if (!resolved.startsWith(`${baseDir}${path.sep}`)) {
    throw new Error('Import path escapes the configured base directory.');
  }
  return resolved;
};

module.exports = {
  DEFAULT_IMPORT_ROOT,
  resolveImportPath,
};
