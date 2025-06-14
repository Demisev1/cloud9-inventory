let reorderList = [];
let negativeStockList = [];

function processCSV() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) {
    alert('Please select a CSV file.');
    return;
  }

  const multiplier = parseFloat(document.getElementById("multiplierInput").value) || 1.0;
  const bufferPercent = parseFloat(document.getElementById("bufferInput").value) || 0;

  // Save to localStorage
  localStorage.setItem('reorderMultiplier', multiplier);
  localStorage.setItem('bufferPercent', bufferPercent);

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: results => {
      reorderList = [];
      negativeStockList = [];

      results.data.forEach(row => {
        const sold = parseInt(row['Last Sales/7 Days'] || 0);
        const stock = parseInt(row['Qty'] || 0);
        const buffer = Math.ceil((sold * multiplier) * (bufferPercent / 100));
        const restockQty = Math.max(0, Math.ceil((sold * multiplier) + buffer - stock));

        const item = {
          item_name: row['Product name'],
          category: row['Category'] || 'Uncategorized',
          items_sold: sold,
          items_in_stock: stock,
          restock_quantity: restockQty
        };

        if (restockQty > 0) reorderList.push(item);
        if (stock < 0) negativeStockList.push(item);
      });

      reorderList.sort((a, b) => {
        if (a.category.toLowerCase() < b.category.toLowerCase()) return -1;
        if (a.category.toLowerCase() > b.category.toLowerCase()) return 1;
        return b.restock_quantity - a.restock_quantity;
      });

      populateCategoryFilter(reorderList);
      displayResults(reorderList, negativeStockList);
      document.getElementById('downloadBtn').style.display = reorderList.length > 0 ? 'inline-block' : 'none';
    }
  });
}

function displayResults(reorderItems, negativeItems) {
  const resultsDiv = document.getElementById('results');
  let html = '';

  if (reorderItems.length) {
    html += `<h2>📋 Restock Needed</h2><table><tr><th>Category</th><th>Item</th><th>Sold (7 Days)</th><th>In Stock</th><th>Restock Qty</th></tr>`;
    reorderItems.forEach(i => {
      html += `<tr><td>${i.category}</td><td>${i.item_name}</td><td>${i.items_sold}</td><td>${i.items_in_stock}</td><td>${i.restock_quantity}</td></tr>`;
    });
    html += `</table>`;
  } else {
    html += `<p>✅ All stock levels are sufficient!</p>`;
  }

  if (negativeItems.length) {
    html += `<h2 style="color:red;">⚠️ Negative Stock Items</h2><table><tr><th>Category</th><th>Item</th><th>In Stock</th><th>Sold (7 Days)</th></tr>`;
    negativeItems.forEach(i => {
      html += `<tr><td>${i.category}</td><td>${i.item_name}</td><td style="color:red;">${i.items_in_stock}</td><td>${i.items_sold}</td></tr>`;
    });
    html += `</table>`;
  }

  resultsDiv.innerHTML = html;
}

function downloadCSV() {
  if (!reorderList.length) return;
  const blob = new Blob([Papa.unparse(reorderList)], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "reorder_list.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function populateCategoryFilter(data) {
  const sel = document.getElementById('categoryFilter');
  sel.innerHTML = `<option value="">🔽 Filter by Category</option>`;
  Array.from(new Set(data.map(i => i.category))).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

function filterResults() {
  const text = document.getElementById("searchInput").value.toLowerCase();
  const catFilter = document.getElementById("categoryFilter").value.toLowerCase();
  document.querySelectorAll("#results table").forEach(table => {
    table.querySelectorAll("tr").forEach((row, idx) => {
      if (!idx) return;
      const rowText = row.textContent.toLowerCase();
      row.style.display = rowText.includes(text) && (catFilter === "" || rowText.includes(catFilter)) ? "" : "none";
    });
  });
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark ? 'true' : 'false');
}

function restoreSettings() {
  const multiplier = localStorage.getItem('reorderMultiplier');
  const buffer = localStorage.getItem('bufferPercent');
  const darkMode = localStorage.getItem('darkMode');

  if (multiplier) document.getElementById("multiplierInput").value = multiplier;
  if (buffer) document.getElementById("bufferInput").value = buffer;
  if (darkMode === 'true') document.body.classList.add('dark-mode');
}

window.addEventListener("DOMContentLoaded", restoreSettings);
