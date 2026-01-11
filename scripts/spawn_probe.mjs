import { spawn, spawnSync } from "node:child_process";

async function runSpawn(label, cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "pipe" });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({ label, cmd, args, error, code: null, stdout, stderr });
    });

    child.on("close", (code, signal) => {
      resolve({ label, cmd, args, error: null, code, signal, stdout, stderr });
    });
  });
}

function runSpawnSync(label, cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "pipe" });
  return {
    label,
    cmd,
    args,
    error: result.error ?? null,
    code: result.status,
    signal: result.signal,
    stdout: result.stdout ? result.stdout.toString() : "",
    stderr: result.stderr ? result.stderr.toString() : "",
  };
}

function printResult(result) {
  console.log(`\n[${result.label}]`);
  console.log(`cmd: ${result.cmd} ${result.args.join(" ")}`);
  console.log(`exitCode: ${result.code === null ? "null" : result.code}`);
  if (result.signal) {
    console.log(`signal: ${result.signal}`);
  }
  if (result.error) {
    console.log(`error: ${result.error.message}`);
  }
  console.log(`stdout: ${result.stdout.trim()}`);
  console.log(`stderr: ${result.stderr.trim()}`);
}

async function main() {
  const results = [];
  results.push(await runSpawn("spawn cmd echo", "cmd.exe", ["/c", "echo", "ok"]));
  results.push(await runSpawn("spawn node -v", process.execPath, ["-v"]));
  results.push(runSpawnSync("spawnSync cmd echo", "cmd.exe", ["/c", "echo", "ok"]));
  results.push(runSpawnSync("spawnSync node -v", process.execPath, ["-v"]));

  let failed = false;
  for (const result of results) {
    printResult(result);
    if (result.error || result.code !== 0) {
      failed = true;
    }
  }

  if (failed) {
    console.error("\nFAIL: spawn probe detected failures.");
    process.exit(1);
  }

  console.log("\nPASS: spawn probe succeeded.");
}

main().catch((error) => {
  console.error(`\nFAIL: unexpected error: ${error.message}`);
  process.exit(1);
});
