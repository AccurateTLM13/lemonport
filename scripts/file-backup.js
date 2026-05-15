const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const backupRoot = path.join(root, ".studio-backups");

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function backupFile(filePath, label, backupTimestamp = timestamp()) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const relative = path.relative(root, filePath);
  const target = path.join(backupRoot, backupTimestamp, label || relative);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(filePath, target);
  return target;
}

function backupFiles(filePaths) {
  const backupTimestamp = timestamp();

  return filePaths
    .map((filePath) => backupFile(filePath, null, backupTimestamp))
    .filter(Boolean);
}

module.exports = {
  backupFile,
  backupFiles
};
