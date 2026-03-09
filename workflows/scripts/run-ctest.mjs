import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function parseArgs(argv) {
  const out = { workflow: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--workflow" && argv[i + 1]) out.workflow = argv[i + 1];
  }
  return out;
}

function findRepoRoot(startDir) {
  let current = startDir;
  for (let i = 0; i < 6; i += 1) {
    const fixturePath = path.join(current, "docs", "fixtures.json");
    if (fs.existsSync(fixturePath)) return current;
    current = path.resolve(current, "..");
  }
  throw new Error("Could not resolve repo root (docs/fixtures.json missing).");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function resolveResultsPath(repoRoot, section) {
  const docsRoot = path.join(repoRoot, "docs");
  const candidates = fs.readdirSync(docsRoot, { withFileTypes: true });
  for (const entry of candidates) {
    if (!entry.isDirectory()) continue;
    if (["scripts", "plan", "audit", "evidence", "fixtures"].includes(entry.name)) continue;
    const resultPath = path.join(docsRoot, entry.name, section, "results.json");
    if (fs.existsSync(resultPath)) return resultPath;
  }
  return null;
}

function getGitSha(repoRoot) {
  const out = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  return out.status === 0 ? out.stdout.trim() : "";
}

function updateSpecResults(repoRoot, section, specIds, status, notes, evidenceRelPath, ranAt) {
  const resultsPath = resolveResultsPath(repoRoot, section);
  if (!resultsPath) return;
  const payload = readJson(resultsPath);
  const gitSha = getGitSha(repoRoot);
  for (const specId of specIds) {
    const current = payload.results.find((entry) => entry.id === specId);
    if (!current) continue;
    const history = Array.isArray(current.history) ? current.history : [];
    if (current?.lastRun?.ranAt) {
      history.unshift({
        ranAt: current.lastRun.ranAt,
        status: current.status || "pending",
        runner: current.lastRun.runner || payload.runner || "manual"
      });
    }
    current.history = history.slice(0, 5);
    current.status = status;
    current.notes = notes;
    current.lastRun = {
      ranAt,
      runner: "ctest",
      environment: { gitSha },
      evidence: [{ type: "simulate-output", path: evidenceRelPath }]
    };
  }
  payload.lastRun = ranAt;
  payload.runner = "ctest";
  writeJson(resultsPath, payload);
}

function main() {
  const { workflow } = parseArgs(process.argv.slice(2));
  const workflowRoot = process.cwd();
  const repoRoot = findRepoRoot(workflowRoot);
  const registry = readJson(path.join(workflowRoot, "cre-flow-registry.json"));
  const entries = (registry.workflows || []).filter((entry) => !workflow || entry.workflow === workflow);
  if (entries.length === 0) {
    console.log("No workflows matched requested filters.");
    return;
  }

  const evidenceDir = path.join(repoRoot, "docs", "evidence", "cre");
  ensureDir(evidenceDir);
  const creBin = process.env.CRE_BIN || "cre";
  let failCount = 0;
  let blockedCount = 0;
  let passCount = 0;

  for (const entry of entries) {
    const payload = readJson(path.join(repoRoot, entry.fixture));
    const ranAt = new Date().toISOString();
    const stamp = ranAt.replace(/[:.]/g, "-");
    const evidencePath = path.join(evidenceDir, `${entry.workflow}-${stamp}.log`);
    const evidenceRelPath = path.relative(repoRoot, evidencePath);
    const run = spawnSync(creBin, ["workflow", "simulate", entry.workflow, "--http-payload", JSON.stringify(payload), "--non-interactive", "--trigger-index", "0"], {
      cwd: workflowRoot,
      encoding: "utf8"
    });

    fs.writeFileSync(
      evidencePath,
      [`workflow=${entry.workflow}`, `status=${run.status}`, "", "stdout:", run.stdout || "", "", "stderr:", run.stderr || ""].join("\n"),
      "utf8"
    );

    if (run.error && run.error.code === "ENOENT") {
      blockedCount += 1;
      updateSpecResults(repoRoot, entry.section, entry.specIds, "blocked", `CRE CLI not found for ${entry.workflow}`, evidenceRelPath, ranAt);
      continue;
    }
    if (run.status === 0) {
      passCount += 1;
      updateSpecResults(repoRoot, entry.section, entry.specIds, "pass", `CRE simulate passed for ${entry.workflow}`, evidenceRelPath, ranAt);
    } else {
      failCount += 1;
      updateSpecResults(repoRoot, entry.section, entry.specIds, "fail", `CRE simulate failed for ${entry.workflow} (exit ${run.status ?? "unknown"})`, evidenceRelPath, ranAt);
    }
  }

  console.log(`ctest summary: pass=${passCount} fail=${failCount} blocked=${blockedCount}`);
  if (failCount > 0) process.exitCode = 1;
}

main();
