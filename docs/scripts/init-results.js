#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const DOCS_ROOT = path.resolve(__dirname, "..");

function findFiles(dir, name) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      entry.name !== "scripts"
    )
      out.push(...findFiles(full, name));
    else if (entry.isFile() && entry.name === name) out.push(full);
  }
  return out;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

let created = 0;
let upgraded = 0;
for (const specPath of findFiles(DOCS_ROOT, "spec.json")) {
  const spec = readJson(specPath);
  if (!spec) continue;
  const resultsPath = path.join(path.dirname(specPath), "results.json");
  if (!fs.existsSync(resultsPath)) {
    const payload = {
      app: spec.app,
      section: spec.section,
      lastRun: null,
      runner: "manual",
      results: (spec.tests || []).map((test) => ({
        id: test.id,
        status: "pending",
        notes: "",
      })),
    };
    fs.writeFileSync(resultsPath, JSON.stringify(payload, null, 2), "utf8");
    created += 1;
    continue;
  }

  const existing = readJson(resultsPath);
  if (!existing) continue;
  const byId = new Map(
    (existing.results || []).map((entry) => [entry.id, entry]),
  );
  const merged = (spec.tests || []).map(
    (test) =>
      byId.get(test.id) || { id: test.id, status: "pending", notes: "" },
  );
  if (JSON.stringify(merged) !== JSON.stringify(existing.results || [])) {
    fs.writeFileSync(
      resultsPath,
      JSON.stringify({ ...existing, results: merged }, null, 2),
      "utf8",
    );
    upgraded += 1;
  }
}

console.log(`Created: ${created}, Upgraded: ${upgraded}`);
