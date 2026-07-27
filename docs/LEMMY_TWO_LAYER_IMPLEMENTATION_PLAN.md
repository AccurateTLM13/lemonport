# Lemmy Two-Layer Implementation Plan

## Delivery Target

Add Lemmy as one character with two deliberately different authority levels:

- Public Lemmy is a deterministic, browser-only guide and mascot.
- Studio Lemmy is a local/private archive health assistant that can only invoke explicit, validated Studio operations.

This plan is for implementation by GPT-5.6 Luna High agents using high reasoning. That runtime was not available during planning, so the plan was grounded directly in the current repository instead.

## Current Repository Facts

- The public site is static HTML, CSS, and JavaScript.
- The homepage already renders `images/home/lemon-mascot.webp` as the decorative `.prop-lemon` image and moves it through `assets/js/world-map.js`.
- The public Studio-themed area is `/studio-lab/`; the private management interface is `/studio/`. These are separate Lemmy zones.
- Studio already exposes structured project, validation, media-health, rebuild, and image-regeneration behavior through `scripts/studio-server.js`.
- Studio mutations already pass through `assertWriteAuthorized()`, which enforces same-origin checks and the optional `STUDIO_WRITE_TOKEN`.
- Gallery behavior is in `assets/js/gallery.js`, FM behavior is in `lemonteed-fm/lemonteed-fm.js`, and Memetic Warfare behavior is in `assets/js/memetic-game.js`.
- No public 404 page exists. Lemmy behavior/config files now live in `content/lemmy.json`, `assets/js/lemmy.js`, and `assets/css/lemmy.css`.
- The supplied Codex Pet library is the approved Lemmy art direction. Eleven transparent named pose assets currently live under `images/lemmy/poses/`; new states remain explicit asset additions, not something implementation agents should silently invent.

## Non-Negotiable Boundaries

- No public model calls, public API key, public server dependency, framework, database, or remote assistant backend.
- Public dialogue and destinations are authored data. Randomness only selects from validated authored choices.
- Lemmy must not intercept global page clicks, block navigation, auto-navigate, or repeatedly demand attention.
- Public Lemmy stores only local presentation preferences. It must not store page history, form input, artifact metadata, or dialogue transcripts.
- Studio Lemmy must not receive a shell, filesystem path, arbitrary URL, arbitrary endpoint, or free-form file-edit tool.
- A model, if added later, may select only from the same server-side operation allowlist used by button-driven actions. The server remains authoritative.
- Mutating Studio operations require an explicit user click and confirmation where the existing Studio action is destructive or expensive.
- Generated files are rebuilt, never hand-maintained.

## Durable Architecture Decisions

### Public file layout

Use repository conventions rather than a new mixed asset folder:

```text
content/lemmy.json                 # canonical authored behavior
scripts/build-lemmy.js             # validation + generated-data build
assets/js/lemmy-data.js            # generated browser global
assets/js/lemmy.js                 # reusable browser behavior engine
assets/css/lemmy.css               # reusable character/panel styling
images/lemmy/poses/                # approved transparent public pose assets
```

For public Lemmy, reference the approved `/images/lemmy/poses/idle.webp` state and map additional authored states through `content/lemmy.json`. The original homepage lemon remains separate site art.

### Studio file layout

Keep the UI in the existing Studio surface and isolate server-side health/action logic:

```text
scripts/lemmy-health.js            # pure structured issue collector
scripts/lemmy-actions.js           # explicit operation allowlist, added only in Pass 5
scripts/studio-server.js           # routes only; delegates to helpers
studio/index.html                  # Lemmy workspace/panel markup
studio/studio.js                   # UI state and existing Studio action integration
studio/studio.css                  # Studio-specific Lemmy presentation
```

Do not create a second Studio API client or expose a general-purpose global API bridge. Extend the current `studio.js` IIFE so it continues to use the existing token-aware `api()` helper, `setWorkspace()`, `openEditor()`, and project state.

### Public data delivery

`scripts/build-lemmy.js` reads and validates `content/lemmy.json`, then writes:

```js
window.LEMMY_DATA = { /* validated JSON */ };
```

Public pages load the generated data before `lemmy.js`. Do not fetch JSON at runtime. This keeps static hosting portable and makes missing network/server behavior irrelevant.

## Canonical Public Schema

Start with schema version `1`:

```json
{
  "schemaVersion": 1,
  "character": {
    "id": "lemmy",
    "name": "Lemmy",
    "title": "Lemonteed groundskeeper",
    "defaultAsset": "/images/home/lemon-mascot.webp"
  },
  "preferences": {
    "storageKey": "lemonteed.lemmy.v1",
    "ambientDelayMs": 12000,
    "dialogueCooldownMs": 90000
  },
  "destinations": [
    {
      "id": "strange",
      "label": "Something Strange",
      "hrefs": ["/what-if/", "/junk-drawer/"]
    },
    {
      "id": "useful",
      "label": "Something Useful",
      "hrefs": ["/junk-drawer/", "/lighthouse-handoff/", "/free-source/"]
    },
    {
      "id": "loud",
      "label": "Something Loud",
      "hrefs": ["/lemonteed-fm/", "/memetic-warfare/"]
    },
    {
      "id": "forgotten",
      "label": "Something Forgotten",
      "hrefs": ["/archive/?random=1"]
    },
    {
      "id": "surprise",
      "label": "Surprise Me",
      "hrefs": ["/archive/?random=1", "/what-if/", "/vrg-cards/", "/studio-lab/"]
    }
  ],
  "zones": {
    "home": {
      "enabled": true,
      "position": "bottom-left",
      "states": ["idle", "wave", "point"],
      "messages": ["Pick a zone. I keep the paths mostly clear."],
      "destinationIds": ["strange", "useful", "loud", "forgotten", "surprise"]
    }
  }
}
```

The build script must reject:

- Unsupported schema versions.
- Unknown zone, state, position, or destination IDs.
- Duplicate IDs.
- Missing/empty required strings or arrays.
- External, protocol-relative, `javascript:`, `data:`, or traversal destinations.
- Missing referenced assets.
- Timing values outside documented safe ranges.
- A zone referring to a missing destination.

Keep allowed zone keys explicit:

```text
home
studio-lab
junk-drawer
fm
vrg-vault
memetic-warfare
what-if
error
studio
```

`error` stays disabled until a real public error page exists.

## Public Behavior Contract

### State machine

Use a small explicit state machine:

```text
disabled -> idle -> invited -> idle
                   |
                   -> minimized -> idle
```

- `disabled`: configuration is absent/invalid or the current zone is disabled.
- `idle`: visible, non-speaking, and non-blocking.
- `invited`: opened only by activating Lemmy; contains the page guide and destination choices.
- `minimized`: user-selected compact state, persisted locally.

Ambient/reaction animations are visual substates, not new authority levels.

### Homepage integration

- Add `data-lemmy-zone="home"` to the homepage body.
- Enhance the existing `.prop-lemon` instead of injecting a second mascot.
- Convert the mascot into a semantic button or wrap it in one with the accessible name `Open Lemmy, the Lemonteed groundskeeper`.
- Keep the existing parallax transform working, but override `.prop { pointer-events: none; }` only for the Lemmy trigger.
- Place the invited panel so it cannot overlap the existing zone drawer.
- On mobile, place Lemmy above the 112px zone dock or start minimized. Never hide the only control without a user-accessible way to restore it.
- Update cache-busting versions on the affected stylesheet/script tags.

### Accessibility and motion

- Button and panel controls are at least 44px.
- Invited panel has a labelled heading, close control, Escape support, deterministic focus return, and no focus trap unless implemented and tested correctly.
- Ambient changes do not use an assertive live region.
- User-invited dialogue may use `role="status"` or a polite live region.
- Honor `prefers-reduced-motion: reduce` by disabling transforms, walking, dancing, bobbing, and timed visual entrances.
- Pause timers while `document.hidden` and restart without immediately firing missed dialogue.
- Do not rely on hover for any required behavior.

### Browser event API

Standardize authored reactions on namespaced events:

```js
document.dispatchEvent(new CustomEvent("lemonteed:artifact-opened", {
  detail: { id: item.id, category: item.category }
}));
```

Approved public event names:

```text
lemonteed:zone-inspected
lemonteed:artifact-opened
lemonteed:gallery-empty
lemonteed:track-started
lemonteed:game-started
lemonteed:download-completed
```

Event payloads contain only authored public identifiers. `lemmy.js` listens for these events; it does not reach into page-specific private variables or scrape form fields.

## Studio Health Contract

Add `GET /api/lemmy/health`. It is read-only and combines repository facts into stable issue codes.

Response shape:

```json
{
  "generatedAt": "ISO-8601 timestamp",
  "summary": {
    "drafts": 0,
    "ready": 0,
    "missingAlt": 0,
    "brokenRelated": 0,
    "missingMedia": 0,
    "missingVariants": 0,
    "validationErrors": 0,
    "validationWarnings": 0
  },
  "issues": [
    {
      "code": "PROJECT_MISSING_ALT",
      "severity": "warning",
      "projectId": "misc-001",
      "field": "alt",
      "message": "AI Gardening is missing alt text.",
      "suggestedAction": {
        "type": "open-record",
        "projectId": "misc-001"
      }
    }
  ]
}
```

Initial issue-code allowlist:

```text
PROJECT_MISSING_ALT
PROJECT_MISSING_DESCRIPTION
PROJECT_BROKEN_RELATED
PROJECT_MISSING_IMAGE
PROJECT_MISSING_THUMBNAIL
PROJECT_MISSING_VARIANT
PROJECT_DRAFT
PROJECT_READY
ARCHIVE_VALIDATION_ERROR
ARCHIVE_VALIDATION_WARNING
```

Requirements:

- `scripts/lemmy-health.js` is pure/read-only apart from filesystem reads already required by validation/media health.
- Reuse `validateContent()`, `mediaHealth()`, `galleryWidths`, and canonical project/category loaders.
- Do not infer a project ID by parsing free-form validation text. Collect project-scoped codes from structured project iteration.
- Sort issues deterministically by severity, project ID, and code.
- Cap the default returned issue list and support a bounded `limit` query parameter if needed.
- Escape all messages when rendering in Studio; do not inject server strings through `innerHTML` without escaping.

Studio UI behavior:

- Add a `Lemmy` workspace to the existing Studio rail and workspace label map.
- Show a static Lemmy image, summary, prioritized issue list, refresh control, and read-only action buttons.
- `Open Record` uses the existing `setWorkspace("library")` and `openEditor(projectId)`.
- `Open Media Health` and `Open Build Report` navigate to existing workspaces.
- Empty state says the archive has no detected Lemmy issues; it must not claim the repository is deploy-ready unless the standard checks also pass.
- V1 dialogue is deterministic templating over structured results. Do not add a model dependency in Pass 4.

## Studio Action Contract

Pass 5 adds a server-side dispatcher. Accept only:

```json
{
  "operation": "rebuild-gallery",
  "arguments": {}
}
```

Initial operation allowlist:

| Operation | Authority | Confirmation | Server implementation |
| --- | --- | --- | --- |
| `validate-archive` | Read-only | No | Reuse `validateContent()` |
| `refresh-health` | Read-only | No | Reuse Lemmy health collector |
| `rebuild-gallery` | Mutating generated output | Yes | Reuse `build()` |
| `regenerate-project-variants` | Mutating media + metadata | Yes | Reuse existing project variant helper |
| `open-record` | Client navigation only | No | Never sent to server |

Do not include delete, arbitrary metadata rewrite, bulk status change, arbitrary file path, arbitrary command, or arbitrary URL in the first action release.

Action endpoint requirements:

- Route: `POST /api/lemmy/actions`.
- Continue through `assertWriteAuthorized()`.
- Validate operation name and exact argument keys; reject unknown keys.
- Validate project IDs against canonical project data.
- Apply bounded array sizes and request size limits.
- Return a structured result with operation, success, summary, affected project IDs, warnings, and validation state.
- Preserve existing backups and rebuild semantics.
- Disable the initiating button while running and prevent duplicate submission.
- Show a confirmation describing files/output affected before each mutation.
- Refresh projects and Lemmy health after success.
- A failed action returns an error and leaves the panel usable.

No model integration is required for Pass 5. If a local model is proposed later, create a separate architecture decision covering provider, prompt/data exposure, context limits, operation selection, confirmation, audit logging, and failure behavior.

## Implementation Slices

### Slice 0 — Asset and contract gate

Owner: Orchestrator + Design Worker.

Tasks:

- Confirm the existing sunglass lemon is the intended Lemmy identity.
- Approve use of the current 219×219 WebP for the homepage MVP.
- Define whether future poses are separate images, a sprite sheet, or CSS-only transforms.
- Freeze the schema, destination labels, zone names, and public event names above.

Stop condition: if the character identity is wrong, do not build additional poses or copy.

### Slice 1 — Homepage deterministic MVP

Owner: GPT-5.6 Luna High Implementation Worker, high reasoning.

Allowed files:

```text
content/lemmy.json
scripts/build-lemmy.js
assets/js/lemmy-data.js
assets/js/lemmy.js
assets/css/lemmy.css
index.html
assets/js/world-map.js
assets/css/world-map.css
AGENT_RULES.md
LEMONTEED_ENGINE.md
```

Tasks:

1. Implement config validation and generation first.
2. Add the homepage zone and script/style tags.
3. Enhance the existing mascot into the Lemmy trigger.
4. Implement invited navigation, minimize/restore, focus behavior, reduced motion, and safe local persistence.
5. Keep ambient speech off by default in the first shippable version.
6. Add the generated file to repository documentation.

Acceptance:

- Homepage works with JavaScript disabled except for Lemmy.
- With JavaScript enabled, Lemmy opens only after user activation.
- Each destination is a normal safe link and modified-click behavior remains normal.
- No second mascot is rendered.
- Existing zone drawer, parallax, mobile dock, and map navigation continue working.
- A missing/empty `window.LEMMY_DATA` causes a clean no-op with no console error.

### Slice 2 — Public zones and reactions

Owner: one GPT-5.6 Luna High Implementation Worker per non-overlapping page group; high reasoning. Merge sequentially through the orchestrator.

Page groups:

```text
Archive/gallery: archive/, what-if/, vrg-cards/, assets/js/gallery.js
Junk Drawer: junk-drawer/ and its page-owned script/CSS
FM: lemonteed-fm/index.html, lemonteed-fm/lemonteed-fm.js, lemonteed-fm/lemonteed-fm.css
Memetic Warfare: memetic-warfare/index.html, assets/js/memetic-game.js, assets/css/memetic-game.css
Studio Lab: studio-lab/index.html and its page-owned styling
```

Tasks:

- Add `data-lemmy-zone`, shared Lemmy assets, and the minimum page-owned event dispatches.
- Add authored messages/states to `content/lemmy.json`, then rebuild.
- Use the supplied approved pose assets through `character.stateAssets`; do not create a new visual language or ship the source turquoise matte backgrounds.
- Add a real `error` zone only when a tracked public error page exists.

Acceptance:

- Every reaction follows an actual page event, fires once per event, and respects cooldowns.
- Lemmy does not cover player controls, drawers, game controls, or mobile navigation.
- A page without zone config remains unchanged.
- Event additions do not change the underlying page behavior.

### Slice 3 — Studio read-only health assistant

Owner: GPT-5.6 Luna High Implementation Worker, high reasoning.

Allowed files:

```text
scripts/lemmy-health.js
scripts/studio-server.js
studio/index.html
studio/studio.js
studio/studio.css
STUDIO.md
LEMONTEED_ENGINE.md
AGENT_RULES.md
```

Tasks:

1. Implement and unit-check the pure issue collector.
2. Add `GET /api/lemmy/health`.
3. Add the Studio Lemmy workspace using the existing Studio API helper and internal navigation/editor functions.
4. Add deterministic summary language and safe empty/error/loading states.
5. Document the endpoint and read-only authority.

Acceptance:

- The endpoint never writes files.
- Counts match direct project inspection, validation, and media-health results.
- `Open Record` selects the correct project.
- Refresh does not duplicate issue cards or event handlers.
- Starting Studio without ImageMagick still allows read-only health unless an existing underlying check requires it; that limitation is shown accurately.

### Slice 4 — Approved Studio operations

Owner: GPT-5.6 Luna High Implementation Worker, high reasoning.

Allowed files:

```text
scripts/lemmy-actions.js
scripts/studio-server.js
studio/index.html
studio/studio.js
studio/studio.css
STUDIO.md
LEMONTEED_ENGINE.md
AGENT_RULES.md
```

Tasks:

- Implement only the initial operation allowlist.
- Reuse existing build and regeneration functions.
- Add confirmations, running states, structured results, and post-action refresh.
- Verify optional write-token handling through the existing `api()` helper.

Acceptance:

- Unknown operations and unknown arguments return HTTP 400.
- Cross-origin mutations return HTTP 403.
- Required write-token failures return HTTP 401.
- Duplicate clicks do not start duplicate work.
- Rebuild/regeneration results match the existing direct Studio operations.
- No action accepts a path, command, or URL.

### Slice 5 — Experience review and final QA

Owner: fresh GPT-5.6 Luna High Experience Director, then fresh GPT-5.6 Luna High QA Worker; high reasoning.

The reviewing agent must not be the implementation agent for the slice being reviewed.

Required automated checks:

```powershell
node --check assets/js/lemmy.js
node --check scripts/build-lemmy.js
node scripts/build-lemmy.js
node --check scripts/lemmy-health.js
node --check scripts/lemmy-actions.js
node --check scripts/studio-server.js
node --check studio/studio.js
node scripts/content-validation.js
node scripts/check.js
```

Run only commands relevant to completed slices; do not require nonexistent later-pass files during earlier passes.

Required served checks:

```text
GET /                         -> 200
GET /assets/js/lemmy-data.js  -> 200
GET /api/lemmy/health         -> 200 and no writes
POST /api/lemmy/actions       -> allowlisted operations only
GET /api/validation           -> existing behavior preserved
GET /api/media-health         -> existing behavior preserved
```

Browser matrix:

```text
Desktop: 1440×900
Tablet: 768×1024
Mobile: 390×844 and 360×800
Motion: normal and prefers-reduced-motion
Input: pointer and keyboard-only
```

Browser assertions:

- No console errors.
- No horizontal overflow caused by Lemmy.
- Homepage map, dock, and zone drawer remain usable.
- Invited panel opens/closes with click, Enter, Space, Escape, and close button.
- Focus returns to Lemmy.
- Minimize/restore persists after reload without hiding the restore control.
- Public events react once and respect cooldowns.
- Studio issue counts and target records are accurate.
- Mutation confirmations and error states are understandable.

## Agent Dispatch Rules

- Every agent starts by reading `AGENT_RULES.md`, `LEMONTEED_ENGINE.md`, `STUDIO.md`, `agents/SHARED_CONTEXT.md`, this plan, and its assigned worker file.
- Every agent checks `git status --short --branch` before editing and preserves unrelated changes.
- Implementation agents may edit only their slice’s allowed files unless the orchestrator explicitly expands scope.
- Do not run public and Studio implementation agents concurrently when both would edit `AGENT_RULES.md`, `LEMONTEED_ENGINE.md`, `studio-server.js`, or shared Lemmy files.
- Each implementation agent returns files changed, behavior implemented, commands run, results, and remaining risk.
- The orchestrator updates `agents/STATUS.md` after each accepted slice and records any changed boundary in `agents/DECISIONS.md`.
- A failed acceptance criterion returns the slice to its implementation owner; it is not deferred silently to QA.

## Rollback Boundaries

- Public Lemmy can be disabled per zone in `content/lemmy.json` and rebuilt.
- Homepage rollback removes Lemmy asset tags and restores the existing decorative mascot markup; map behavior remains independent.
- Studio read-only Lemmy can be removed without changing canonical content or generated gallery output.
- Studio actions are isolated behind one route/dispatcher; removing that route leaves existing direct Studio tools intact.
- No slice requires a data migration of `content/projects.json` or `content/categories.json`.

## Implementation Checkpoint — 2026-07-26

- Slices 1 and 2 are implemented with the supplied Codex Pet-derived transparent pose assets under `images/lemmy/poses/`; the homepage prop swap places cards left and Lemmy right.
- Slice 3 is implemented with `scripts/lemmy-health.js`, `GET /api/lemmy/health`, and the read-only Studio Lemmy workspace.
- Slice 4 is implemented with `scripts/lemmy-actions.js`, `POST /api/lemmy/actions`, exact operation/argument validation, existing authorization, UI confirmations, and post-action health refresh.
- Slice 5 experience/browser QA and the requirement audit passed at the specified breakpoints; the completion definition below is satisfied.

## Completion Definition

The two-layer feature is complete only when:

- Public Lemmy is deterministic, accessible, page-aware, and does not require a server or model.
- Studio Lemmy reports structured, accurate archive health.
- Approved Studio mutations are explicit, confirmed, allowlisted, and reuse existing validated operations.
- Public and Studio authority are visibly distinct.
- Documentation, generated-file policy, build steps, and validation all match the final code.
- Experience review and QA pass at the specified breakpoints.
