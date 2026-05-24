# Lemon DOM — standalone repository export

This folder is a **copy** of the Lemon DOM library and demo, packaged for publishing to its **own** GitHub repository when you are ready.

## Important

The **live demo stays on Lemonteed** at:

**https://lemonteed.com/lemon-dom/**

Do not point the Lemonteed world map at a GitHub Pages URL until you have actually created that repo and deployed it.

## When you want a separate GitHub repo

1. Create a new empty public repository (name it whatever you like, e.g. `lemon-dom`).

2. From this folder:

```bash
cd lemon-dom-repo
git init
git add .
git commit -m "Initial commit: Lemon DOM v1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

3. Enable **GitHub Pages** → Source: **GitHub Actions**

4. Optionally update Lemonteed map links to your new Pages URL — only after it is live.

## Keeping copies in sync

When you change the demo on Lemonteed (`/lemon-dom/`), copy updated files here before publishing to the standalone repo:

- `index.html` (adjust meta URLs for your GitHub Pages domain)
- `lemon-dom.css`
- `lemon-dom.js`
