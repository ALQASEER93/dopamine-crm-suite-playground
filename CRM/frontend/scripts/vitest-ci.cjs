#!/usr/bin/env node
const { spawnSync } = require('child_process');

process.env.NODE_ENV = 'test';

const result = spawnSync(
  process.execPath,
  ['-r', './scripts/windows-spawn-patch.cjs', './node_modules/vitest/vitest.mjs', 'run', '--watch=false'],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
