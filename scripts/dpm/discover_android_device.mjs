import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const runDir = path.resolve(repoRoot, process.argv[2] || "");

if (!runDir || !runDir.startsWith(path.join(repoRoot, "docs", "_runs"))) {
  throw new Error("Run directory must be under docs/_runs.");
}

const jsonDir = path.join(runDir, "json");
const artifactsDir = path.join(runDir, "artifacts");

function run(command, args = []) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      shell: process.platform === "win32",
      windowsHide: true,
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", (error) => resolve({ exitCode: 127, output: `${output}\n${error.message}` }));
    child.on("close", (exitCode) => resolve({ exitCode, output }));
  });
}

function parseDevices(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices"))
    .map((line) => {
      const [serial, state, ...details] = line.split(/\s+/);
      return { serial, state, details: details.join(" ") };
    });
}

async function main() {
  await fs.mkdir(jsonDir, { recursive: true });
  await fs.mkdir(artifactsDir, { recursive: true });

  const locator = process.platform === "win32" ? await run("where", ["adb"]) : await run("which", ["adb"]);
  const adbPath = locator.exitCode === 0 ? locator.output.split(/\r?\n/).find(Boolean)?.trim() || "adb" : null;
  const discovery = {
    generatedAt: new Date().toISOString(),
    status: "ADB_NOT_FOUND",
    adbAvailable: Boolean(adbPath),
    adbPath: adbPath || "unavailable",
    version: null,
    devices: [],
    deviceType: "none",
    ownerAction: "Install Android Platform Tools, enable USB debugging, connect a QA Android device, accept the RSA prompt, then rerun DPM Review Bridge.",
  };

  if (adbPath) {
    const version = await run(adbPath, ["version"]);
    discovery.version = version.output.trim();
    const devicesResult = await run(adbPath, ["devices", "-l"]);
    discovery.devices = parseDevices(devicesResult.output);
    const connected = discovery.devices.find((device) => device.state === "device");
    const unauthorized = discovery.devices.find((device) => device.state === "unauthorized");
    if (connected) {
      discovery.status = connected.serial.startsWith("emulator-") ? "EMULATOR_CONNECTED" : "DEVICE_CONNECTED";
      discovery.deviceType = connected.serial.startsWith("emulator-") ? "android_emulator" : "physical_android";
      discovery.ownerAction = "Device detected. Run the real-device QA checklist with precise location permission and safe DEMO QA customer.";
      const androidVersion = await run(adbPath, ["shell", "getprop", "ro.build.version.release"]);
      const model = await run(adbPath, ["shell", "getprop", "ro.product.model"]);
      const wmSize = await run(adbPath, ["shell", "wm", "size"]);
      discovery.androidVersion = androidVersion.output.trim();
      discovery.model = model.output.trim();
      discovery.viewport = wmSize.output.trim();
    } else if (unauthorized) {
      discovery.status = "DEVICE_UNAUTHORIZED";
      discovery.deviceType = "physical_android_unauthorized";
      discovery.ownerAction = "Unlock the Android device and accept the USB debugging RSA prompt, then rerun DPM Review Bridge.";
    } else {
      discovery.status = "NO_DEVICE_CONNECTED";
      discovery.ownerAction = "Connect a QA Android device or start an emulator with Chrome, then rerun DPM Review Bridge.";
    }
  }

  await fs.writeFile(path.join(jsonDir, "android_device_discovery.json"), `${JSON.stringify(discovery, null, 2)}\n`);

  const md = `# Android Device QA Status

- Status: ${discovery.status}
- Device type: ${discovery.deviceType}
- adb available: ${discovery.adbAvailable ? "yes" : "no"}
- adb path: ${discovery.adbPath}
- Devices detected: ${discovery.devices.length}
- Android version: ${discovery.androidVersion || "unavailable"}
- Model: ${discovery.model || "unavailable"}
- Viewport: ${discovery.viewport || "unavailable"}

## Owner Action
${discovery.ownerAction}

## Scope
This step is read-only discovery. It does not install tools, change DNS, deploy, mutate data, or store credentials.
`;
  await fs.writeFile(path.join(artifactsDir, "ANDROID_DEVICE_QA_STATUS.md"), md);

  console.log(JSON.stringify({ status: discovery.status, deviceType: discovery.deviceType }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
