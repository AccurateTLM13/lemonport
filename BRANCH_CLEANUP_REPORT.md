# Lemonteed Git Branch Cleanup Report

**Date of Audit:** 2026-06-11  
**Backup Branch Created:** `backup/pre-cleanup-2026-06-11` (pushed to origin)  
**Cleanup Execution Status:** **Completed** (Executed on 2026-06-11)

---

## 1. Executive Summary

An audit of the Lemonteed repository branches was performed to clean up branch clutter and establish a clean trunk-based branch structure.

* **Total Remote Branches Reviewed:** 11 (excluding `origin/HEAD`)
* **Number Recommended to Keep:** 2 (`main`, `backup/pre-cleanup-2026-06-11`)
* **Number Recommended to Delete (Obsolete/Merged):** 7
* **Number Recommended to Archive (Tag & Delete):** 1 (`cursor/simplify-machine-composition-f644`)
* **Number Needing Review / Merge:** 1 (`cursor/integrate-mdr-asset-pack-f644`)

### Major Risks & Warnings
> [!WARNING]
> The branch `origin/cursor/integrate-mdr-asset-pack-f644` contains critical, unmerged work implementing **Phase 3: Feature Completeness & Moderation** for the Million Dollar Receipt (MDR). It modifies critical files including [scripts/studio-server.js](file:///C:/Users/JP/Desktop/portfol/scripts/studio-server.js) and the Million Dollar Receipt source code. This branch must **not** be deleted and should be reviewed and merged into `main` to finalize the MDR feature implementation.
>
> Additionally, any changes to generated files such as [assets/js/gallery-data.js](file:///C:/Users/JP/Desktop/portfol/assets/js/gallery-data.js) and [assets/js/gallery-categories.js](file:///C:/Users/JP/Desktop/portfol/assets/js/gallery-categories.js) must be treated as build outputs. They should be regenerated using `node scripts/build-gallery.js` rather than treated as hand-authored source or merged manually.

---

## 2. Recommended Final Branch Structure

Going forward, the repository should utilize a clean trunk-based development workflow:

```text
main                                  <- Permanent primary trunk
backup/pre-cleanup-2026-06-11         <- Pre-cleanup safety backup (keep temporarily)
feature/*                             <- Short-lived feature branches
fix/*                                 <- Short-lived fix branches
experiment/*                          <- Short-lived experimental branches
archive/*                             <- Reference tags (not active branches)
```

---

## 3. Branch Audit Table

| Branch Name | Last Commit Date | Merged into `main` | Touches Important Files | Summary of Changes | Classification | Recommended Action |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `origin/main` | 2026-05-23 | Yes (Trunk) | - | Primary branch containing static site and Studio. | **Keep** | Keep permanently as the main trunk. |
| `origin/backup/pre-cleanup-2026-06-11` | 2026-05-23 | Yes | Yes | Safety snapshot branch matching `main` at audit time. | **Keep** | Keep temporarily as a pre-cleanup rollback point. |
| `origin/cursor/integrate-mdr-asset-pack-f644` | 2026-06-10 | **No** | **Yes** | Completes MDR Phase 3: Mutation Desk CRUD, SQLite/D1 moderation panel, Piet mode hour cycles, and Nothing Factory hybrid webp assets. | **Review / Merge** | Do not delete. Perform manual verification, then merge into `main`. |
| `origin/cursor/fix-svg-mime-local-dev-f644` | 2026-05-24 | **No** | **Yes** | Serves SVG files with `image/svg+xml` MIME type in the local development server. | **Delete** | Propose deletion. Redundant, as this change is already included in `integrate-mdr-asset-pack-f644`. |
| `origin/cursor/lemon-dom-d086` | 2026-05-24 | **No** (Code-merged) | **Yes** | Relocates Lemon DOM to Junk Drawer, updates hosted demo links, and cleans up placeholder GitHub pages URLs. | **Delete** | Propose deletion. Code-wise, the changes are already fully present in `main` (commit `ad736b8` and others). |
| `origin/cursor/simplify-machine-composition-f644` | 2026-05-24 | **No** | **Yes** | Older layout updates attempting to simplify the conveyor belt SVG rendering. | **Archive** | Tag as `archive/cursor/simplify-machine-composition-f644` for reference, then delete. |
| `origin/cursor/mdr-v5-polish-4c80` | 2026-05-24 | Yes | Yes | Polish phase for MDR (machine zones, POS checkout layout, museum display specimen layout). | **Delete** | Propose deletion. Fully merged into `main`. |
| `origin/cursor/mdr-full-implementation-4c80` | 2026-05-24 | Yes | Yes | Initial full MDR experience, API backend, and local SQLite server implementation. | **Delete** | Propose deletion. Fully merged into `main`. |
| `origin/cursor/security-hardening-48ae` | 2026-05-23 | Yes | Yes | Hardens production deployment, Studio server write authorization, and CMS URL resolution. | **Delete** | Propose deletion. Fully merged into `main`. |
| `origin/cursor/dev-env-setup-9ccc` | 2026-05-22 | Yes | Yes | Initial setup of dev environment scripts, AGENTS.md guide, and basic content schema validation. | **Delete** | Propose deletion. Fully merged into `main`. |
| `origin/feature/add-memetic-warfare-game` | 2026-05-11 | Yes | Yes | Implements the interactive Memetic Warfare game zone and deck rules. | **Delete** | Propose deletion. Fully merged into `main`. |

---

## 4. Branches Safe to Delete

These branches have either been merged into `main` or their code changes are fully represented in other active branches:

1. **`origin/cursor/dev-env-setup-9ccc`** (Merged): Setup changes are fully in `main` (merged in PR #2).
2. **`origin/cursor/security-hardening-48ae`** (Merged): Hardening changes are fully in `main` (merged in PR #3).
3. **`origin/cursor/mdr-full-implementation-4c80`** (Merged): MDR work is fully in `main`.
4. **`origin/cursor/mdr-v5-polish-4c80`** (Merged): MDR polish is fully in `main` (merged in PR #6).
5. **`origin/feature/add-memetic-warfare-game`** (Merged): Memetic warfare feature is fully in `main`.
6. **`origin/cursor/lemon-dom-d086`** (Code-Merged): Though the commit DAG has branched due to rebasing/cherry-picking, a direct code comparison verifies that all changes are already inside `main`. Keeping this branch invites confusion.
7. **`origin/cursor/fix-svg-mime-local-dev-f644`** (Obsolete/Redundant): The single line change (`.svg` mime registration) is already included in the active work branch `cursor/integrate-mdr-asset-pack-f644`.

---

## 5. Branches Needing Review

### `origin/cursor/integrate-mdr-asset-pack-f644` (Unmerged)
* **Last commit:** `b1f6642 feat: implement Million Dollar Receipt API and studio management server with D1 storage and UI assets`
* **Why it needs review:** This branch is the active feature development branch for the final phases of MDR. It contains the complete local SQLite / Cloudflare D1 integration, automated Piet Mode schedule cycling, the moderation desk, and Nothing Factory responsive asset rendering.
* **Important files modified:**
  * [scripts/studio-server.js](file:///C:/Users/JP/Desktop/portfol/scripts/studio-server.js) — CRUD endpoints for schedules, fragments, and moderation status triggers.
  * [mdr-api/server.js](file:///C:/Users/JP/Desktop/portfol/mdr-api/server.js) & [mdr-api/worker.js](file:///C:/Users/JP/Desktop/portfol/mdr-api/worker.js) — Local server SQLite schema and Cloudflare Worker D1 storage handlers.
  * [studio/mutation-desk.html](file:///C:/Users/JP/Desktop/portfol/studio/mutation-desk.html) & [studio/mdr-moderation.html](file:///C:/Users/JP/Desktop/portfol/studio/mdr-moderation.html) — Management interfaces.
  * WebP and SVG files under `images/mdr/mdr-nothing-factory-assets/` and `million-dollar-receipt/assets/machine/`.
* **Recommended Action:** Leave remote and local branches intact. Complete manual/automatic verification of Phase 3, and merge this branch into `main` using standard PR workflows.

---

## 6. Branches to Keep

* **`origin/main`** (Trunk): Main branch.
* **`origin/backup/pre-cleanup-2026-06-11`** (Backup): Safety rollback branch containing the pre-cleanup repository state.

---

## 7. Branches to Archive or Tag

Before deleting `origin/cursor/simplify-machine-composition-f644`, create a git tag to preserve its commit history. This branch contains layout modifications to the older SVG-based conveyor kiosk that were replaced by the webp assets in the main asset pack branch.

* **Archive tag name:** `archive/cursor/simplify-machine-composition-f644`
* **Command:**
  ```bash
  git tag archive/cursor/simplify-machine-composition-f644 origin/cursor/simplify-machine-composition-f644
  git push origin tag archive/cursor/simplify-machine-composition-f644
  ```

---

## 8. Proposed Deletion Commands

Run these commands to clean up the repository. **Do not run these commands automatically.** Review the branch statuses first.

### Step 8.1: Tag and Delete Stale Unmerged/Obsolete Branches
```bash
# Archive the old SVG machine composition branch
git tag archive/cursor/simplify-machine-composition-f644 origin/cursor/simplify-machine-composition-f644
git push origin tag archive/cursor/simplify-machine-composition-f644

# Delete remote obsolete/merged branches
git push origin --delete cursor/simplify-machine-composition-f644
git push origin --delete cursor/lemon-dom-d086
git push origin --delete cursor/fix-svg-mime-local-dev-f644
git push origin --delete cursor/mdr-v5-polish-4c80
git push origin --delete cursor/mdr-full-implementation-4c80
git push origin --delete cursor/security-hardening-48ae
git push origin --delete cursor/dev-env-setup-9ccc
git push origin --delete feature/add-memetic-warfare-game
```

### Step 8.2: Clean Up Local Branches
```bash
# Delete local obsolete/merged branches
git branch -d cursor/simplify-machine-composition-f644
git branch -d cursor/lemon-dom-d086
git branch -d cursor/fix-svg-mime-local-dev-f644
git branch -d cursor/mdr-v5-polish-4c80
git branch -d cursor/mdr-full-implementation-4c80
git branch -d cursor/security-hardening-48ae
git branch -d cursor/dev-env-setup-9ccc
git branch -d feature/add-memetic-warfare-game
```
*(Note: If Git prevents deletion for local branches that it perceives as unmerged due to commit hash differences (e.g. `cursor/lemon-dom-d086`), use `git branch -D <branch_name>` after validating that no local work is lost).*

---

## 9. Risks and Notes

* **Data Preservation:** The files under `content/` (specifically `projects.json`, `categories.json`, and `million-dollar-receipt.json`) are the core data stores of the static portfolio and MDR site. None of the deleted branches contain unmerged changes to these files, ensuring no portfolio items or database configurations are lost.
* **Asset Health:** The active branch `cursor/integrate-mdr-asset-pack-f644` contains a large number of images under `images/**`. Be sure to run `node scripts/media-health.js` after merging it to ensure all images are linked correctly.
* **Studio Behavior:** The moderation dashboard and Mutation Desk depend on local backend endpoints registered in `scripts/studio-server.js`. Deleting the old `fix-svg-mime-local-dev-f644` branch does not impact the Studio because `integrate-mdr-asset-pack-f644` is fully up-to-date with the SVG mime registration and all other server features.
