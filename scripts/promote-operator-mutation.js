/**
 * promote-operator-mutation.js
 *
 * Reads content/operator-log/schedule.json, finds the newest eligible phase,
 * clears operator-log/data/, copies the active fragment, and writes
 * operator-log/manifest.json.
 *
 * Usage:
 *   node scripts/promote-operator-mutation.js
 *
 * Eligibility rules:
 *   - status must be "Ready" or "Published"
 *   - publishAt must be <= current datetime
 *   - if multiple phases qualify, the highest phase number wins
 *
 * This script never ships future fragments publicly. It clears operator-log/data/
 * before copying only the single active fragment.
 *
 * TODO: Mutation Desk Studio integration — expose this logic via
 *       POST /api/mutation/promote and GET /api/mutation/schedule
 *       when the full Mutation Desk UI is built.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const scheduleFile = path.join(root, "content", "operator-log", "schedule.json");
const fragmentsDir = path.join(root, "content", "operator-log", "fragments");
const publicDataDir = path.join(root, "operator-log", "data");
const manifestFile = path.join(root, "operator-log", "manifest.json");

const ELIGIBLE_STATUSES = new Set(["Ready", "Published"]);

// ─── Validation ────────────────────────────────────────────────────────────

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`[promote-operator-mutation] ERROR: ${label} not found.`);
    console.error(`  Expected: ${path.relative(root, filePath)}`);
    process.exit(1);
  }
}

function loadSchedule() {
  assertFile(scheduleFile, "schedule.json");

  let raw;
  try {
    raw = fs.readFileSync(scheduleFile, "utf8");
  } catch (error) {
    console.error(`[promote-operator-mutation] ERROR: Could not read schedule.json.`);
    console.error(`  ${error.message}`);
    process.exit(1);
  }

  let schedule;
  try {
    schedule = JSON.parse(raw);
  } catch (error) {
    console.error(`[promote-operator-mutation] ERROR: schedule.json is not valid JSON.`);
    console.error(`  ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(schedule)) {
    console.error(`[promote-operator-mutation] ERROR: schedule.json must be a JSON array.`);
    process.exit(1);
  }

  return schedule;
}

function validatePhase(phase, index) {
  const problems = [];

  if (typeof phase.phase !== "number") problems.push(`"phase" must be a number`);
  if (!phase.fragment || typeof phase.fragment !== "string") problems.push(`"fragment" filename is required`);
  if (!phase.status || typeof phase.status !== "string") problems.push(`"status" is required`);
  if (!phase.publishAt || typeof phase.publishAt !== "string") problems.push(`"publishAt" is required`);

  if (problems.length) {
    console.error(`[promote-operator-mutation] ERROR: Phase at index ${index} has validation problems:`);
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
}

// ─── Phase Selection ────────────────────────────────────────────────────────

function findActivePhase(schedule, now) {
  const eligible = schedule.filter((phase, index) => {
    validatePhase(phase, index);

    if (!ELIGIBLE_STATUSES.has(phase.status)) {
      return false;
    }

    const publishTime = new Date(phase.publishAt);

    if (Number.isNaN(publishTime.getTime())) {
      console.error(`[promote-operator-mutation] ERROR: Phase ${phase.phase} has invalid publishAt: "${phase.publishAt}"`);
      process.exit(1);
    }

    return publishTime <= now;
  });

  if (!eligible.length) {
    return null;
  }

  // Newest eligible phase (highest phase number)
  return eligible.reduce((best, phase) => (phase.phase > best.phase ? phase : best));
}

// ─── File Operations ─────────────────────────────────────────────────────────

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function clearPublicFragments() {
  if (!fs.existsSync(publicDataDir)) {
    return;
  }

  const files = fs.readdirSync(publicDataDir).filter((f) => f.endsWith(".json"));

  if (files.length) {
    files.forEach((f) => {
      fs.unlinkSync(path.join(publicDataDir, f));
    });
    console.log(`[promote-operator-mutation] Cleared ${files.length} old fragment(s) from operator-log/data/`);
  }
}

function writeManifest(phase) {
  const manifest = {
    activePhase: phase.phase,
    activeFragment: phase.fragment,
    phaseLabel: phase.phaseLabel || `File Fragment ${String(phase.phase).padStart(3, "0")}`,
    publishedAt: new Date(phase.publishAt).toISOString(),
    nextMutationHint: phase.nextMutationHint || null,
    requiresUnlock: phase.requiresUnlock === true
  };

  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function promote() {
  const now = new Date();
  console.log(`[promote-operator-mutation] Running at ${now.toISOString()}`);

  const schedule = loadSchedule();
  console.log(`[promote-operator-mutation] Loaded ${schedule.length} phase(s) from schedule.`);

  const active = findActivePhase(schedule, now);

  if (!active) {
    console.log(`[promote-operator-mutation] No eligible phase found.`);
    console.log(`  Phases must have status "Ready" or "Published" and publishAt <= now.`);
    console.log(`  Nothing was written. Exiting cleanly.`);
    return;
  }

  console.log(`[promote-operator-mutation] Active phase: ${active.phase} — "${active.title || active.phaseLabel}"`);
  console.log(`  Fragment:   ${active.fragment}`);
  console.log(`  PublishedAt: ${new Date(active.publishAt).toISOString()}`);
  console.log(`  Status:     ${active.status}`);

  const sourceFragment = path.join(fragmentsDir, active.fragment);
  assertFile(sourceFragment, `fragment "${active.fragment}" in content/operator-log/fragments/`);

  ensureDir(publicDataDir);
  clearPublicFragments();

  const destFragment = path.join(publicDataDir, active.fragment);
  fs.copyFileSync(sourceFragment, destFragment);
  console.log(`[promote-operator-mutation] Copied fragment → operator-log/data/${active.fragment}`);

  const manifest = writeManifest(active);
  console.log(`[promote-operator-mutation] Wrote operator-log/manifest.json`);
  console.log(`  Active phase:      ${manifest.activePhase}`);
  console.log(`  Active fragment:   ${manifest.activeFragment}`);
  console.log(`  Phase label:       ${manifest.phaseLabel}`);
  console.log(`  Requires unlock:   ${manifest.requiresUnlock}`);

  if (manifest.nextMutationHint) {
    console.log(`  Next hint:         "${manifest.nextMutationHint}"`);
  }

  console.log(`[promote-operator-mutation] Done.`);
}

promote();
