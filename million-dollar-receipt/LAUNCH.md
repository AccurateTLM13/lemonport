# Million Dollar Receipt — Launch Checklist

This feature stays hidden until explicitly approved for public launch.

## Pre-launch (current state)

- [x] Hidden page at `/million-dollar-receipt/` (direct URL only)
- [x] `noindex, nofollow` on all MDR pages
- [x] `robots.txt` Disallow for `/million-dollar-receipt/`
- [x] Omitted from sidebar, homepage zones, and sitemap
- [x] Mock/preview checkout flow with lemon conveyor animation
- [x] External API scaffold in `mdr-api/` (local dev + deployment docs)

## Approval-gated launch steps

Only complete these after explicit owner approval:

1. Set `"launched": true` in `content/million-dollar-receipt.json`
2. Remove `noindex, nofollow` from MDR HTML pages
3. Remove `Disallow: /million-dollar-receipt/` from `robots.txt`
4. Add sidebar link to all pages with `category-nav`
5. Add homepage zone in `index.html` and `assets/js/world-map.js`
6. Add URLs to `sitemap.xml`
7. Set `apiBase` to production API URL and deploy `mdr-api/`
8. Configure Stripe live keys and webhook endpoint
9. Add gallery artifact in `content/projects.json` (Published) and rebuild gallery
10. Create OG image at `images/og/million-dollar-receipt.webp`
11. Run `node scripts/content-validation.js` and manual payment smoke test
