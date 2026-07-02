# Agents

See `AGENT_RULES.md` for repository-level agent guidelines (do/don't rules, content change checklist, generated file policy).

See `LEMONTEED_ENGINE.md` for architecture overview, build pipeline, and image pipeline details.

See `STUDIO.md` for Studio features and local start instructions.

See `agents/README.md` for the Lemonteed Production Pipeline, a local workflow system for planning, building, reviewing, and polishing development/design/content tasks without changing the public static-site architecture.

## Cursor Cloud specific instructions

### System dependency

ImageMagick must be available as the `magick` CLI command. The Studio server and image variant scripts call `magick identify` and `magick <input> ... <output>` (ImageMagick 7 syntax). On Ubuntu/Debian where only ImageMagick 6 is packaged, install `imagemagick` and add a wrapper script at `/usr/local/bin/magick` that dispatches to the IM6 binaries (`identify`, `convert`, etc.). The update script handles this automatically.

### Running the dev server

```bash
node scripts/studio-server.js
```

- Public site: `http://localhost:5173/`
- Studio CMS: `http://localhost:5173/studio/`
- The port can be overridden with the `PORT` environment variable.
- By default the server binds to `127.0.0.1` only. Set `STUDIO_ALLOW_REMOTE=1` to listen on all interfaces, which requires `STUDIO_WRITE_TOKEN` for mutating `/api/*` requests.
- Optional hardening: set `STUDIO_WRITE_TOKEN` locally and send `Authorization: Bearer <token>` from Studio write requests.

### Running the MDR API server (SQLite local option)

```bash
node --experimental-sqlite mdr-api/server.js
```

- Local API base: `http://localhost:8787`
- Uses native `node:sqlite` database stored at `mdr-api/data/receipts.db`.
- Requires Node.js v22.12.0+ and the `--experimental-sqlite` flag.

### Running the MDR API server (Cloudflare Worker + D1 option)

For staging/production or local Worker testing:

```bash
# Initialize local D1 database schema
npx wrangler d1 execute DB --local --file=schema.sql --config mdr-api/wrangler.toml

# Start the local worker emulator
npx wrangler dev --local --port 8788 --config mdr-api/wrangler.toml
```

- Worker API base: `http://localhost:8788`
- Requires wrangler CLI. Binding secrets can be set with `wrangler secret put` or inside `wrangler.toml`.
- Automatically lazy-seeds the database from `content/million-dollar-receipt.json` on the first query if the database is empty.

### Key scripts (all run from repo root)

| Command | Purpose |
|---------|---------|
| `node scripts/content-validation.js` | Validate content JSON |
| `node scripts/site-completion-audit.js` | Multi-track site completion + SEO readiness audit |
| `node scripts/build-gallery.js` | Rebuild generated gallery data files |
| `node scripts/media-health.js` | Report missing/unused image files |
| `node scripts/generate-image-variants.js` | Regenerate responsive image variants |
| `node scripts/build-live-experiment.js` | Rebuild live experiment data |
| `node scripts/build-lemonteed-fm.js` | Rebuild Lemonteed FM data |
| `node scripts/build-mdr.js` | Rebuild Million Dollar Receipt config |
| `node scripts/build-mdr-stats.js` | Rebuild Million Dollar Receipt stats |
| `node scripts/promote-operator-mutation.js` | Promote active operator log phase |
| `node scripts/install-mdr-assets.js` | Install responsive assets for MDR |
| `node --experimental-sqlite mdr-api/server.js` | Start the Million Dollar Receipt SQLite API backend |

### Notes

- There is no `package.json` and no npm dependencies. All scripts use Node.js built-in modules only.
- There are no automated test suites. Validate changes with `node scripts/content-validation.js`, `node scripts/site-completion-audit.js`, and the Studio validation API (`GET /api/validation`).
- There is no linter configured. Code style is vanilla JavaScript following existing patterns in the repo.
- The public site is purely static HTML/CSS/JS. Do not introduce frameworks or build tools for the public output.

## Documentation updates & progress tracking

To support concurrent work streams and seamless handoffs between agent runs:
- **Continuous Documentation**: Anytime a new project, subpage, script, or database file is added, update the relevant documentation (`AGENTS.md`, `AGENT_RULES.md`, `LEMONTEED_ENGINE.md`, or `STUDIO.md`) immediately so that the documentation matches the actual codebase state at all times.
- **Incremental Progress Tracking**: When implementing multi-phase or complex features, update the **Active Projects & Feature Progress** section below after completing each phase or sub-feature. Always clearly state:
  1. What was completed in the current phase.
  2. The exact current state of the codebase.
  3. The next steps and pending tasks for the next phase.
  This allows anyone (the owner or a subsequent agent) to pick up right where the previous session ended.

## Active Projects & Feature Progress

### Phased Hardening of Million Dollar Receipt (MDR)

* **Status: Archived (public launch on hold)**
  * Backend phases 1–3 remain in the repo for local/studio use, but public launch is paused while a better launch shape is planned. `content/million-dollar-receipt.json` still has `"launched": false` and empty `apiBase`.
* **Phase 1: Local SQLite Server & Warnings (Completed)**
  * **Completed:** Integrated native `node:sqlite` in `mdr-api/store.js` to store receipts. Added a simulated checkout warning banner and dynamically overridden checkout submit buttons in `assets/js/mdr.js` when running locally or in mock mode.
* **Phase 2: Cloudflare Workers & D1 Integration (Completed)**
  * **Completed:** Implemented the Cloudflare Workers + D1 version of the MDR API backend as a secondary deployable option, refactoring `mdr-api/handlers.js` to use asynchronous global Web Crypto `crypto.subtle` operations. Created `mdr-api/store-d1.js` for async D1 bindings, updated `mdr-api/worker.js` with lazy-seeding, and configured `mdr-api/wrangler.toml` with `nodejs_compat`.
  * **Codebase State:** Fully refactored asynchronous API backend supporting both local Node.js + SQLite (`server.js`) and Cloudflare Workers + D1 (`worker.js`). Local testing verified successfully.
* **Phase 3: Feature Completeness & Moderation (Completed)**
  * **Completed:**
    * **Piet Mode Schedule Cycling:** Replaced manual toggle with visitor-local time checks (11 PM - 5 AM) and automated segment cycling. Provided debug hours query parameters support (`?debug=1&piet_hour=H`) to mock time zones and verify highlights.
    * **Mutation Desk CRUD:** Implemented POST, PATCH, DELETE schedule routes, and list/read/write/delete fragment endpoints in `studio-server.js`. Designed a premium tabbed interface in `mutation-desk.html` allowing visual management of scheduled phases and direct JSON fragment editing.
    * **MDR Moderation Desk:** Added message moderation status support in SQLite (`store.js`) and D1 (`store-d1.js`) stores. Wired moderation list and status toggle endpoints in `handlers.js`. Built a premium moderation panel in `studio/mdr-moderation.html` to approve/reject messages with real-time feedback.
  * **Codebase State:** End-to-end integration verified successfully. All configurations compile cleanly. Public launch archived pending a better idea.

### Studio Lab + Junk Drawer Refresh (Completed)

* **Completed:**
  * **Website Roast archived:** Live Experiment `currentBet` and get-involved links no longer point to missing `/website-roast/`.
  * **Junk Drawer redesign:** Lighthouse Handoff is the premier featured tool. Drawer-style hero, compartment cards, dead `+ INFO` button removed. Added FreeSource (`/free-source/`) as Slot D card in the drawer.
  * **Character Supply added:** Added `/junk-drawer/character-supply/` as a Junk Drawer utility page for HTML special characters, entities, code points, and CSS escapes.
  * **Studio Lab page:** Public `/studio-lab/` hub listing shipped/archived/planned projects. Homepage world-map zone routes here instead of `/operator-log/`.
  * **Live Experiment archived:** Matches MDR treatment — `noindex`, `robots.txt` disallow, removed from sitemap and public navigation. Studio Lab lists it as archived.
  * **Sitemap:** Added `/studio-lab/`, junk-drawer routes, `/lighthouse-handoff/`, and `/free-source/`.
* **Next steps:**
  * **Bench Radio (later):** Clickable radio on Studio Lab that streams Lemonteed FM while browsing projects.
