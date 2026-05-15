const fs = require('fs');
const path = require('path');

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
  
  // Find the module
  const drawerRegex = /<a href=\"\/junk-drawer\/\" class=\"junk-drawer-module[\s\S]*?<\/a>/;
  const match = content.match(drawerRegex);
  
  if (match) {
    const moduleHTML = match[0];
    
    // Remove it from its current position
    content = content.replace(moduleHTML, '');
    
    // Clean up empty lines left behind if any
    content = content.replace(/\n\s*\n\s*<\/nav>/, '\n        </nav>');
    
    // Now insert it AFTER </nav>
    if (content.includes('</nav>')) {
        content = content.replace('</nav>', '</nav>\n        ' + moduleHTML);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed ' + file);
    }
  }
});
