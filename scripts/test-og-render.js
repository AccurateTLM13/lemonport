const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const lemmyWave = fs.readFileSync(path.join(root, 'images', 'lemmy', 'poses', 'wave.webp')).toString('base64');

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&amp;family=Space+Mono:wght@700&amp;family=Inter:wght@400;600&amp;display=swap');
      .title { font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; fill: #11100d; }
      .mono { font-family: 'Space Mono', monospace; font-weight: 700; }
      .body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; fill: #44413c; }
    </style>
  </defs>
  <rect width="1200" height="630" fill="#f4f2ea"/>
  <rect x="30" y="30" width="1140" height="570" rx="12" fill="#ffffff" stroke="#11100d" stroke-width="3"/>
  <text x="70" y="100" class="mono" font-size="16" fill="#888070">[ DISTRICT 04 / BROWSER TOOL ]</text>
  <text x="70" y="170" class="title" font-size="52">Lighthouse Handoff</text>
  <text x="70" y="230" class="body" font-size="22">Turn PageSpeed Insights into coding-agent-ready Markdown.</text>
  <image href="data:image/webp;base64,${lemmyWave}" x="850" y="200" width="260" height="260"/>
</svg>`;

const testSvgPath = path.join(root, 'scratch_test_og.svg');
const testWebpPath = path.join(root, 'scratch_test_og.webp');
fs.writeFileSync(testSvgPath, svg);
execFileSync('magick', [testSvgPath, '-quality', '88', '-define', 'webp:method=6', testWebpPath]);
console.log('Generated test webp, file size:', fs.statSync(testWebpPath).size);
fs.unlinkSync(testSvgPath);
