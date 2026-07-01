const ownerInput = document.querySelector('#owner');
const yearInput = document.querySelector('#year');
const licenseOutput = document.querySelector('#license-text');
const toast = document.querySelector('.toast');
let toastTimer;

yearInput.value = new Date().getFullYear();

// getLicenseText: preview uses a visual placeholder for empty owner;
// output (copy/download) uses the literal [OWNER] token.
function getLicenseText(forOutput = false) {
  const owner = ownerInput.value.trim();
  const year = yearInput.value.trim() || new Date().getFullYear();
  const ownerStr = owner || (forOutput ? '[OWNER]' : '_______________');
  return `FreeSource License 1.0\n\nCopyright (c) ${year} ${ownerStr}\n\nYou may use, copy, modify, publish, distribute, sublicense, sell, or otherwise do whatever you want with this work, for any purpose, commercial or non-commercial, without payment or attribution.\n\nThe work is provided "as is," without warranty of any kind. The creator is not liable for any claim, damage, or other liability arising from the work or its use.\n\nThat is it.`;
}

function renderLicense() {
  licenseOutput.textContent = getLicenseText(false);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2100);
}

async function writeToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

async function copyLicense() {
  await writeToClipboard(getLicenseText(true));
  showToast('License copied.');
}

async function copyAsMarkdown() {
  const text = '```\n' + getLicenseText(true) + '\n```';
  await writeToClipboard(text);
  showToast('Copied as Markdown.');
}

function downloadLicense() {
  const blob = new Blob([getLicenseText(true)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'LICENSE.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('LICENSE.txt downloaded.');
}

async function copyBadge(format) {
  const url = 'https://lemonteed.com/free-source/';
  const text = format === 'html'
    ? `<a href="${url}">FreeSource 1.0</a>`
    : `[FreeSource 1.0](${url})`;
  await writeToClipboard(text);
  showToast('Badge link copied.');
}

ownerInput.addEventListener('input', renderLicense);
yearInput.addEventListener('input', renderLicense);
document.querySelectorAll('[data-copy-license]').forEach(btn => btn.addEventListener('click', copyLicense));
document.querySelectorAll('[data-download-license]').forEach(btn => btn.addEventListener('click', downloadLicense));
document.querySelectorAll('[data-copy-markdown]').forEach(btn => btn.addEventListener('click', copyAsMarkdown));
document.querySelectorAll('[data-copy-badge]').forEach(btn => btn.addEventListener('click', () => copyBadge(btn.dataset.copyBadge)));

renderLicense();
