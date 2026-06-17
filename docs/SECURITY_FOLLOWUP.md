# Security Hardening Follow-Up

This document tracks security work completed in the hardening pass and remaining items for a follow-up agent or maintainer.

## Completed in this pass

- Production deploy excludes and removes `content/`, `studio/`, `scripts/`, and Studio temp/backup dirs.
- Apache rewrite rules return 403 for CMS paths if they exist on the host.
- Content-Security-Policy is enforced (no longer report-only) with SoundCloud widget domains.
- Studio server binds to `127.0.0.1` by default; remote bind requires `STUDIO_WRITE_TOKEN`.
- Shared URL/path helpers in `scripts/security-utils.js`.
- Live Experiment and Lemonteed FM URL validation at build time and safe client rendering.
- Junk-drawer tools no longer inject filenames into inline handlers.
- Image converter page logic moved to `/assets/js/image-converter.js` (no inline scripts).
- HEIC decoding uses self-hosted `heic-to` CSP build (`/assets/js/heic-to-csp.js`) instead of `heic2any`, avoiding `unsafe-eval`.
- CSP includes `worker-src 'self' blob:` so HEIC conversion can spawn its Web Worker.

## Verify after deploy

1. Confirm production URLs return 403/404:
   - `/content/projects.json`
   - `/studio/`
   - `/scripts/studio-server.js`
2. Confirm public pages still load analytics, fonts, and Lemonteed FM SoundCloud embeds.
3. Check browser devtools console for CSP violations on:
   - `/`
   - `/lemonteed-fm/`
   - `/junk-drawer/image-converter/`

If CSP blocks a legitimate asset, add the minimum required host to `.htaccess` and document why.

## Remaining items (not implemented)

### Studio write token in the browser UI

**Status:** Backend supports `STUDIO_WRITE_TOKEN`, but `studio/studio.js` does not yet attach the bearer token to fetch calls.

**Route options:**

1. Prompt once per session and store in `sessionStorage`.
2. Read from a local-only env-injected config file (not deployed).
3. Keep tokenless localhost-only workflow as the default dev path.

### ImageMagick resource limits

**Status:** Not implemented.

**Risk:** Large or malicious uploads could consume CPU/memory during `magick` conversion.

**Route options:**

1. Add ImageMagick `policy.xml` limits on dev/CI machines.
2. Reject uploads above dimension/file-size thresholds before invoking ImageMagick.
3. Run conversions with OS-level timeouts (`timeout` command wrapper).

### Rate limiting and request logging

**Status:** Not implemented on Studio APIs.

**Route options:**

1. Simple in-memory rate limiter per IP for mutating routes.
2. Reverse proxy rate limiting if Studio is ever exposed intentionally.

### Operator Log access control

**Status:** Intentionally theatrical (`localStorage` unlock only).

**Note:** Do not treat `requiresUnlock` as real protection. Sensitive fragments should not be committed if true secrecy is required.

### Already-deployed CMS files on Bluehost

**Status:** The deploy workflow now deletes CMS paths before rsync.

**Follow-up:** After the first hardening deploy lands on `main`, manually verify old files were removed. If `rm -rf` fails due to permissions, SSH in and delete:

- `content/`
- `studio/`
- `scripts/`

### CSP tuning for third-party services

**Status:** Initial enforce policy added.

**Watch for:** Cloudflare Browser Insights, future embeds, or new CDN scripts. Report-only logging can be temporarily re-enabled while tuning:

```apache
Header always set Content-Security-Policy-Report-Only "..."
```

## Validation commands

```bash
node scripts/content-validation.js
node scripts/build-live-experiment.js
node scripts/build-lemonteed-fm.js
node scripts/build-gallery.js
```

## Rollback notes

- Revert `.htaccess` CSP header to `Content-Security-Policy-Report-Only` if production breaks.
- Revert deploy exclusions only if production intentionally serves CMS paths (not recommended).
- Studio localhost bind can be overridden with `STUDIO_HOST=0.0.0.0` or `STUDIO_ALLOW_REMOTE=1` plus token.
