# 💻 Techie Inventory

A modern, browser-based inventory management app for tracking **computer components** (RAM, HDD, SSD, CPU, GPU) and **devices** (Laptops & Desktop PCs).  
Built with plain **HTML + CSS + Vanilla JavaScript** — no frameworks, no server, no install needed.  
All data is stored locally in the browser via **localStorage**.

---

## 🚀 How to Run

Just open `index.html` in any modern browser (Chrome, Edge, Firefox).  
No build step or server required.

```
INTERN_PROJECT/
└── techie-inventory/
    ├── index.html       ← Open this in your browser
    ├── app.js
    ├── style.css
    ├── empty_state.svg
    └── README.md
```

---

## 📦 Features

### 📊 Dashboard
- Live stat cards: Total Components, Healthy, Faulty, Logged Today, Total Devices
- Component breakdown bar chart (healthy vs faulty per type)
- Recent activity feed (components + devices merged, sorted by date)
- Device health summary (Sound, Keyboard, Screen, Camera condition bars)

### ➕ Add / Edit Inventory (Components)
- Component types: **RAM, HDD, SSD SATA, SSD NVMe, CPU, GPU**
- Fields: Type, Brand, Capacity/Model, Healthy Qty, Faulty Qty, Date Checked, Notes
- Total quantity is calculated automatically
- Edit any existing item in-place

### 📦 View Inventory
- Searchable & filterable table (by keyword, type, brand)
- Status badges: ✅ Healthy / ⚠️ Faulty / 🔶 Mixed
- Edit ✏️ and Delete 🗑️ per row
- **Export CSV** — downloads currently filtered data as `.csv`
- **Export JSON** — downloads currently filtered data as `.json`
- **Import JSON** — bulk-loads items from a `.json` file with preview & duplicate detection

### ➕ Add / Edit Devices
- Device types: **Laptop, Desktop PC**
- Fields: Type, Brand, Model, RAM, CPU, Storage, Date Checked, Notes
- Per-category condition ratings: **Sound, Keyboard, Screen, Camera** → Good / Fair / Poor / N/A

### 🖥️ View Devices
- Searchable & filterable table (by keyword, type, condition)
- Condition badges per category
- Edit ✏️ and Delete 🗑️ per row
- **Export CSV** — downloads device data as `.csv`
- **Export JSON** — downloads device data as `.json`
- **Import JSON** — bulk-loads devices from a `.json` file with preview & duplicate detection

### 🌙 Dark / Light Mode
- Toggle in the sidebar footer
- Preference saved to localStorage

---

## 📤 Export JSON Format

### Inventory (`techie-inventory-YYYY-MM-DD.json`)
```json
[
  {
    "id": "item-...",
    "type": "RAM",
    "brand": "Kingston",
    "capacity": "8GB DDR4",
    "healthyQty": 12,
    "faultyQty": 1,
    "totalQty": 13,
    "status": "Mixed",
    "notes": "",
    "dateChecked": "2026-07-15",
    "dateAdded": "2026-07-15T08:00:00.000Z"
  }
]
```

### Devices (`techie-devices-YYYY-MM-DD.json`)
```json
[
  {
    "id": "item-...",
    "type": "Laptop",
    "brand": "Dell",
    "model": "Dell Latitude 5540",
    "ram": "16GB DDR5",
    "cpu": "i7 13th Gen Intel(R)",
    "storage": "512GB",
    "condSound": "Good",
    "condKeyboard": "Good",
    "condScreen": "Good",
    "condCamera": "Good",
    "notes": "",
    "dateChecked": "2026-07-15",
    "dateAdded": "2026-07-15T08:00:00.000Z"
  }
]
```

---

## 📥 Import JSON — How It Works

1. Go to **View Inventory** or **View Devices**
2. Click **📂 Import JSON**
3. Select a `.json` file (must match the format above)
4. A **preview modal** opens showing:
   - How many records were found
   - ✅ How many are **new** (will be added)
   - ⏭️ How many are **duplicates** (already exist, will be skipped)
   - A scrollable preview table of the first 10 items
5. Click **✅ Import All** to confirm

> **Duplicate detection** is based on the `id` field.  
> If a record's `id` already exists in the app, it is skipped automatically.

---

## 💾 Data Storage

| Key | Contents |
|-----|----------|
| `techie-inventory-v2` | All inventory (component) records |
| `techie-devices-v1` | All device records |
| `techie-theme` | `"light"` or `"dark"` |
| `techie-seeded` | `"1"` after demo data is loaded on first launch |

All data lives in **browser localStorage** — it persists across page refreshes but is tied to that specific browser on that machine.  
Use **Export JSON** regularly to back up your data!

---

## 🗂️ File Structure

```
techie-inventory/
├── index.html        — Full app UI (HTML structure, all pages, modals)
├── app.js            — All logic: CRUD, export/import, rendering, navigation
├── style.css         — All styles: layout, components, dark mode, animations
├── empty_state.svg   — Illustration shown when inventory is empty
└── README.md         — This file
```

### Key sections in `app.js`

| Section | What it does |
|---------|-------------|
| `DATA STORE` | localStorage keys, load on startup |
| `COMPONENT META` | Icons & colors per component type |
| `THEME MANAGEMENT` | Dark/light toggle |
| `PAGE NAVIGATION` | `navigateTo()` — switches between pages |
| `DASHBOARD RENDER` | Stats, breakdown chart, activity feed |
| `INVENTORY TABLE RENDER` | Filter, search, render rows |
| `ADD / EDIT FORM` | Form submit, populate, reset |
| `DELETE` | Confirm modal + execute delete |
| `TOAST` | Notification popups |
| `EXPORT TO CSV` | `exportToCSV()` — inventory |
| `EXPORT TO JSON` | `exportToJSON()` — inventory |
| `DEVICES — CRUD` | Add/edit/delete devices |
| `DEVICES — TABLE RENDER` | Filter, search, render device rows |
| `DEVICES — EXPORT CSV` | `exportDevicesCSV()` |
| `IMPORT JSON — SHARED HELPERS` | Modal open/close/confirm logic |
| `IMPORT INVENTORY JSON` | `importInventoryJSON(file)` |
| `IMPORT DEVICES JSON` | `importDevicesJSON(file)` |
| `DEMO DATA` | `seedDemoData()` — runs on very first launch |

---

## 🛠️ Changes Made (Session Log)

### ✅ Export JSON (added)
- `exportToJSON()` — exports filtered inventory to `.json`
- `exportDevicesJSON()` — exports filtered devices to `.json`
- **📄 Export JSON** buttons added to both Inventory and Devices control bars
- Respects current search/filter (what you see = what you export)

### ✅ Import JSON (added)
- **📂 Import JSON** buttons (blue-purple gradient) in both control bars
- Hidden `<input type="file">` per section (triggered by button click)
- Full import pipeline:
  - Parse & validate JSON
  - Detect & skip duplicates by `id`
  - Preview modal with scrollable table (first 10 rows shown)
  - Stats badges: ✅ N new / ⏭️ N duplicates skipped
  - Confirm button imports all new items at once
- Works with files exported by this same app
- Dark mode support for all new UI elements

---

## 👤 Author / Intern Notes

- **Project**: Techie Inventory — Internal IT asset tracker
- **Git remote**: `tasnimlvrtas-cmd` (GitHub)
- **Email**: tasnimlvrtas@gmail.com
- **Data as of**: July 2026 — 40+ devices logged (Dell, HP Laptops)

> 💡 **Tip**: After adding a batch of devices, always click **Export JSON** to save a backup copy to your Downloads folder.