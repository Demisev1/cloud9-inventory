let historyList = [], restockList = [], negList = [];
let sortConfig = { table: 'restock', key: 'Category', asc: true };

function toggleTheme() {
  const dark = document.body.classList.toggle('theme-dark');
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

function initTheme() {
  const t = localStorage.getItem('theme');
  if (t === 'dark') document.body.classList.add('theme-dark');
}

function saveSettings() {
  localStorage.setItem('reorderMultiplier', document.getElementById('multiplierInput').value);
  localStorage.setItem('bufferPercent', document.getElementById('bufferInput').value);
}

function loadHistory() {
  historyList = JSON.parse(localStorage.getItem('uploadHistory')) || [];
  const ul = document.getElementById('uploadHistory');
  ul.innerHTML = '';
  historyList.forEach((h,i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${h.name} – ${new Date(h.time).toLocaleString()}</span>
      <button onclick="addAndProcess(historyList[${i}].name, historyList[${i}].content)">Re-run</button>
      <button onclick="deleteHist(${i})">Delete</button>`;
    ul.appendChild(li);
  });
}

function deleteHist(i) {
  historyList.splice(i,1);
  localStorage.setItem('uploadHistory', JSON.stringify(historyList));
  loadHistory();
}

function addToHistory(name, content) {
  historyList.unshift({ name, time: Date.now(), content });
  if (historyList.length > 5) historyList.pop();
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

function processText(csv) {
  const m = parseFloat(document.getElementById('multiplierInput').value) || 1;
  const b = parseFloat(document.getElementById('bufferInput').value) || 0;
  Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    complete: r => {
      restockList = [];
      negList = [];
      r.data.forEach(row => {
        const sold = +row['Last Sales/7 Days'] || 0;
        const stock = +row['Qty'] || 0;
        const buf = Math.ceil(sold * m * (b / 100));
        const qty = Math.max(0, Math.ceil(sold * m + buf - stock));
        if (qty) restockList.push({
          Category: row.Category,
          Item: row['Product name'],
          Sold: sold,
          Stock: stock,
          Qty: qty
        });
        if (stock < 0) negList.push({
          Category: row.Category,
          Item: row['Product name'],
          Stock: stock
        });
      });
      populateCategory();
      render();
    }
  });
}

function populateCategory() {
  const sel = document.getElementById('categoryFilter');
  sel.innerHTML = '<option value="">Filter by Category</option>';
  new Set(restockList.map(r => r.Category)).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
}

function render() {
  const out = document.getElementById('results');
  let html = '';

  if (restockList.length) {
    html += `<h2>📋 Restock</h2><table id="restock"><tr>`;
    ['Category','Item','Sold','Stock','Qty'].forEach(col => {
      html += `<th onclick="sort('restock','${col}')">${col}</th>`;
    });
    html += '</tr>';
    restockList.forEach(r => {
      html += `<tr><td>${r.Category}</td><td>${r.Item}</td><td>${r.Sold}</td><td>${r.Stock}</td><td>${r.Qty}</td></tr>`;
    });
    html += '</table>';
  } else {
    html += '<p>No items to restock.</p>';
  }

  if (negList.length) {
    html += `<h2 style="color:red;">⚠️ Negative Stock</h2><table id="neg"><tr>`;
    ['Category','Item','Stock'].forEach(col => {
      html += `<th onclick="sort('neg','${col}')">${col}</th>`;
    });
    html += '</tr>';
    negList.forEach(n => {
      html += `<tr><td>${n.Category}</td><td>${n.Item}</td><td style="color:red;">${n.Stock}</td></tr>`;
    });
    html += '</table>';
  }

  out.innerHTML = html;
  refreshSortIcons();
}

function sort(table, key) {
  const list = table === 'restock' ? restockList : negList;
  sortConfig.asc = (sortConfig.table === table && sortConfig.key === key)
    ? !sortConfig.asc
    : true;
  sortConfig.table = table;
  sortConfig.key = key;
  list.sort((a, b) => {
    const vA = a[key], vB = b[key];
    if (typeof vA === 'number') return sortConfig.asc ? vA - vB : vB - vA;
    return sortConfig.asc
      ? String(vA).localeCompare(vB)
      : String(vB).localeCompare(vA);
  });
  render();
}

function refreshSortIcons() {
  document.querySelectorAll('th').forEach(th => {
    th.classList.remove('sort-asc','sort-desc');
    const tbl = th.closest('table')?.id;
    const col = th.textContent;
    if (tbl === sortConfig.table && col === sortConfig.key) {
      th.classList.add(sortConfig.asc ? 'sort-asc' : 'sort-desc');
    }
  });
}

function filterResults() {
  const txt = document.getElementById('searchInput').value.toLowerCase();
  const cat = document.getElementById('categoryFilter').value.toLowerCase();
  document.querySelectorAll('#results table tr').forEach((tr, i) => {
    if (i === 0) return;
    const content = tr.textContent.toLowerCase();
    tr.style.display = (content.includes(txt) && (cat === '' || content.includes(cat))) ? '' : 'none';
  });
}

const dz = document.getElementById('dropZone');
['dragenter','dragover'].forEach(e => dz.addEventListener(e, ev => {
  ev.preventDefault();
  dz.classList.add('dragover');
}));
['dragleave','drop'].forEach(e => dz.addEventListener(e, ev => {
  ev.preventDefault();
  dz.classList.remove('dragover');
}));
dz.addEventListener('click', () => document.getElementById('csvFile').click());
dz.addEventListener('drop', ev => {
  ev.preventDefault();
  dz.classList.remove('dragover');
  const f = ev.dataTransfer.files[0];
  if (f?.name.endsWith('.csv')) {
    const fr = new FileReader();
    fr.onload = e => addAndProcess(f.name, e.target.result);
    fr.readAsText(f);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadHistory();
  document.getElementById('multiplierInput').value = localStorage.getItem('reorderMultiplier') || 1;
  document.getElementById('bufferInput').value = localStorage.getItem('bufferPercent') || 0;
});
