let historyList = [];
let lastResults = [];
const MAX_HISTORY = 5;

function changeTheme() {
  const val = document.getElementById('themeSelect').value;
  document.body.className = `theme-${val}`;
  localStorage.setItem('theme', val);
}

function initThemes() {
  const stored = localStorage.getItem('theme') || 'default';
  document.getElementById('themeSelect').value = stored;
  document.body.className = `theme-${stored}`;
}

function saveSettings() {
  localStorage.setItem('reorderMultiplier', document.getElementById("multiplierInput").value);
  localStorage.setItem('bufferPercent', document.getElementById("bufferInput").value);
}

function loadHistory() {
  historyList = JSON.parse(localStorage.getItem('uploadHistory')) || [];
  const ul = document.getElementById('uploadHistory');
  ul.innerHTML = '';
  historyList.forEach((h, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${h.name} – ${new Date(h.time).toLocaleString()}</span>
      <div>
        <button onclick="processText(historyList[${idx}].content)">Re-run</button>
        <button class="delete" onclick="deleteHist(${idx})">Delete</button>
      </div>`;
    ul.appendChild(li);
  });
}

function deleteHist(i) {
  historyList.splice(i,1);
  localStorage.setItem('uploadHistory', JSON.stringify(historyList));
  loadHistory();
}

function addToHistory(name, content) {
  historyList.unshift({ name, time:Date.now(), content });
  if (historyList.length > MAX_HISTORY) historyList.pop();
  localStorage.setItem('uploadHistory', JSON.stringify(historyList));
  loadHistory();
}

function handleFileUpload() {
  const f = document.getElementById('csvFile').files[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = e => addAndProcess(f.name, e.target.result);
  fr.readAsText(f);
}

function addAndProcess(name, text) {
  addToHistory(name, text);
  processText(text);
}

function processCSV() {
  const f = document.getElementById('csvFile').files[0];
  if (!f) return alert('Select a CSV!');
  const fr = new FileReader();
  fr.onload = e => processText(e.target.result);
  fr.readAsText(f);
}

function processText(csvText) {
  const m = parseFloat(document.getElementById("multiplierInput").value) || 1;
  const b = parseFloat(document.getElementById("bufferInput").value) || 0;
  Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    complete: r => {
      const results = [];
      const neg = [];
      r.data.forEach(row => {
        const sold = parseInt(row['Last Sales/7 Days']) || 0;
        const stock = parseInt(row['Qty']) || 0;
        const buffer = Math.ceil(sold * m * (b / 100));
        const qty = Math.max(0, Math.ceil(sold * m + buffer - stock));
        if (qty) results.push({ ...row, restock_quantity: qty });
        if (stock < 0) neg.push(row);
      });
      lastResults = results;
      populateCategoryFilter(results);
      display(results, neg);
    }
  });
}

function populateCategoryFilter(results) {
  const sel = document.getElementById('categoryFilter');
  sel.innerHTML = '<option value="">🔽 Filter by Category</option>';
  new Set(results.map(r => r.Category)).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

function display(results, neg) {
  let html = '';
  if (results.length) {
    html += '<h2>📋 Restock Needed</h2><table><tr><th>Category</th><th>Item</th><th>Sold</th><th>In Stock</th><th>Restock Qty</th></tr>';
    results.forEach(r => {
      html += `<tr><td>${r.Category}</td><td>${r['Product name']}</td><td>${r['Last Sales/7 Days']}</td><td>${r.Qty}</td><td>${r.restock_quantity}</td></tr>`;
    });
    html += '</table>';
  } else {
    html += '<p>✅ All stock levels are sufficient!</p>';
  }

  if (neg.length) {
    html += '<h2 style="color:red;">⚠️ Negative Stock Items</h2><table><tr><th>Category</th><th>Item</th><th>In Stock</th><th>Sold</th></tr>';
    neg.forEach(n => {
      html += `<tr><td>${n.Category}</td><td>${n['Product name']}</td><td style="color:red;">${n.Qty}</td><td>${n['Last Sales/7 Days']}</td></tr>`;
    });
    html += '</table>';
  }

  document.getElementById('results').innerHTML = html;
}

function filterResults() {
  const text = document.getElementById('searchInput').value.trim().toLowerCase();
  const cat = document.getElementById('categoryFilter').value.toLowerCase();
  document.querySelectorAll('#results table').forEach(table => {
    table.querySelectorAll('tr').forEach((row, i) => {
      if (i === 0) return;
      const content = row.textContent.toLowerCase();
      row.style.display = (content.includes(text) && (cat === '' || content.includes(cat))) ? '' : 'none';
    });
  });
}

function downloadCSV() {
  if (!lastResults.length) return;
  const blob = new Blob([Papa.unparse(lastResults)], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'reorder_list.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Setup drag & drop
const dz = document.getElementById('dropZone');
['dragenter', 'dragover'].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.remove('dragover'); }));
dz.addEventListener('drop', e => {
  const f = e.dataTransfer.files[0];
  if (f && f.name.endsWith('.csv')) {
    const fr = new FileReader();
    fr.onload = ev => addAndProcess(f.name, ev.target.result);
    fr.readAsText(f);
  } else {
    alert('Only CSV files are supported.');
  }
});

window.addEventListener('DOMContentLoaded', () => {
  initThemes();
  loadHistory();
  document.getElementById("multiplierInput").value = localStorage.getItem('reorderMultiplier') || 1.0;
  document.getElementById("bufferInput").value = localStorage.getItem('bufferPercent') || 20;
});
