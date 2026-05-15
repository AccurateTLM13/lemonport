const fs = require('fs');
const path = require('path');

const stylePath = 'assets/css/style.css';
let css = fs.readFileSync(stylePath, 'utf8');

const drawerCSS = `
/* --- Junk Drawer Sidebar Module --- */
.junk-drawer-module {
  display: block;
  margin-top: 18px;
  position: relative;
  background: #eceadd;
  border: 1px solid #d4d1c4;
  padding: 12px 10px;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: 0 4px 0 #d4d1c4, inset 0 1px 2px rgba(255,255,255,0.6);
  border-radius: 2px;
}

.junk-drawer-module:hover {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #c2bfae, inset 0 1px 2px rgba(255,255,255,0.8);
  background: #f1f0e6;
}

.junk-drawer-module:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 transparent;
}

.junk-drawer-module__face {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.junk-drawer-module__handle {
  width: 28px;
  height: 5px;
  background: #d4d1c4;
  border-radius: 3px;
  box-shadow: inset 0 -1px 1px rgba(0,0,0,0.1);
}

.junk-drawer-module__label {
  font-family: "Courier New", Courier, monospace;
  font-size: 11px;
  font-weight: 700;
  color: #6d6b63;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: color 0.2s;
}

.junk-drawer-module:hover .junk-drawer-module__label {
  color: var(--ink);
}

@media (max-width: 700px) {
  .junk-drawer-module {
    margin-top: 0;
    margin-left: 14px;
    padding: 8px 12px;
    box-shadow: 0 3px 0 #d4d1c4;
    flex-shrink: 0;
  }
  .junk-drawer-module:hover {
    transform: translateY(1px);
    box-shadow: 0 2px 0 #c2bfae;
  }
  .junk-drawer-module:active {
    transform: translateY(3px);
    box-shadow: 0 0 0 transparent;
  }
  .junk-drawer-module__handle {
    display: none;
  }
}
`;

if (!css.includes('.junk-drawer-module')) {
  css += '\n' + drawerCSS;
  fs.writeFileSync(stylePath, css, 'utf8');
}

// Now replace the link in all HTML files
function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getFiles(__dirname);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace active and inactive text links with the drawer UI
  // Note: Since some files might have it set as active, we should check both
  const targetInactive = '<a class="category-link" href="/junk-drawer/">Junk-Drawer</a>';
  const targetInactive2 = '<a class="category-link" href="/junk-drawer/" data-category-link="junk-drawer">Junk-Drawer</a>';
  const targetActive = '<a class="category-link is-active" href="/junk-drawer/" data-category-link="junk-drawer">Junk-Drawer</a>';
  
  const drawerHTML = `
        <a href="/junk-drawer/" class="junk-drawer-module" aria-label="Open Junk Drawer">
          <div class="junk-drawer-module__face">
            <div class="junk-drawer-module__handle"></div>
            <span class="junk-drawer-module__label">Junk Drawer</span>
          </div>
        </a>`;
  
  let modified = false;
  
  if (content.includes(targetInactive)) {
    content = content.replace(targetInactive, drawerHTML.trim());
    modified = true;
  }
  if (content.includes(targetInactive2)) {
    content = content.replace(targetInactive2, drawerHTML.trim());
    modified = true;
  }
  if (content.includes(targetActive)) {
    // When active, maybe give it an active class
    const drawerHTMLActive = `
        <a href="/junk-drawer/" class="junk-drawer-module is-active" aria-label="Open Junk Drawer">
          <div class="junk-drawer-module__face">
            <div class="junk-drawer-module__handle"></div>
            <span class="junk-drawer-module__label" style="color: var(--ink);">Junk Drawer</span>
          </div>
        </a>`;
    content = content.replace(targetActive, drawerHTMLActive.trim());
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
