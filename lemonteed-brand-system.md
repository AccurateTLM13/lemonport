# Lemonteed Brand System (v1)

A lightweight reference, not a redesign brief. Goal: give every page — old or new — the same bones, without forcing a visual overhaul on pages that aren't due one yet. Apply this incrementally, page by page, as each one comes up for work.

---

## 1. The Concept (already there, just needs naming)

Lemonteed is a **personal internet universe**, not a product site or a portfolio. The homepage literally calls sections "zones" — What If Woods, Memetic Arena, Archive Cavern, Junk Drawer District, VRG Vault, FM Tower, Studio Lab, Coming Soon Crater. That's a real world-building conceit and it's the single strongest asset the brand has. Every page should read like a **room in that universe**, run by an "Operator" (Lemmy), not like a corporate site with a blog bolted on.

**Rule of thumb:** if a piece of copy or UI could belong on any generic SaaS site, it's underperforming the brand. If it sounds like a slightly unhinged workshop log written by someone who takes their weird hobby seriously, it's on-brand.

## 2. Voice & Tone

- Dry, self-aware, a little deadpan. ("The drawer that never quite closes." / "Financial incentives have compromised our neutrality.")
- First-person, workshop/lab framing — "on the bench," "in the drawer," "on top of the pile," "the record."
- Confident, not hedgy. Say what a thing does, then let the dry humor do the disclaiming (see Junk Drawer's ad section) rather than stacking earnest caveats.
- Status labels double as jokes when possible ("STATUS: OFF CLOCK" instead of a plain "last updated" line).

## 3. Color Roles

Standardize these as *roles*, not fixed hexes, so every page can keep its local palette but use color the same way:

| Role | Use | Current examples |
|---|---|---|
| **Base** | Cream/off-white page background | consistent already ✅ |
| **Ink** | Near-black for headers/body | consistent already ✅ |
| **Accent (brand)** | Mustard yellow — logo, primary CTAs, the Lemmy mascot | consistent already ✅ |
| **Surface-dark** | Near-black panel background for "live / active" content blocks | new in Studio Lab v2 — worth reusing anywhere content is "current" |
| **Status: Shipped** | Green outline pill | keep |
| **Status: Archived** | Neutral tan/gray outline pill | keep |
| **Status: Later / Planned** | Cool (lavender/blue) outline pill | keep |
| **Category accent** | One distinct outline color per content category (Lighthouse Handoff=blue, Locailly=green, Watchdog=amber) | keep — this is doing real work as a filing system |

**One fix worth making everywhere, low-risk:** all tags/pills should share *one* shape and weight (outlined rectangle, mono uppercase, same padding) even as the color varies by meaning. Right now some pages do solid-fill pills, some do outlines, some do plain bracketed text — pick outlined-pill as the one form and let color carry the meaning.

## 4. Typography

- **Headers:** heavy black grotesk/slab, all-caps or title-case, large — this is already distinctive and shouldn't change.
- **Eyebrow labels:** small mono, all-caps, tracked out — `[ WORKSHOP / LAB BENCH ]`, `District 04 / Browser Tools & Useful Debris`. This "ZONE / SUBSECTION" breadcrumb pattern already exists on multiple pages — formalize it as the standard page-top label everywhere.
- **Body:** plain sans, no styling tricks. Keep body copy as the quiet register that lets headers and mono labels do the personality work.

## 5. Component Patterns to Standardize

- **Pill/tag:** outlined rectangle, mono uppercase, one shared size — color = meaning (status) or category (topic).
- **Card:** eyebrow label → category pill → status pill → title → 1–2 line description → button row. This shape already repeats across Studio Lab and Junk Drawer; keep it as *the* card.
- **Dark "active" panel vs. light "reference" panel:** use a dark surface block specifically for "what's happening right now" content (latest builds, current activity), and keep structural/reference content (registers, tables, archives) on the light base. Don't mix the two inside one block — that was the seam in the Studio Lab v2 review.
- **Button hierarchy:** one solid-black/solid-accent primary button per section max; everything else outlined. Right now some pages have 4–5 equally-weighted CTAs competing for attention — cap it at one clear "main" action per block.
- **Sidebar nav:** the Workbench → Filters/Categories → Experiments → Junk Drawer stack (seen on Studio Lab and Junk Drawer) is a good repeatable left-rail pattern. Worth reusing as the standard nav shape on any page dense enough to need one.

## 6. Lemmy (the mascot)

Lemmy should have a **job**, not just be decorative. Current best use: the "Lab Operator" speech-bubble callout at the bottom of Studio Lab v2 — Lemmy as narrator/guide offering the next action. Reuse that pattern (small avatar + quote + 1-2 CTAs) as the standard way Lemmy appears, instead of a large static image floating in a corner with no relationship to nearby content.

## 7. What NOT to Touch Yet

This is meant to be additive, so pages not due for a makeover should be left alone rather than partially "fixed" — a half-migrated page (new pill style, old card layout) reads worse than a consistently old one. When a page does come up:
1. Apply the eyebrow/breadcrumb label pattern.
2. Normalize pills to the outlined-pill shape (keep existing colors/meanings).
3. Cap CTAs to one primary + outlined secondaries.
4. If Lemmy appears, move him into the "Operator" quote-block pattern.
5. Only then consider bigger layout changes (dark panels, card grids, etc.) — those are the expensive part and should wait for that page's actual makeover turn.

---

**Bottom line:** the brand isn't broken — it's a solid, distinctive "internet lab universe" concept with dry humor and a mustard/cream/black palette. It just got built page-by-page without a shared component vocabulary. This doc is that vocabulary; apply it incrementally so no page gets destroyed on the way to consistency.
