# Agents

See `AGENT_RULES.md` for repository-level agent guidelines (do/don't rules, content change checklist, generated file policy).

See `LEMONTEED_ENGINE.md` for architecture overview, build pipeline, and image pipeline details.

See `STUDIO.md` for Studio features and local start instructions.

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

### Key scripts (all run from repo root)

| Command | Purpose |
|---------|---------|
| `node scripts/content-validation.js` | Validate content JSON |
| `node scripts/build-gallery.js` | Rebuild generated gallery data files |
| `node scripts/media-health.js` | Report missing/unused image files |
| `node scripts/generate-image-variants.js` | Regenerate responsive image variants |
| `node scripts/build-live-experiment.js` | Rebuild live experiment data |
| `node scripts/build-lemonteed-fm.js` | Rebuild Lemonteed FM data |

### Notes

- There is no `package.json` and no npm dependencies. All scripts use Node.js built-in modules only.
- There are no automated test suites. Validate changes with `node scripts/content-validation.js` and the Studio validation API (`GET /api/validation`).
- There is no linter configured. Code style is vanilla JavaScript following existing patterns in the repo.
- The public site is purely static HTML/CSS/JS. Do not introduce frameworks or build tools for the public output.
