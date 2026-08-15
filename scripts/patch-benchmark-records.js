const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const recordsDir = path.join(root, "benchmark", "records");
const baselinePath = path.join(root, "operator-log", "design-skill-benchmark", "data", "baseline.json");

if (!fs.existsSync(baselinePath)) {
  console.error("Baseline data not found at", baselinePath);
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const resultsMap = new Map();
baseline.results.forEach((res) => {
  resultsMap.set(res.id, res);
});

const recordFiles = fs.readdirSync(recordsDir).filter((file) => file.endsWith(".html"));

console.log(`Processing ${recordFiles.length} record files...`);

recordFiles.forEach((file) => {
  const id = path.basename(file, ".html");
  const result = resultsMap.get(id);
  const filePath = path.join(recordsDir, file);
  let html = fs.readFileSync(filePath, "utf8");

  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const currentTitle = titleMatch ? titleMatch[1] : `${result ? result.title : id} | Design Skill Benchmark Archive`;
  const cleanTitle = currentTitle.replace(/\s*\|\s*Design Skill Benchmark Archive/, "");
  const fullTitle = `${cleanTitle} | Design Skill Benchmark Record`;
  const description = `Frozen benchmark record and 100-point evaluation for ${cleanTitle} (${result ? result.model : "AI Model"} / ${result ? result.skillId : "Design Skill"}) with desktop & mobile review frames.`;

  // Build head
  const headBlock = `  <script async src="https://www.googletagmanager.com/gtag/js?id=G-CCB0LW648K"></script>
  <script src="/assets/js/analytics.js" defer></script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fullTitle}</title>
  <meta name="description" content="${description.replace(/"/g, '&quot;')}">
  <link rel="canonical" href="https://lemonteed.com/benchmark/records/${id}.html">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://lemonteed.com/benchmark/records/${id}.html">
  <meta property="og:image" content="https://lemonteed.com/benchmark/images/desktop/${id}.webp">
  <meta property="og:image:secure_url" content="https://lemonteed.com/benchmark/images/desktop/${id}.webp">
  <meta property="og:image:type" content="image/webp">
  <meta property="og:image:width" content="1280">
  <meta property="og:image:height" content="800">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${fullTitle}">
  <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="https://lemonteed.com/benchmark/images/desktop/${id}.webp">
  <link rel="icon" href="/images/favicons/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicons/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/images/favicons/favicon-16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/images/favicons/favicon-180.png">
  <link rel="stylesheet" href="../archive.css">
  <script src="../archive.js" defer></script>
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": "${cleanTitle.replace(/"/g, '\\"')}",
      "description": "${description.replace(/"/g, '\\"')}",
      "image": "https://lemonteed.com/benchmark/images/desktop/${id}.webp",
      "url": "https://lemonteed.com/benchmark/records/${id}.html",
      "author": {
        "@type": "Organization",
        "name": "Lemonteed",
        "url": "https://lemonteed.com/"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Lemonteed",
        "logo": {
          "@type": "ImageObject",
          "url": "https://lemonteed.com/images/lemonteedlogo-250.webp"
        }
      },
      "isPartOf": {
        "@type": "Dataset",
        "name": "Design Skill Benchmark Baseline 001",
        "url": "https://lemonteed.com/benchmark/"
      }
    }
  </script>`;

  // Replace <head>...</head>
  html = html.replace(/<head>[\s\S]*?<\/head>/i, `<head>\n${headBlock}\n</head>`);

  // Replace image references in body
  html = html.replace(new RegExp(`images/desktop/${id}\\.png`, 'g'), `images/desktop/${id}.webp`);
  html = html.replace(new RegExp(`images/mobile/${id}\\.png`, 'g'), `images/mobile/${id}.webp`);

  // Replace header
  const mastheadBlock = `<header class="masthead">
  <div class="masthead__brand">
    <a class="masthead__home" href="/">&larr; Lemonteed Home</a>
    <a class="masthead__title" href="../index.html">DESIGN SKILL BENCHMARK</a>
  </div>
  <div class="masthead__nav">
    <a class="masthead__article" href="/operator-log/design-skill-benchmark/">&larr; Read Case Study Post</a>
    <span>BASELINE 001 &middot; FROZEN EVIDENCE</span>
  </div>
</header>`;

  html = html.replace(/<header class="masthead">[\s\S]*?<\/header>/i, mastheadBlock);

  // Replace <a class="back" href="../index.html">...</a> with breadcrumbs
  const breadcrumbsBlock = `<nav class="breadcrumbs" aria-label="Breadcrumbs">
      <a href="/">Lemonteed</a>
      <span class="sep">/</span>
      <a href="/operator-log/design-skill-benchmark/">Case Study</a>
      <span class="sep">/</span>
      <a href="../index.html">Benchmark Archive</a>
      <span class="sep">/</span>
      <span class="current">Record ${id}</span>
    </nav>
    <a class="back" href="../index.html">&larr; All 32 records</a>`;

  if (html.includes('<nav class="breadcrumbs"')) {
    html = html.replace(/<nav class="breadcrumbs"[\s\S]*?<a class="back" href="\.\.\/index\.html">[^<]*<\/a>/i, breadcrumbsBlock);
  } else {
    html = html.replace(/<a class="back" href="\.\.\/index\.html">[^<]*<\/a>/i, breadcrumbsBlock);
  }

  // Replace footer
  const footerBlock = `<footer>
  <div class="footer__left">
    <span>BASELINE 001 / 2026-08-15T02:37:34.121Z</span>
    <a href="/operator-log/design-skill-benchmark/">&larr; Read Case Study Post</a>
    <a href="/studio-lab/">Studio Lab</a>
  </div>
  <div class="footer__right">
    <a href="../data/baseline.json" download>Download baseline JSON</a>
    <a href="../data/baseline.csv" download>Download baseline CSV</a>
  </div>
</footer>`;

  html = html.replace(/<footer>[\s\S]*?<\/footer>/i, footerBlock);

  fs.writeFileSync(filePath, html, "utf8");
});

console.log("Successfully patched all benchmark records.");
