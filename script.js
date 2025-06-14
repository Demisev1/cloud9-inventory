let reorderList = [];
let negativeStockList = [];
const MAX_HISTORY = 5;

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDark);
}

function saveSettings() {
  localStorage.setItem('reorderMultiplier', document.getElementById("multiplierInput").value);
  localStorage.setItem('bufferPercent', document.getElementById("bufferInput").value);
}

function loadHistory() {
  const history = JSON.parse(localStorage.getItem('uploadHistory')) || [];
  const ul = document.getElementById('uploadHistory');
  ul.innerHTML = '';
  history.forEach((entry, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${entry.name} – ${new Date(entry.time).toLocaleString()}</span>
      <div>
        <button class="upload-item-btn" onclick="reAnalyze(${idx})">Re-run</button>
        <button class="upload-item-btn delete" onclick="deleteHistoryItem(${idx})">Delete</button>
      </div>
    `;
    ul.appendChild(li);
  });
}

function addToHistory(name, content) {
  const history = JSON.parse(localStorage.getItem('uploadHistory')) || [];
  history.unshift({ name, time: Date.now(), content });
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem('uploadHistory', JSON.stringify(history));
  loadHistory();
}

function deleteHistoryItem(idx) {
  const history = JSON.parse(localStorage.getItem('uploadHistory')) || [];
  history.splice(idx, 1);
  localStorage.setItem('uploadHistory', JSON.stringify(history));
  loadHistory();
}

function reAnalyze(idx) {
  const history = JSON.parse(localStorage.getItem('uploadHistory')) || [];
  processCSVFromText(history[idx].content);
}

function handleFileUpload() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    addToHistory(file.name, e.target.result);
    processCSVFromText(e.target.result);
  };
  reader.readAsText(file);
}

function processCSV() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) return alert('Please select a CSV file.');
  const reader = new FileReader();
  reader.onload = e => processCSVFromText(e.target.result);
  reader.readAsText(file);
}

function processCSVFromText(csvText) {
  const mult = parseFloat(document.getElementById("multiplierInput").value) || 1.0;
  const buf = parseFloat(document.getElementById("bufferInput").value) || 0;
  
  Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    complete: results => {
      reorderList = [];
      negativeStockList = [];
      results.data.forEach(r => {
        const sold = parseInt(r['Last Sales/7 Days'] || 0);
        const stock = parseInt(r['Qty'] || 0);
        const buffer = Math.ceil(sold * mult * (buf / 100));
        const raw = sold * mult + buffer - stock;
        const qty = raw > 0 ? Math.ceil(raw) : 0;
        const i = {
          item_name: r['Product name'],
          category: r['Category'] || 'Uncategorized',
          items_sold: sold,
          items_in_stock: stock,
          restock_quantity: qty
        };
        if (qty) reorderList.push(i);
        if (stock < 0) negativeStockList.push(i);
      });
      reorderList.sort((a,b) => a.category.localeCompare(b.category) || b.restock_quantity - a.restock_quantity);
      populateCategoryFilter(reorderList);
      displayResults(reorderList, negativeStockList);
      document.getElementById('downloadBtn').style.display = reorderList.length ? 'inline-block' : 'none';
    }
  });
}

function displayResults(re, neg) {
  let html = '';
  if (re.length) {
    html += `<h2>📋 Restock Needed</h2><table><tr><th>Category</th><th>Item</th><th>Sold</th><th>In Stock</th><th>Restock</th></tr>`;
    re.forEach(i => html += `<tr><td>${i.category}</td><td>${i.item_name}</td><td>${i.items_sold}</td><td>${i.items_in_stock}</td><td>${i.restock_quantity}</td></tr>`);
    html += `</table>`;
  } else {
    html += `<p>✅ All stock levels are sufficient!</p>`;
  }
  if (neg.length) {
    html += `<h2 style="color:red;">⚠️ Negative Stock Items</h2><table><tr><th>Category</th><th>Item</th><th>In Stock</th><th>Sold</th></tr>`;
    neg.forEach(i => html += `<tr><td>${i.category}</td><td>${i.item_name}</td><td style="color:red;">${i.items_in_stock}</td><td>${i.items_sold}</td></tr>`);
    html += `</table>`;
  }
  document.getElementById('results').innerHTML = html;
}

function downloadCSV() {
  if (!reorderList.length) return;
  const blob = new Blob([Papa.unparse(reorderList)], { type: 'text/csv' });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "reorder_list.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function populateCategoryFilter(data) {
  const sel = document.getElementById('categoryFilter');
  sel.innerHTML = `<option value="">🔽 Filter by Category</option>`;
  new Set(data.map(i => i.category)).forEach(cat => {
    const o = document.createElement('option');
    o.value = cat;
    o.textContent = cat;
    sel.appendChild(o);
  });
}

function filterResults() {
  const txt = document.getElementById("searchInput").value.toLowerCase();
  const cat = document.getElementById("categoryFilter").value.toLowerCase();
  document.querySelectorAll("#results table").forEach(t => {
    t.querySelectorAll("tr").forEach((tr,i) => {
      if (!i) return;
      const tx = tr.textContent.toLowerCase();
      tr.style.display = tx.includes(txt) && (cat === "" || tx.includes(cat)) ? "" : "none";
    });
  });
}

function init() {
  if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
  document.getElementById("multiplierInput").value = localStorage.getItem('reorderMultiplier') || 1.0;
  document.getElementById("bufferInput").value = localStorage.getItem('bufferPercent') || 20;
  loadHistory();
}

window.addEventListener('DOMContentLoaded', init);
