(() => {
  let historyList = [], restockList = [], negList = [];
  let sortConfig = { table: 'restock', key: 'Category', asc: true };

  const $ = id => document.getElementById(id);
  const dropZone = $('dropZone');
  const fileInput = $('csvFile');
  const analyzeButton = $('analyzeButton');
  const downloadCsvBtn = $('downloadCsvBtn');
  const printViewBtn = $('printViewBtn');
  const themeToggle = $('themeToggle');

  function init() {
    initTheme();
    setupHandlers();
    loadSettings();
    loadHistory();
  }

  function initTheme() {
    if (localStorage.theme === 'dark') document.body.classList.add('theme-dark');
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('theme-dark');
      localStorage.theme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
    });
  }

  function setupHandlers() {
    fileInput.addEventListener('change', e => {
      if (e.target.files.length) readCSV(e.target.files[0]);
    });

    ['dragover', 'dragenter'].forEach(evt => {
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', e => {
      if (e.dataTransfer.files.length) readCSV(e.dataTransfer.files[0]);
    });

    dropZone.addEventListener('click', () => fileInput.click());

    analyzeButton.addEventListener('click', () => {
      if (fileInput.files.length) readCSV(fileInput.files[0]);
      else alert('Drop or select a CSV file first!');
    });

    downloadCsvBtn.addEventListener('click', downloadReorderCsv);
    printViewBtn.addEventListener('click', () => window.print());

    $('periodSelect').addEventListener('change', saveSettings);
    $('multiplierInput').addEventListener('change', saveSettings);
    $('bufferInput').addEventListener('change', saveSettings);
    $('searchInput').addEventListener('input', filterResults);
    $('categoryFilter').addEventListener('change', filterResults);
  }

  function readCSV(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return alert('Please select a CSV file');
    }
    const fr = new FileReader();
    fr.onload = () => processCSV(fr.result, file.name);
    fr.readAsText(file);
  }

  function processCSV(text, name) {
    addHistory(name, text);
    const period = $('periodSelect').value;
    const soldKey = `Last Sales/${period} Days`;
    const m = parseFloat($('multiplierInput').value) || 1;
    const b = parseFloat($('bufferInput').value) || 0;

    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: res => {
        restockList = [];
        negList = [];
        res.data.forEach(r => {
          const sold = +r[soldKey] || 0;
          const stock = +r.Qty || 0;
          const qty = Math.max(0, Math.ceil(sold * m + Math.ceil(sold * m * (b / 100)) - stock));
          if (qty) restockList.push({
            Category: r.Category,
            Item: r['Product name'],
            Sold: sold,
            Stock: stock,
            Qty: qty
          });
          if (stock < 0) negList.push({
            Category: r.Category,
            Item: r['Product name'],
            Stock: stock
          });
        });
        populateCategory();
        renderTables();
        populateHistory();
      }
    });
  }

  function saveSettings() {
    localStorage.period = $('periodSelect').value;
    localStorage.reorderMultiplier = $('multiplierInput').value;
    localStorage.bufferPercent = $('bufferInput').value;
  }

  function loadSettings() {
    $('periodSelect').value = localStorage.period || '7';
    $('multiplierInput').value = localStorage.reorderMultiplier || 1;
    $('bufferInput').value = localStorage.bufferPercent || 0;
  }

  function addHistory(name, content) {
    historyList = JSON.parse(localStorage.uploadHistory || '[]');
    historyList.unshift({ name, time: Date.now(), content });
    if (historyList.length > 5) historyList.length = 5;
    localStorage.uploadHistory = JSON.stringify(historyList);
  }

  function loadHistory() {
    historyList = JSON.parse(localStorage.uploadHistory || '[]');
    populateHistory();
  }

  function populateHistory() {
    const ul = $('uploadHistory');
    ul.innerHTML = '<li><strong>History</strong></li>';
    historyList.forEach((h, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${h.name} – ${new Date(h.time).toLocaleString()}</span>
        <button onclick="replay(${i})">Re-run</button>
        <button onclick="remove(${i})">Delete</button>`;
      ul.appendChild(li);
    });
    window.replay = idx => processCSV(historyList[idx].content, historyList[idx].name);
    window.remove = idx => {
      historyList.splice(idx, 1);
      localStorage.uploadHistory = JSON.stringify(historyList);
      populateHistory();
    };
  }

  function populateCategory() {
    const sel = $('categoryFilter');
    sel.innerHTML = '<option value="">Filter by Category</option>';
    const unique = [...new Set(restockList.map(r => r.Category))];
    unique.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  }

  function renderTables() {
    const out = $('results');
    let html = '';

    if (restockList.length) {
      html += '<h2>📋 Restock Items</h2><table id="restock"><tr>';
      ['Category','Item','Sold','Stock','Qty'].forEach(c => {
        html += `<th onclick="psort('restock','${c}')">${c}</th>`;
      });
      html += '</tr>';
      restockList.forEach(r => {
        html += `<tr><td>${r.Category}</td><td>${r.Item}</td><td>${r.Sold}</td><td>${r.Stock}</td><td>${r.Qty}</td></tr>`;
      });
      html += '</table>';
    }

    if (negList.length) {
      html += '<h2 style="color:red;">⚠️ Negative Stock</h2><table id="neg"><tr>';
      ['Category','Item','Stock'].forEach(c => {
        html += `<th onclick="psort('neg','${c}')">${c}</th>`;
      });
      html += '</tr>';
      negList.forEach(n => {
        html += `<tr><td>${n.Category}</td><td>${n.Item}</td><td style="color:red;">${n.Stock}</td></tr>`;
      });
      html += '</table>';
    }

    out.innerHTML = html;
    refreshSort();
  }

  window.psort = (table, key) => {
    const arr = table === 'restock' ? restockList : negList;
    sortConfig.asc = sortConfig.table === table && sortConfig.key === key ? !sortConfig.asc : true;
    sortConfig = { table, key, asc: sortConfig.asc };
    arr.sort((a,b) => {
      const vA = a[key], vB = b[key];
      if (typeof vA === 'number') return sortConfig.asc ? vA - vB : vB - vA;
      return sortConfig.asc ? vA.localeCompare(vB) : vB.localeCompare(vA);
    });
    renderTables();
  };

  function refreshSort() {
    document.querySelectorAll('th').forEach(th => {
      th.classList.remove('sort-asc','sort-desc');
      const tbl = th.closest('table')?.id, col = th.textContent;
      if (tbl === sortConfig.table && col === sortConfig.key) {
        th.classList.add(sortConfig.asc ? 'sort-asc' : 'sort-desc');
      }
    });
  }

  window.filterResults = () => {
    const q = $('searchInput').value.toLowerCase();
    const c = $('categoryFilter').value.toLowerCase();
    document.querySelectorAll('#results table tr').forEach((tr,i) => {
      if (i === 0) return;
      tr.style.display = (tr.textContent.toLowerCase().
        includes(q) && (c === '' || tr.textContent.toLowerCase().includes(c))) ? '' : 'none';
    });
  };

  function downloadReorderCsv() {
    if (!restockList.length) return alert('No restock data to download!');
    const csv = Papa.unparse(restockList);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reorder_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  init();
})();
