# Cloud 9 Vapes Inventory Manager – v1.11.0

**Created by Shane Warren**

## 🔍 Purpose

An offline-first inventory restock analysis tool. Upload your CSV file and instantly calculate reorder amounts using recent sales data with customizable buffer and multipliers.

---

## 🚀 Features

- 📤 Drag & Drop CSV Upload (or manual file select)
- 🧠 Smart Restock Calculation based on 7/30/60/90 day sales
- 🔧 Adjustable Multiplier & Safety Buffer (saved locally)
- 📊 Interactive Tables:
  - Restock List
  - Negative Stock Warnings
- 🔍 Live Search and Category Filtering
- 📐 Clickable Column Sorting
- 📦 **Export Options**:
  - ⬇️ Download Reorder List (CSV)
  - 🖨️ Print or Save as PDF
- 🌓 Light & Dark Theme Toggle (saved across sessions)
- 📱 Fully Mobile-Responsive UI
- 🕓 Upload History with Re-run & Delete buttons

---

## 📁 File Structure


---

## 📄 Required CSV Format

Your file must include these headers:


### ✅ Example:

```csv
ID,Product name,Category,Qty,Low stock qty,Purchased Qty,Last Sales/7 Days,Last Sales/30 Days,Last Sales/60 Days,Last Sales/90 Days
2567,Gold Spectrum 3.5g Flower Sundae Runtz,Flower,0,2,0,3,6,9,12
