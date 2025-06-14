# Cloud 9 Vapes Inventory Manager – v1.9.8

**Created by Shane Warren**

## 🔍 Purpose

A fast, offline-first inventory analysis tool for Cloud 9 Vapes. Upload your stock CSV and instantly get restock needs based on recent sales.

---

## 🚀 Features

- 📤 Drag & Drop CSV Upload (or select manually)
- 🧠 Calculates restock quantity based on sales + buffer
- 📊 Table view of:
  - Restock items
  - Out of stock
  - Negative stock
- 🔍 Search and Category Filtering
- 📐 Sortable columns (asc/desc)
- 💾 Multiplier & buffer saved in localStorage
- 🌓 Light & Dark mode
- 📱 Fully mobile responsive

---

## 🛠 How to Use

1. Open `index.html` in your browser.
2. Drop or upload a CSV file with inventory data.
3. Set your Reorder Multiplier and Buffer %.
4. Click “Analyze 🔍” to generate reorder recommendations.

---

## 📁 File Structure


---

## 🧾 CSV Format

CSV file should contain at least:

- `Product name`
- `Category`
- `Qty`
- `Last Sales/7 Days`

### Example:

```csv
ID,Product name,Category,Qty,Low stock qty,Purchased Qty,Last Sales/7 Days
2567,Gold Spectrum 3.5g Flower Sundae Runtz,Flower,0,2,0,3

