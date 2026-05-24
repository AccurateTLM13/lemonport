#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "images", "mdr", "mdr-nothing-factory-assets");
const targetMachine = path.join(root, "million-dollar-receipt", "assets", "machine");
const targetOverlays = path.join(root, "million-dollar-receipt", "assets", "overlays");

const machineWidths = [1448, 1200, 1024, 768, 640, 480];

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`Copied ${path.relative(root, from)} → ${path.relative(root, to)}`);
}

function copyDir(fromDir, toDir) {
  if (!fs.existsSync(fromDir)) {
    return 0;
  }

  let count = 0;
  fs.mkdirSync(toDir, { recursive: true });

  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);

    if (entry.isDirectory()) {
      count += copyDir(from, to);
    } else if (entry.isFile()) {
      copyFile(from, to);
      count += 1;
    }
  }

  return count;
}

function hasMagick() {
  const result = spawnSync("magick", ["-version"], { encoding: "utf8" });
  return result.status === 0;
}

function generateResponsiveWebp(sourcePath, baseName) {
  if (!hasMagick()) {
    console.warn("ImageMagick (magick) not found — skipping responsive variant generation.");
    return;
  }

  for (const width of machineWidths) {
    const output = path.join(targetMachine, `${baseName}-${width}.webp`);
    const args = [sourcePath, "-resize", `${width}x`, "-quality", "82", output];
    const result = spawnSync("magick", args, { encoding: "utf8" });

    if (result.status !== 0) {
      console.error(`Failed to generate ${path.basename(output)}: ${result.stderr}`);
      continue;
    }

    console.log(`Generated ${path.relative(root, output)}`);
  }
}

function resolveMachineSource() {
  const candidates = [
    path.join(sourceRoot, "machine", "nothing-factory-machine.webp"),
    path.join(sourceRoot, "machine", "nothing-factory-machine.png"),
    path.join(sourceRoot, "nothing-factory-machine.webp"),
    path.join(sourceRoot, "nothing-factory-machine.png")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function main() {
  if (!fs.existsSync(sourceRoot)) {
    console.error(`Asset pack not found at ${path.relative(root, sourceRoot)}`);
    console.error("Place the MDR Nothing Factory asset pack there, then re-run this script.");
    process.exit(1);
  }

  fs.mkdirSync(targetMachine, { recursive: true });
  fs.mkdirSync(targetOverlays, { recursive: true });

  const machineCopied = copyDir(path.join(sourceRoot, "machine"), targetMachine);
  const overlaysCopied = copyDir(path.join(sourceRoot, "overlays"), targetOverlays);

  const integrationMap = path.join(sourceRoot, "integration", "overlay-map.json");
  if (fs.existsSync(integrationMap)) {
    copyFile(integrationMap, path.join(root, "million-dollar-receipt", "assets", "overlay-map.json"));
  }

  const machineSource = resolveMachineSource();
  const masterWebp = path.join(targetMachine, "nothing-factory-machine.webp");
  const masterPng = path.join(targetMachine, "nothing-factory-machine.png");

  if (machineSource && !fs.existsSync(masterWebp) && machineSource.endsWith(".png")) {
    copyFile(machineSource, masterPng);
    if (hasMagick()) {
      spawnSync("magick", [masterPng, "-quality", "82", masterWebp], { encoding: "utf8" });
      console.log(`Generated ${path.relative(root, masterWebp)} from PNG master`);
    }
  }

  const variantSource = fs.existsSync(masterWebp) ? masterWebp : fs.existsSync(masterPng) ? masterPng : null;

  if (variantSource) {
    const missingVariant = machineWidths.some(
      (width) => !fs.existsSync(path.join(targetMachine, `nothing-factory-machine-${width}.webp`))
    );

    if (missingVariant) {
      generateResponsiveWebp(variantSource, "nothing-factory-machine");
    }
  }

  console.log(`\nDone. Machine files: ${machineCopied}, overlay files: ${overlaysCopied}.`);

  if (!fs.existsSync(masterWebp) && !fs.existsSync(masterPng)) {
    console.warn("\nWarning: no machine master image found. Add nothing-factory-machine.webp or .png to the asset pack.");
    process.exitCode = 1;
  }
}

main();
