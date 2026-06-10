const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const backupRoot = path.join(root, ".studio-backups");

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function pruneBackups(maxBackups = 30) {
  if (!fs.existsSync(backupRoot)) {
    return;
  }
  try {
    const dirs = fs.readdirSync(backupRoot)
      .map((name) => {
        const fullPath = path.join(backupRoot, name);
        return {
          name,
          path: fullPath,
          stat: fs.statSync(fullPath)
        };
      })
      .filter((item) => item.stat.isDirectory());

    dirs.sort((a, b) => a.name.localeCompare(b.name));

    if (dirs.length > maxBackups) {
      const toDelete = dirs.slice(0, dirs.length - maxBackups);
      toDelete.forEach((dir) => {
        fs.rmSync(dir.path, { recursive: true, force: true });
        console.log(`[Backup Clean] Pruned old backup folder: ${dir.name}`);
      });
    }
  } catch (error) {
    console.error("[Backup Clean] Error pruning old backups:", error);
  }
}

function backupFile(filePath, label, backupTimestamp = timestamp()) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const relative = path.relative(root, filePath);
  const target = path.join(backupRoot, backupTimestamp, label || relative);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(filePath, target);

  pruneBackups(30);

  return target;
}

function backupFiles(filePaths) {
  const backupTimestamp = timestamp();

  const results = filePaths
    .map((filePath) => backupFile(filePath, null, backupTimestamp))
    .filter(Boolean);

  return results;
}

module.exports = {
  backupFile,
  backupFiles,
  pruneBackups
};
