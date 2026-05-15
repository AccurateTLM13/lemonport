# Responsive System

## Purpose

This file documents the responsive rules for the Lemonteed archive, studio, tools, and standalone experiments. The goal is consistency without flattening the site's current visual identity.

## Breakpoints

Use mobile-first CSS. Prefer these thresholds:

- Mobile: `320px-479px`. One column, no unintended horizontal overflow, tap-friendly controls.
- Large mobile: `480px+`. Compact two-up controls are allowed when each target remains at least `44px`.
- Tablet: `768px+`. Two-column forms and cards are allowed. Persistent sidebars are still avoided unless the content is simple.
- Small desktop: `1024px+`. Persistent sidebars and wider data rows are allowed.
- Large desktop: `1280px+`. Richer multi-column grids and dashboard layouts are allowed.
- Wide desktop: `1440px+`. Use only for density enhancements, not new core behavior.

Legacy page-specific breakpoints may remain when preserving an art-directed page, but new code should align to the map above.

## Design Tokens

Shared responsive tokens should live in the relevant root stylesheet:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--page-gutter: clamp(8px, 3vw, 24px);
--container-sm: 720px;
--container-md: 960px;
--container-lg: 1200px;
--container-xl: 1480px;
--sidebar-width: clamp(180px, 16vw, 260px);
--header-height: 56px;
--touch-target: 44px;
--radius-sm: 2px;
--radius-md: 4px;
--radius-card: 6px;
--grid-gap-sm: 10px;
--grid-gap-md: 16px;
--grid-gap-lg: 24px;
--z-nav: 40;
--z-drawer: 100;
--z-modal: 140;
--z-toast: 200;
```

## Layout Patterns

- Page shells use a top navigation pattern below `1024px` and a persistent rail only from `1024px` upward.
- Public tool pages under Junk Drawer should use the shared page shell/sidebar unless they have a documented reason to be standalone.
- Page containers should use `width: min(var(--container), 100% - 2 * var(--page-gutter))`.
- Two-column layouts stack below `768px`.
- Three-column and dashboard layouts should appear at `1280px+`; use two columns at tablet and one column on mobile.
- Forms are one column by default and two columns from `768px` when space allows.
- Cards should use `repeat(auto-fit, minmax(min(100%, var(--card-min)), 1fr))`.
- Dense data rows should collapse to summary rows below `1024px`, not force horizontal scrolling.

## Components

- Shared archive chrome uses a compact mobile header below `700px`: logo and menu in the top row, full-width random artifact trigger underneath, and a single active-category control that opens a drawer. Do not reintroduce long inline category labels on mobile.
- Buttons and icon buttons should be at least `44px` tall or wide in touch contexts.
- Inputs, selects, textareas, and file controls should be at least `44px` tall.
- Action bars may wrap. Horizontal scrolling is acceptable only for large filter/nav sets where it is intentional and visible.
- Modals and drawers must fit within `100dvh`, keep actions reachable, and scroll internally.
- Empty, loading, and error states should use the same container and spacing rules as loaded states.

## Scope Boundaries

- Page content means the page-owned `main`, `article`, panels, cards, forms, and in-content calls to action.
- Global chrome means the shared header, sidebar, navigation, mobile drawer/header, footer, skip link, and site-level utility links.
- Responsive or interaction changes requested for a specific page should stay inside page content unless the request explicitly mentions global chrome.
- Page-level overlays such as coming-soon popups should scope interception to the content container that owns the unfinished feature. Avoid body-wide interception when the sidebar or navigation should keep working normally.

## Media Performance

- Images should include `width` and `height` when known.
- Above-the-fold primary images can use `fetchpriority="high"` and `decoding="async"`.
- Non-critical images should use `loading="lazy"` and `decoding="async"`.
- Prefer existing generated WebP variants and `srcset`/`sizes` for gallery-like images.

## Do / Don't

Do:

- Use `minmax(0, 1fr)` for grid columns that contain real text.
- Use `overflow-wrap: anywhere` for user/content-provided strings.
- Test with long titles, many tags, empty states, and real image sizes.

Don't:

- Hide horizontal overflow to mask a broken layout.
- Add a one-off breakpoint when an existing system breakpoint works.
- Duplicate desktop and mobile markup unless interaction or accessibility requires it.
- Use fixed viewport heights for app shells unless internal scrolling is explicitly handled.

## Verification Matrix

Before merging responsive changes, check:

- `320px`
- `375px`
- `430px`
- `768px`
- `1024px`
- `1280px`
- `1440px+`

Confirm:

- No unintended horizontal overflow.
- Readable typography.
- Tap-friendly controls.
- Proper stacking.
- Navigation remains reachable.
- Modals/drawers do not overflow.
- Content is not cut off.
- No avoidable layout shift.

## Known Exceptions

- `hashbrownpro/wafflehousepro.html` is intentionally art-directed and can keep local styling, but should still avoid hidden overflow, missing image dimensions, and cramped touch targets.
- `operator-log` owns its dark visual system, but should keep the same breakpoint and touch-target rules.
- Studio is operational software and should prioritize dense, predictable scanning over decorative composition.
