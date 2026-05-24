# Lemon DOM — standalone repository export

This folder contains everything needed for the **separate** Lemon DOM GitHub repository.

It is **not** part of the Lemonteed site. The live demo should be published to GitHub Pages from its own repo.

## Publish to GitHub

1. Create a new public repository on GitHub named `lemon-dom` (empty, no README).

2. From this folder:

```bash
cd lemon-dom-repo
git init
git add .
git commit -m "Initial commit: Lemon DOM v1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lemon-dom.git
git push -u origin main
```

Or run `./publish.sh` after `git init` and creating the remote.

3. Enable **GitHub Pages** in the new repo:
   - Settings → Pages → Build and deployment → **GitHub Actions**

4. The demo deploys to: `https://YOUR_USERNAME.github.io/lemon-dom/`

## Lemonteed integration

The Lemonteed world map links to the external GitHub Pages URL. The `/lemon-dom/` path on lemonteed.com is a redirect stub only.

Update `assets/js/world-map.js` and `index.html` zone href if your GitHub Pages URL differs from `https://mnfrdrsh.github.io/lemon-dom/`.
