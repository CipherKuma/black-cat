#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const DOCS_ROOT = path.resolve(__dirname, "..");

function findJsonFiles(dir, name) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      entry.name !== "scripts"
    )
      out.push(...findJsonFiles(full, name));
    else if (entry.isFile() && entry.name === name) out.push(full);
  }
  return out;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Failed reading ${filePath}: ${error.message}`);
    return null;
  }
}

function testPlanBlock(test) {
  const lines = [
    `#### ${test.id}: ${test.title} \`${test.mode}\` \`${test.priority}\``,
    "",
    test.description,
    "",
  ];
  if (test.preconditions?.length) {
    lines.push("**Preconditions:**");
    for (const pre of test.preconditions) lines.push(`- ${pre}`);
    lines.push("");
  }
  if (test.steps?.length) {
    lines.push("**Steps:**");
    test.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    lines.push("");
  }
  lines.push(`**Pass when:** ${test.successCriteria}`, "");
  return lines.join("\n");
}

function summarize(spec, results) {
  const byId = new Map(
    (results?.results || []).map((entry) => [entry.id, entry]),
  );
  let pass = 0,
    fail = 0,
    blocked = 0,
    pending = 0;
  for (const test of spec.tests || []) {
    const status = byId.get(test.id)?.status || "pending";
    if (status === "pass") pass += 1;
    else if (status === "fail") fail += 1;
    else if (status === "blocked") blocked += 1;
    else pending += 1;
  }
  return { pass, fail, blocked, pending, total: spec.tests.length };
}

function main() {
  const specFiles = findJsonFiles(DOCS_ROOT, "spec.json");
  const indexRows = [];

  for (const specPath of specFiles) {
    const dir = path.dirname(specPath);
    const spec = readJson(specPath);
    if (!spec) continue;

    const plan = [`# ${spec.title}`, "", spec.description || "", "", "---", ""];
    for (const test of spec.tests || []) plan.push(testPlanBlock(test));
    fs.writeFileSync(path.join(dir, "plan.md"), plan.join("\n"), "utf8");

    const resultsPath = path.join(dir, "results.json");
    const results = fs.existsSync(resultsPath) ? readJson(resultsPath) : null;
    if (results) {
      const byId = new Map(
        (results.results || []).map((entry) => [entry.id, entry]),
      );
      const rows = (spec.tests || []).map((test) => {
        const entry = byId.get(test.id);
        const ranAt = entry?.lastRun?.ranAt
          ? entry.lastRun.ranAt.substring(0, 10)
          : "";
        return `| ${test.id} | ${test.title.replace(/\|/g, "\\|")} | ${entry?.status || "pending"} | ${entry?.lastRun?.runner || ""} | ${ranAt} | ${(entry?.notes || "").replace(/\|/g, "\\|")} |`;
      });
      fs.writeFileSync(
        path.join(dir, "results.md"),
        [
          `# ${spec.title} — Results`,
          "",
          "| ID | Title | Status | Runner | Last Run | Notes |",
          "| --- | --- | --- | --- | --- | --- |",
          ...rows,
          "",
        ].join("\n"),
        "utf8",
      );
    }

    indexRows.push({
      section: spec.section,
      title: spec.title,
      order: spec.executionOrder ?? 999,
      rel: path.relative(DOCS_ROOT, dir),
      ...summarize(spec, results),
    });
  }

  indexRows.sort(
    (a, b) => a.order - b.order || a.section.localeCompare(b.section),
  );
  fs.writeFileSync(
    path.join(DOCS_ROOT, "INDEX.md"),
    [
      "# Convergence Test Index — black-cat",
      "",
      "| Section | Order | Pass | Fail | Blocked | Pending | Total |",
      "| --- | --- | --- | --- | --- | --- | --- |",
      ...indexRows.map(
        (row) =>
          `| [${row.section}](${row.rel}/plan.md) | ${row.order} | ${row.pass} | ${row.fail} | ${row.blocked} | ${row.pending} | ${row.total} |`,
      ),
      "",
      "```bash",
      "node docs/scripts/init-results.js",
      "node docs/scripts/generate-docs.js",
      "node docs/scripts/status.js --human",
      "```",
      "",
    ].join("\n"),
    "utf8",
  );
  console.log(`Generated markdown for ${specFiles.length} sections.`);
}

main();
