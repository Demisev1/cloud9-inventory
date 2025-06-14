let historyList = [];
let lastResults = [];
const MAX_HISTORY = 5;

// Theme functions
function changeTheme() {
  const val = document.getElementById('themeSelect').value;
  applyTheme(val);
  localStorage.setItem('theme', val);
}

function toggleTheme() {
  const current = document.body.classList.contains('theme-dark') ? 'dark' : document.getElementById('themeSelect').value;
  const next = current === 'dark' ? 'default' : 'dark';
  document.getElementById('themeSelect').value = next;
  applyTheme(next);
  localStorage.setItem('theme', next);
}

function applyTheme(t) {
  document.body.className = '';
  document.body.classList.add(`theme-${t}`);
}

function initTheme() {
  const st = localStorage.getItem('theme') || 'default';
  document.getElementById('themeSelect').value = st;
  applyTheme(st);
}

// Save inputs
function saveSettings() {
  localStorage.setItem('reorderMultiplier', document.getElementById('multiplierInput').value);
  localStorage.setItem('bufferPercent', document.getElementById('bufferInput').value);
}

// Upload history
function loadHistory() {
  historyList = JSON.parse(localStorage.getItem('uploadHistory')) || [];
  const ul = document.getElementById('uploadHistory');
  ul.innerHTML = '';
  historyList.forEach((h, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${h.name} – ${new Date(h.time).toLocaleString()}</span>
      <div>
        <button onclick="addAndProcess(historyList[${i}].name, historyList[${i}].content)">Re-run</button>
        <button class="upload-item-btn delete" onclick="deleteHist(${i})">Delete</button>
      </div>`;
    ul.appendChild(li);
  });
}

function deleteHist(i) {
  historyList.splice(i, 1);
  localStorage.setItem('uploadHistory', JSON.stringify(historyList));
  loadHistory();
}

function addToHistory(name, content) {
  historyList.unshift({ name, time: Date.now(), content });
  if (historyList.length > MAX_HISTORY) historyList.pop();
  localStorage.setItem('uploadHistory', JSON.stringify(historyList));
  loadHistory();
}

// File handling
function handleFileUpload() {
  const f = document.getElementById('csvFile').files[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = e => addAndProcess(f.name, e.target.result);
  fr.readAsText(f);
}

function addAndProcess(name, content) {
  addToHistory(name, content);
  processText(content);
}

function processCSV() {
  const f = document.getElementById('csvFile').files[0];
  if (!f) return alert('Select a CSV!');
  const fr = new FileReader();
  fr.onload = e => processText(e.target.result);
  fr.readAsText(f);
}

// CSV parsing and display
function processText(csv) {
  const m = parseFloat(document.getElementById('multiplierInput').value) || 1;
  const b = parseFloat(document.getElementById('bufferInput').value) || 0;
  Papa.parse(csv, {
    header: true, skipEmptyLines: true,
    complete: res => {
      const arr = [], neg = [];
      res.data.forEach(r => {
        const sold = +r['Last Sales/7 Days'] || 0;
        const stock = +r['Qty'] || 0;
        const buf = Math.ceil(sold * m * (b / 100));
        const qty = Math.max(0, Math.ceil(sold * m + buf - stock));
        if (qty) arr.push({ ...r, restock_quantity: qty });
        if (stock < 0) neg.push(r);
      });
      lastResults = arr;
      populateCategory(arr);
      renderResults(arr, neg);
    }
  });
}

function populateCategory(arr) {
  const sel = document.getElementById('categoryFilter');
  sel.innerHTML = '<option value="">Filter by Category</option>';
  [...new Set(arr.map(r => r.Category))].forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
}

function renderResults(res, neg) {
  const out = document.getElementById('results');
  let html = '';
  if (res.length) {
    html += `<h2>📋 Restock</h2><table><tr><th>Category</th><th>Item</th><th>Sold</th><th>Stock</th><th>Qty</th></tr>`;
    res.forEach(r => {
      html += `<tr><td>${r.Category}</td><td>${r['Product name']}</td><td>${r['Last Sales/7 Days']}</td><td>${r.Qty}</td><td>${r.restock_quantity}</td></tr>`;
    });
    html += '</table>';
  } else {
    html += '<p>✅ All stocked!</p>';
  }
  if (neg.length) {
    html += `<h2 style="color:red;">⚠️ Negative Stock</h2><table><tr><th>Category</th><th>Item</th><th>Qty</th></tr>`;
    neg.forEach(n => {
      html += `<tr><td>${n.Category}</td><td>${n['Product name']}</td><td style="color:red;">${n.Qty}</td></tr>`;
    });
    html += '</table>';
  }
  out.innerHTML = html;
}

// Filters
function filterResults() {
  const txt = document.getElementById('searchInput').value.toLowerCase();
  const cat = document.getElementById('categoryFilter').value.toLowerCase();
  document.querySelectorAll('#results table tr').forEach((tr, idx) => {
    if (idx === 0) return;
    const t = tr.textContent.toLowerCase();
    tr.style.display = (t.includes(txt) && (cat === '' || t.includes(cat))) ? '' : 'none';
  });
}

// CSV download
function downloadCSV() {
  if (!lastResults.length) return;
  const blob = new Blob([Papa.unparse(lastResults)], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'reorder_list.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Drag & Drop
const dz = document.getElementById('dropZone');
['dragenter', 'dragover'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.remove('dragover'); }));
dz.addEventListener('drop', ev => {
  const f = ev.dataTransfer.files[0];
  if (f?.name?.endsWith('.csv')) {
    const fr = new FileReader();
    fr.onload = e => addAndProcess(f.name, e.target.result);
    fr.readAsText(f);
  } else {
    alert('Only CSV files are supported.');
  }
});

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadHistory();
  document.getElementById('multiplierInput').value = localStorage.getItem('reorderMultiplier') || 1;
  document.getElementById('bufferInput').value = localStorage.getItem('bufferPercent') || 0;
});
