import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".env",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".log",
  ".md",
  ".mjs",
  ".ps1",
  ".py",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const SECRET_PATTERNS = [
  { name: "password assignment", re: /\b(pass(word)?|pwd)\b\s*[:=]\s*["']?[^"'\s]{8,}/i },
  { name: "token assignment", re: /\b(token|secret|api[_-]?key|private[_-]?key)\b\s*[:=]\s*["']?[^"'\s]{12,}/i },
  { name: "cookie/session value", re: /\b(cookie|session|storageState)\b\s*[:=]\s*["']?[^"']{12,}/i },
  { name: "private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "field test provisioning token", re: new RegExp("FIELD" + "_TEST_" + "PROVISION_TOKEN", "i") },
  { name: "known temporary password shape", re: /DPM-(Admin|Rep)-Test-\d{4}-[A-Za-z0-9-]+/ },
];

async function* walk(dir) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

async function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  try {
    const handle = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(512);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    await handle.close();
    return !buffer.subarray(0, bytesRead).includes(0);
  } catch {
    return false;
  }
}

export async function sanitizePath(targetPath, options = {}) {
  const root = path.resolve(targetPath);
  const findings = [];
  const scannedFiles = [];

  for await (const filePath of walk(root)) {
    if (!(await isTextFile(filePath))) continue;
    const rel = path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
    let text = "";
    try {
      text = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }
    scannedFiles.push(rel);
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.re.test(line)) {
          findings.push({
            file: rel,
            line: index + 1,
            type: pattern.name,
            sample: "[redacted]",
          });
        }
      }
    });
  }

  const result = {
    targetPath: root,
    scannedFileCount: scannedFiles.length,
    findingCount: findings.length,
    findings,
    status: findings.length === 0 ? "PASS" : "WARNING",
  };

  if (options.outputJson) {
    await fs.mkdir(path.dirname(options.outputJson), { recursive: true });
    await fs.writeFile(options.outputJson, `${JSON.stringify(result, null, 2)}\n`);
  }

  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const targetPath = process.argv[2] || ".";
  const outputJson = process.argv[3];
  const result = await sanitizePath(targetPath, { outputJson });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.findingCount > 0 ? 2 : 0);
}
