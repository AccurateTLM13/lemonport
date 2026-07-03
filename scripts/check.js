const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const checks = [
  ["node", ["scripts/content-validation.js"]],
  ["node", ["scripts/site-completion-audit.js"]],
  ["node", ["scripts/media-health.js"]]
];

let failed = false;

checks.forEach(([command, args]) => {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    shell: process.platform === "win32",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    failed = true;
  }
});

if (failed) {
  process.exitCode = 1;
}
