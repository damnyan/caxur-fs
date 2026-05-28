import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import readline from "node:readline";

// Define workspace paths relative to project root
const ROOT_DIR = path.resolve(__dirname, "..");
const SERVICES = [
  {
    name: "client",
    path: path.join(ROOT_DIR, "client"),
    versionFile: path.join(ROOT_DIR, "client", "package.json"),
    type: "npm"
  },
  {
    name: "admin",
    path: path.join(ROOT_DIR, "admin"),
    versionFile: path.join(ROOT_DIR, "admin", "package.json"),
    type: "npm"
  },
  {
    name: "api",
    path: path.join(ROOT_DIR, "api"),
    versionFile: path.join(ROOT_DIR, "api", "Cargo.toml"),
    type: "cargo"
  }
];

// Helper to check if a service has updates (excluding the version file and extra synced files)
function hasServiceUpdates(servicePath: string, versionFile: string, extraFiles?: string[]): boolean {
  try {
    const statusOutput = execSync(`git status --porcelain -- "${servicePath}"`, { encoding: "utf8" }).trim();
    if (!statusOutput) return false;

    const lines = statusOutput.split("\n").map(l => l.trim()).filter(Boolean);
    const otherChanges = lines.filter(line => {
      // git status output format is: "XY path/to/file"
      const filePath = line.substring(3).trim();
      const absFilePath = path.resolve(ROOT_DIR, filePath);
      const absVersionFile = path.resolve(versionFile);
      
      // Exclude main version file
      if (absFilePath === absVersionFile) return false;
      
      // Exclude any extra files
      if (extraFiles) {
        for (const extra of extraFiles) {
          if (absFilePath === path.resolve(extra)) {
            return false;
          }
        }
      }
      
      return true;
    });

    return otherChanges.length > 0;
  } catch {
    return false;
  }
}

// Helper to check if the version file or extra files are already modified (double-bump protection)
function isVersionFileDirty(versionFile: string, extraFiles?: string[]): boolean {
  try {
    const filesToCheck = [versionFile, ...(extraFiles || [])];
    for (const file of filesToCheck) {
      const status = execSync(`git status --porcelain -- "${file}"`, { encoding: "utf8" }).trim();
      if (status.length > 0) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Analyze Git diff to categorize changes into Major, Minor, or Patch
function analyzeDiff(servicePath: string): { type: "major" | "minor" | "patch"; reason: string } {
  try {
    // Get diff of both unstaged and staged changes
    const diff = execSync(`git diff HEAD -- "${servicePath}"`, { encoding: "utf8" });
    const diffCached = execSync(`git diff --cached HEAD -- "${servicePath}"`, { encoding: "utf8" });
    const combinedDiff = diff + "\n" + diffCached;

    if (!combinedDiff.trim()) {
      return { type: "patch", reason: "no active code diff found, defaulting to patch" };
    }

    // 1. Check for Major (breaking changes, structural schema modifications)
    if (
      /breaking change/i.test(combinedDiff) ||
      /\[breaking\]/i.test(combinedDiff) ||
      /DROP TABLE/i.test(combinedDiff) ||
      /DROP COLUMN/i.test(combinedDiff) ||
      /deleted file mode/i.test(combinedDiff)
    ) {
      return { type: "major", reason: "detected potential breaking changes, database drops, or deleted files" };
    }

    // 2. Check for Minor (additions of routes, functions, component exports, new files)
    const hasNewFiles = combinedDiff.includes("new file mode");
    if (
      hasNewFiles ||
      /feat:/i.test(combinedDiff) ||
      /pub async fn/i.test(combinedDiff) || 
      /export const/i.test(combinedDiff) || 
      /export default/i.test(combinedDiff) ||
      /export function/i.test(combinedDiff)
    ) {
      return {
        type: "minor",
        reason: hasNewFiles
          ? "new files were added to the service"
          : "detected new exports, functions, or feature patterns in the codebase"
      };
    }

    // 3. Default to Patch (bug fixes, styling, or refactorings)
    return { type: "patch", reason: "detected minor code adjustments, formatting, or refactoring" };
  } catch {
    return { type: "patch", reason: "diff analysis error occurred, defaulting to patch" };
  }
}

// Parse current version from npm package.json
function parseNpmVersion(filePath: string): string {
  const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return content.version || "0.0.0";
}

// Update version in npm package.json
function writeNpmVersion(filePath: string, version: string): void {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(fileContent);
  parsed.version = version;
  // Preserve formatting by detecting indentation
  const indent = fileContent.match(/^([ \t]+)"/m)?.[1] || "  ";
  fs.writeFileSync(filePath, JSON.stringify(parsed, null, indent) + "\n", "utf8");
}

// Parse current version from Cargo.toml
function parseCargoVersion(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^version\s*=\s*"([^"]+)"/m);
  if (!match) {
    throw new Error(`Could not find version field in ${filePath}`);
  }
  return match[1];
}

// Update version in Cargo.toml
function writeCargoVersion(filePath: string, version: string): void {
  const content = fs.readFileSync(filePath, "utf8");
  const updated = content.replace(/^version\s*=\s*"([^"]+)"/m, `version = "${version}"`);
  fs.writeFileSync(filePath, updated, "utf8");
}

// Calculate the incremented semantic version
function getIncrementedVersion(version: string, type: "major" | "minor" | "patch"): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semantic version format: ${version}`);
  }
  let [major, minor, patch] = parts;
  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
  } else if (type === "patch") {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

// Prompt utility using Node readline
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function run() {
  console.log("🔍 Analyzing services for updates...");
  let hasBumps = false;

  const isInteractive = process.stdout.isTTY && process.stdin.isTTY;

  for (const service of SERVICES) {
    const isDirty = isVersionFileDirty(service.versionFile, service.extraFiles);
    const hasUpdates = hasServiceUpdates(service.path, service.versionFile, service.extraFiles);

    if (isDirty) {
      console.log(`ℹ️  Service '${service.name}': Version file is already modified. Skipping double-bump.`);
      continue;
    }

    if (!hasUpdates) {
      console.log(`ℹ️  Service '${service.name}': No functional updates detected.`);
      continue;
    }

    // Parse current version
    let currentVersion = "";
    try {
      if (service.type === "npm") {
        currentVersion = parseNpmVersion(service.versionFile);
      } else {
        currentVersion = parseCargoVersion(service.versionFile);
      }
    } catch (err: any) {
      console.error(`❌ Failed to parse version for ${service.name}: ${err.message}`);
      continue;
    }

    // AI proposed bump
    const analysis = analyzeDiff(service.path);
    const proposedBump = analysis.type;
    const proposedVersion = getIncrementedVersion(currentVersion, proposedBump);

    console.log(`\n✨ Service '${service.name}' has updates!`);
    console.log(`   Current version: ${currentVersion}`);
    console.log(`   AI Proposed bump: ${proposedBump.toUpperCase()} (${currentVersion} -> ${proposedVersion})`);
    console.log(`   Rationale: ${analysis.reason}`);

    let selectedBump = proposedBump;
    let shouldApply = true;

    if (isInteractive) {
      console.log(`\nOptions:`);
      console.log(`  1. Accept proposed ${proposedBump.toUpperCase()} bump [Default]`);
      console.log(`  2. Override with PATCH (${getIncrementedVersion(currentVersion, "patch")})`);
      console.log(`  3. Override with MINOR (${getIncrementedVersion(currentVersion, "minor")})`);
      console.log(`  4. Override with MAJOR (${getIncrementedVersion(currentVersion, "major")})`);
      console.log(`  5. Skip version bump for this service`);

      const answer = await askQuestion(`Select option [1-5]: `);
      if (answer === "2") {
        selectedBump = "patch";
      } else if (answer === "3") {
        selectedBump = "minor";
      } else if (answer === "4") {
        selectedBump = "major";
      } else if (answer === "5") {
        shouldApply = false;
        console.log(`⏭️  Skipped version bump for '${service.name}'.`);
      }
    } else {
      console.log(`🤖 Non-interactive session: Automatically applying proposed ${proposedBump.toUpperCase()} bump.`);
    }

    if (shouldApply) {
      const finalVersion = getIncrementedVersion(currentVersion, selectedBump);
      
      // Write version back to file
      if (service.type === "npm") {
        writeNpmVersion(service.versionFile, finalVersion);
      } else {
        writeCargoVersion(service.versionFile, finalVersion);
      }
      
      console.log(`✅ Updated '${service.name}' version to ${finalVersion}.`);

      hasBumps = true;
    }
  }

  if (hasBumps) {
    console.log("\n🎉 Semantic versioning updates completed successfully!\n");
  } else {
    console.log("\n⏭️  No services were version bumped in this run.\n");
  }
}

run().catch(err => {
  console.error("❌ Semantic version bump failed:", err);
  process.exit(1);
});
