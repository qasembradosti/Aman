#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const rawArgs = process.argv.slice(2);
const preflightOnly = rawArgs.includes("--preflight");
const passthroughFlags = rawArgs.filter((arg) => arg.startsWith("--") && arg !== "--preflight");
const positionalArgs = rawArgs.filter((arg) => !arg.startsWith("--"));
const profile = positionalArgs[0] || "production";
const platform = positionalArgs[1] || "android";

const sourceDir = process.cwd();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "amanly-eas-build-"));

const ignoredDirNames = new Set([
  "node_modules",
  ".expo",
  ".expo-shared",
  ".git",
  ".eas-inspect",
  ".eas-inspect-root",
  "dist",
  "build",
  "web-build",
  "coverage",
  ".cache",
  ".yarn",
  ".idea",
  ".vscode",
]);

const shouldSkip = (sourcePath) => {
  const name = path.basename(sourcePath);
  const ext = path.extname(name).toLowerCase();

  if (ignoredDirNames.has(name)) {
    return true;
  }

  if (name === "README.md" || name === "CHANGELOG.md" || name === "LICENSE") {
    return true;
  }

  if (
    ext === ".log" ||
    ext === ".tmp" ||
    ext === ".temp" ||
    ext === ".bak" ||
    ext === ".backup" ||
    ext === ".swp" ||
    ext === ".swo" ||
    ext === ".psd" ||
    ext === ".ai" ||
    ext === ".sketch" ||
    ext === ".fig" ||
    ext === ".mp4" ||
    ext === ".mov" ||
    ext === ".avi" ||
    ext === ".mkv"
  ) {
    return true;
  }

  return false;
};

const copyRecursive = (src, dest) => {
  const stats = fs.statSync(src);

  if (shouldSkip(src)) return;

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  fs.copyFileSync(src, dest);
};

try {
  if (!fs.existsSync(path.join(sourceDir, "package.json"))) {
    throw new Error(`package.json not found in ${sourceDir}. Run this from the Frontend directory.`);
  }

  if (!fs.existsSync(path.join(sourceDir, "app.json")) && !fs.existsSync(path.join(sourceDir, "app.config.js"))) {
    throw new Error(`Expo app config not found in ${sourceDir}. Expected app.json or app.config.js.`);
  }

  console.log(`Preparing isolated EAS build directory: ${tempDir}`);
  copyRecursive(sourceDir, tempDir);

  // EAS runs `expo config` locally before upload; plugins must resolve from node_modules.
  // Link the original node_modules into the temp dir to satisfy local resolution only.
  const sourceNodeModules = path.join(sourceDir, "node_modules");
  const tempNodeModules = path.join(tempDir, "node_modules");
  if (fs.existsSync(sourceNodeModules) && !fs.existsSync(tempNodeModules)) {
    const linkType = process.platform === "win32" ? "junction" : "dir";
    fs.symlinkSync(sourceNodeModules, tempNodeModules, linkType);
  }

  // Validate app config in the isolated folder before invoking EAS.
  const expoConfigCheck = spawnSync("npx", ["expo", "config", "--json"], {
    cwd: tempDir,
    stdio: "pipe",
    shell: true,
    env: process.env,
  });

  if (expoConfigCheck.status !== 0) {
    const stderr = expoConfigCheck.stderr ? expoConfigCheck.stderr.toString().trim() : "";
    const stdout = expoConfigCheck.stdout ? expoConfigCheck.stdout.toString().trim() : "";
    throw new Error(`Preflight failed in isolated dir.\n${stderr || stdout || "expo config failed"}`);
  }

  if (preflightOnly) {
    console.log("Preflight passed: isolated Expo config resolved successfully.");
    process.exit(0);
  }

  const args = ["eas", "build", "-p", platform, "--profile", profile, ...passthroughFlags];
  console.log(`Running: npx ${args.join(" ")}`);

  const result = spawnSync("npx", args, {
    cwd: tempDir,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      EAS_NO_VCS: "1",
      EAS_PROJECT_ROOT: tempDir,
    },
  });

  if (result.error) {
    console.error("Failed to execute EAS build:", result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
} catch (error) {
  console.error("Isolated build failed:", error.message);
  process.exit(1);
}
