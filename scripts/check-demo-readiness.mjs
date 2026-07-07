import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function addCheck(ok, label, detail = "") {
  checks.push({ ok, label, detail });
}

function addWarning(label, detail = "") {
  warnings.push({ label, detail });
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
  } catch (error) {
    addCheck(false, `${relativePath} parse`, error.message);
    return null;
  }
}

function readEnvKeys(relativePath) {
  try {
    return fs
      .readFileSync(path.join(root, relativePath), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("=", 1)[0]?.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const packageJson = readJson("package.json");

if (packageJson) {
  addCheck(
    packageJson.packageManager?.startsWith("pnpm@"),
    "package manager pinned",
    packageJson.packageManager || "missing packageManager"
  );

  addCheck(
    packageJson.scripts?.dev === "vite --host 0.0.0.0",
    "dev server binds to network",
    packageJson.scripts?.dev || "missing dev script"
  );

  addCheck(
    packageJson.scripts?.["demo:urls"] === "node scripts/print-demo-urls.mjs",
    "demo URL helper is available",
    packageJson.scripts?.["demo:urls"] || "missing demo:urls script"
  );

  addCheck(
    packageJson.scripts?.build === "vite build",
    "build script is available",
    packageJson.scripts?.build || "missing build script"
  );

  addCheck(
    packageJson.scripts?.["build:pages-demo"] === "VITE_API_BASE_URL= VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= vite build --mode pages-demo",
    "GitHub Pages demo build script is available",
    packageJson.scripts?.["build:pages-demo"] || "missing build:pages-demo script"
  );
}

addCheck(exists("pnpm-lock.yaml"), "pnpm lockfile exists");
addCheck(exists(".env.example"), "env example exists");
addCheck(exists("docs/internal-port-demo-runbook.md"), "internal port runbook exists");
addCheck(exists("docs/company-clone-runbook.md"), "company clone runbook exists");
addCheck(exists("docs/company-demo-readiness-checklist.md"), "company demo checklist exists");
addCheck(exists("docs/github-pages-demo.md"), "GitHub Pages demo guide exists");
addCheck(exists(".github/workflows/pages-demo.yml"), "GitHub Pages demo workflow exists");

if (exists(".env.example")) {
  const exampleKeys = new Set(readEnvKeys(".env.example"));
  ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"].forEach((key) => {
    addCheck(exampleKeys.has(key), `.env.example includes ${key}`);
  });
}

if (!exists("node_modules")) {
  addWarning("dependencies are not installed", "Run pnpm install before starting the dev server.");
}

if (!exists(".env.local")) {
  addWarning(
    ".env.local is missing",
    "Create it locally with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY when Supabase login is needed."
  );
} else {
  const envKeys = new Set(readEnvKeys(".env.local"));
  ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"].forEach((key) => {
    if (!envKeys.has(key)) {
      addWarning(`${key} is not defined`, "Supabase login may not be available on this machine.");
    }
  });
}

console.log("Demo readiness check");
console.log("====================");

checks.forEach((check) => {
  const suffix = check.detail ? ` - ${check.detail}` : "";
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}${suffix}`);
});

if (warnings.length) {
  console.log("");
  console.log("Warnings");
  console.log("--------");
  warnings.forEach((warning) => {
    const suffix = warning.detail ? ` - ${warning.detail}` : "";
    console.log(`WARN ${warning.label}${suffix}`);
  });
}

const failed = checks.filter((check) => !check.ok);

if (failed.length) {
  console.log("");
  console.log(`Result: ${failed.length} blocking check(s) failed.`);
  process.exit(1);
}

console.log("");
console.log("Result: demo setup looks ready. Review warnings before a company demo.");
