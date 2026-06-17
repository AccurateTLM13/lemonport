import { heicTo } from '/assets/js/heic-to-csp.js';

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const statusArea = document.getElementById('status-area');
const placeholder = document.getElementById('status-placeholder');
const formatSelect = document.getElementById('format-select');
const qualitySlider = document.getElementById('quality-slider');
const qualityVal = document.getElementById('quality-val');
const convertBtn = document.getElementById('convert-btn');
const clearBtn = document.getElementById('clear-btn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let filesMap = new Map();

formatSelect.onchange = () => {
    const needsQuality = ['jpeg', 'webp', 'avif'].includes(formatSelect.value);
    document.getElementById('quality-container').classList.toggle('hidden', !needsQuality);
};

qualitySlider.oninput = (e) => qualityVal.innerText = `${e.target.value}%`;

fileInput.onchange = (e) => handleFiles(e.target.files);

['dragenter', 'dragover'].forEach(e => {
    dropArea.addEventListener(e, () => dropArea.classList.add('drag-active'));
});
['dragleave', 'drop'].forEach(e => {
    dropArea.addEventListener(e, () => dropArea.classList.remove('drag-active'));
});

async function handleFiles(files) {
    if (files.length > 0) placeholder.classList.add('hidden');
    for (const file of files) {
        const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        if (filesMap.has(id)) continue;

        filesMap.set(id, file);
        addFileUI(file, id);
    }
}

function removeFile(id) {
    filesMap.delete(id);
    const row = document.getElementById(`row-${id}`);

    if (row) {
        row.remove();
    }

    if (filesMap.size === 0) {
        placeholder.classList.remove('hidden');
    }
}

statusArea.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-id]');

    if (button) {
        removeFile(button.dataset.removeId);
    }
});

async function addFileUI(file, id) {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.id = `row-${id}`;

    const thumb = document.createElement('img');
    thumb.className = 'file-row__thumb';
    thumb.width = 48;
    thumb.height = 48;
    thumb.alt = '';

    if (file.name.toLowerCase().endsWith('.heic')) {
        thumb.src = 'https://cdn-icons-png.flaticon.com/512/337/337948.png';
    } else {
        thumb.src = URL.createObjectURL(file);
    }

    const details = document.createElement('div');

    const name = document.createElement('p');
    name.className = 'file-row__name';
    name.textContent = file.name;

    const meta = document.createElement('p');
    meta.className = 'text-xs text-slate-400';
    meta.innerHTML = `${(file.size / 1024).toFixed(1)} KB • <span class="status-badge">Pending</span>`;

    details.append(name, meta);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'file-row__remove';
    removeButton.dataset.removeId = id;
    removeButton.setAttribute('aria-label', `Remove ${file.name}`);
    removeButton.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';

    row.append(thumb, details, removeButton);
    statusArea.appendChild(row);
}

clearBtn.onclick = () => {
    filesMap.clear();
    statusArea.innerHTML = '';
    placeholder.classList.remove('hidden');
    statusArea.appendChild(placeholder);
};

convertBtn.onclick = async () => {
    if (filesMap.size === 0) return;
    toggleLoading(true);

    const zip = new JSZip();
    const format = formatSelect.value;
    const quality = qualitySlider.value / 100;
    let count = 0;

    for (const [id, file] of filesMap) {
        try {
            updateRowStatus(id, 'Converting...', 'text-blue-500');
            const blob = await processImage(file, format, quality);

            if (filesMap.size === 1) {
                downloadBlob(blob, rename(file.name, format));
            } else {
                zip.file(rename(file.name, format), blob);
            }

            updateRowStatus(id, `Done (${(blob.size / 1024).toFixed(1)} KB)`, 'text-green-600');
            count++;
        } catch (err) {
            updateRowStatus(id, 'Error', 'text-red-500');
        }
    }

    if (filesMap.size > 1 && count > 0) {
        const content = await zip.generateAsync({ type: "blob" });
        downloadBlob(content, `converted_images_${Date.now()}.zip`);
    }

    toggleLoading(false);
};

async function processImage(file, format, quality) {
    let blob = file;
    if (file.name.toLowerCase().endsWith('.heic')) {
        blob = await heicTo({ blob, type: 'image/png' });
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            if (format === 'jpeg') {
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(img, 0, 0);
            canvas.toBlob((result) => resolve(result), `image/${format}`, quality);
        };
        img.src = URL.createObjectURL(blob);
    });
}

function updateRowStatus(id, text, colorClass) {
    const badge = document.querySelector(`#row-${id} .status-badge`);
    if (badge) {
        badge.innerText = text;
        badge.className = `status-badge ${colorClass} font-medium`;
    }
}

function toggleLoading(active) {
    convertBtn.disabled = active;
    document.getElementById('btn-text').innerText = active ? 'Processing...' : 'Convert & Download';
    document.getElementById('btn-spinner').classList.toggle('hidden', !active);
}

function rename(name, ext) {
    return name.substring(0, name.lastIndexOf('.')) + '.' + ext;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
