#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const DOCS_ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

function getFlag(name) {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const value = args[i + 1];
  return value && !value.startsWith("--") ? value : true;
}

const sectionFilter = getFlag("--section");
const modeFilter = getFlag("--mode");
const priorityFilter = getFlag("--priority");
const failuresOnly = args.includes("--failures");
const human = args.includes("--human");

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

const sections = [];
for (const specPath of findFiles(DOCS_ROOT, "spec.json")) {
  const spec = readJson(specPath);
  if (!spec) continue;
  if (sectionFilter && spec.section !== sectionFilter) continue;

  const scopedTests = (spec.tests || []).filter((t) => {
    if (modeFilter && t.mode !== modeFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });
  const resultsPath = path.join(path.dirname(specPath), "results.json");
  const results = fs.existsSync(resultsPath) ? readJson(resultsPath) : null;
  const byId = new Map((results?.results || []).map((r) => [r.id, r]));

  let pass = 0,
    fail = 0,
    blocked = 0,
    pending = 0;
  for (const test of scopedTests) {
    const status = byId.get(test.id)?.status || "pending";
    if (status === "pass") pass += 1;
    else if (status === "fail") fail += 1;
    else if (status === "blocked") blocked += 1;
    else pending += 1;
  }
  if (failuresOnly && fail === 0) continue;

  sections.push({
    section: spec.section,
    title: spec.title,
    executionOrder: spec.executionOrder ?? 999,
    pass,
    fail,
    blocked,
    pending,
    total: scopedTests.length,
    lastRun: results?.lastRun || null,
  });
}

sections.sort(
  (a, b) =>
    a.executionOrder - b.executionOrder || a.section.localeCompare(b.section),
);
const summary = sections.reduce(
  (acc, s) => ({
    pass: acc.pass + s.pass,
    fail: acc.fail + s.fail,
    blocked: acc.blocked + s.blocked,
    pending: acc.pending + s.pending,
    total: acc.total + s.total,
  }),
  { pass: 0, fail: 0, blocked: 0, pending: 0, total: 0 },
);

const payload = { generatedAt: new Date().toISOString(), sections, summary };
if (!human) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

console.log("\nTest Status — black-cat");
console.log("=======================");
for (const section of sections) {
  const state =
    section.fail > 0
      ? "FAIL"
      : section.blocked > 0
        ? "BLOCKED"
        : section.pending > 0
          ? "PENDING"
          : "PASS";
  console.log(
    `${String(section.executionOrder).padStart(2, "0")} ${section.section.padEnd(22)} ${state.padEnd(8)} ${section.pass}/${section.total}`,
  );
}
console.log("\nSummary");
console.log(
  `Total: ${summary.total} Pass: ${summary.pass} Fail: ${summary.fail} Blocked: ${summary.blocked} Pending: ${summary.pending}`,
);
