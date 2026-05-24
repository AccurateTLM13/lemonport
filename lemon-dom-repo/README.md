# Lemon DOM

**Juicy UI effects for plain old websites.**

Lemon DOM is a lightweight, dependency-free visual effects library for vanilla HTML, CSS, and JavaScript. No build step. No framework. Open `index.html` in a browser and it works.

Inspired by the experimental direction of [Liquid DOM](https://github.com/AndrewPrifer/liquid-dom) by Andrew Prifer — not affiliated, not a clone, and not claiming feature parity.

## Live demo

Once GitHub Pages is enabled, the demo lives at:

**https://mnfrdrsh.github.io/lemon-dom/**

This repository's `index.html` is the product landing page and live demo.

## Quick start

1. Copy these three files into your project:

   - `lemon-dom.css`
   - `lemon-dom.js`
   - (optional) use `index.html` as a reference demo

2. Link them in your page:

```html
<link rel="stylesheet" href="lemon-dom.css">
<script src="lemon-dom.js" defer></script>
```

3. Add effects via data attributes:

```html
<article
  data-lemon-glass
  data-lemon-juice
  data-lemon-squeeze
  style="--lemon-blur: 24px; --lemon-accent: #ffe66d;"
>
  Your content
</article>
```

4. Initialize:

```html
<script>
  LemonDOM.init();
</script>
```

## Effects

| Attribute | What it does |
|-----------|--------------|
| `data-lemon-glass` | Frosted glass surface with blur fallback |
| `data-lemon-juice` | Cursor-follow radial glow |
| `data-lemon-squeeze` | Tactile press compression |
| `data-lemon-zest` | CSS-only grain overlay |
| `data-lemon-peel` | Scroll-triggered reveal |

## JavaScript API

```js
LemonDOM.init();
LemonDOM.glass(".card");
LemonDOM.juice(document.querySelector(".hero"));
LemonDOM.squeeze(".btn");
LemonDOM.zest(".panel");
LemonDOM.peel(".reveal");
LemonDOM.destroy();
```

## Customization

Tune effects with CSS custom properties on any element:

```css
--lemon-blur: 20px;
--lemon-radius: 20px;
--lemon-accent: #ffe66d;
--lemon-glow-opacity: 0.38;
--lemon-squeeze-active-x: 1.028;
--lemon-squeeze-active-y: 0.965;
```

## GitHub Pages setup

This repo is ready for GitHub Pages from the `main` branch root.

1. Create a new public repository named `lemon-dom`
2. Push this folder to `main`
3. In GitHub: **Settings → Pages → Build and deployment**
   - Source: **GitHub Actions**
4. The included workflow (`.github/workflows/pages.yml`) deploys on every push to `main`

Or serve locally — just open `index.html` in a browser.

## Publish checklist

```bash
# From this directory (lemon-dom-standalone)
git init
git add .
git commit -m "Initial commit: Lemon DOM v1"
git branch -M main
git remote add origin https://github.com/mnfrdrsh/lemon-dom.git
git push -u origin main
```

Then enable GitHub Pages (GitHub Actions source) in the repo settings.

## Browser support

- **Glass** uses `backdrop-filter` where supported, with a solid translucent fallback
- **Peel, squeeze, juice** respect `prefers-reduced-motion`
- **Juice** requires pointer events; touch users still get the static glass look

## License

MIT — see [LICENSE](LICENSE).

## Credits

- Inspired by [Liquid DOM](https://github.com/AndrewPrifer/liquid-dom) by Andrew Prifer
- Built by [Lemonteed](https://lemonteed.com/)
