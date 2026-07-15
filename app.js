/**
 * TECHIE INVENTORY — APP LOGIC
 * Vanilla JS, localStorage persistence
 */

// =========================================
// DATA STORE
// =========================================
const STORAGE_KEY  = 'techie-inventory-v2';
const DEVICES_KEY  = 'techie-devices-v1';
const THEME_KEY    = 'techie-theme';

let inventory  = JSON.parse(localStorage.getItem(STORAGE_KEY))  || [];
let devices    = JSON.parse(localStorage.getItem(DEVICES_KEY))  || [];

// Seed demo data on very first launch
if (inventory.length === 0 && !localStorage.getItem('techie-seeded')) {
  // defer until after functions are defined
  window.__needsSeed = true;
}
let editingId  = null;
let deleteId   = null;
let editingDeviceId = null;
let deleteDeviceId  = null;

function saveInventory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

function saveDevices() {
  localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
}

function generateId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// =========================================
// COMPONENT META
// =========================================
const COMPONENT_META = {
  RAM:      { icon: '🧠', label: 'RAM',       color: '#ede7f6', dark: '#2d2350' },
  HDD:      { icon: '💾', label: 'HDD',       color: '#e3f2fd', dark: '#1a2d45' },
  'SSD SATA':{ icon: '💿', label: 'SSD SATA', color: '#e8f5e9', dark: '#1a3d1f' },
  'SSD NVMe':{ icon: '⚡', label: 'SSD NVMe', color: '#fff8e1', dark: '#3d2e10' },
  CPU:      { icon: '🔲', label: 'CPU',       color: '#fce4ec', dark: '#3d1a22' },
  GPU:      { icon: '🎮', label: 'GPU',       color: '#f3e5f5', dark: '#2d1a42' },
};

const COMPONENT_TYPES = Object.keys(COMPONENT_META);

// =========================================
// THEME MANAGEMENT
// =========================================
let currentTheme = localStorage.getItem(THEME_KEY) || 'light';

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
}

// =========================================
// PAGE NAVIGATION
// =========================================
let currentPage = 'dashboard';

function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target
  const view = document.getElementById(`page-${page}`);
  if (view) view.classList.add('active');

  const navBtn = document.getElementById(`nav-${page}`);
  if (navBtn) navBtn.classList.add('active');

  // Update topbar
  updateTopbar(page);

  currentPage = page;

  // Refresh content
  if (page === 'dashboard')   renderDashboard();
  if (page === 'inventory')   renderInventoryTable();
  if (page === 'devices')     renderDevicesTable();

  // Close sidebar on mobile
  closeSidebarMobile();
}

function updateTopbar(page) {
  const titles = {
    dashboard:    { title: '📊 Dashboard',    sub: 'Overview of your component inventory' },
    add:          { title: '➕ Add Inventory', sub: 'Log new computer components' },
    inventory:    { title: '📦 Inventory',    sub: 'Browse and manage all components' },
    'add-device': { title: '➕ Add Device',    sub: 'Log a new laptop or desktop PC' },
    devices:      { title: '🖥️ Devices',      sub: 'Browse and manage all laptops and PCs' },
  };
  const info = titles[page] || {};
  document.getElementById('topbarTitle').textContent = info.title || '';
  document.getElementById('topbarSub').textContent   = info.sub   || '';
}

// =========================================
// DASHBOARD RENDER
// =========================================
function renderDashboard() {
  // Component stats
  const total   = inventory.reduce((s, i) => s + i.totalQty, 0);
  const healthy = inventory.reduce((s, i) => s + i.healthyQty, 0);
  const faulty  = inventory.reduce((s, i) => s + i.faultyQty, 0);

  // "Added today" = number of distinct inventory ENTRIES logged today
  const today      = new Date().toISOString().slice(0, 10);
  const todayItems = inventory.filter(i => i.date === today).length;

  animateCount('statTotal',   total);
  animateCount('statHealthy', healthy);
  animateCount('statFaulty',  faulty);
  animateCount('statToday',   todayItems);

  // Device stats
  const totalDevices   = devices.length;
  const laptopCount    = devices.filter(d => d.type === 'Laptop').length;
  const desktopCount   = devices.filter(d => d.type === 'Desktop PC').length;

  animateCount('statDevices',  totalDevices);

  // Update device sub-stat text
  const deviceSubEl = document.getElementById('statDevicesSub');
  if (deviceSubEl) {
    if (totalDevices === 0) {
      deviceSubEl.textContent = 'No devices logged yet';
    } else {
      const parts = [];
      if (laptopCount  > 0) parts.push(`${laptopCount} laptop${laptopCount  !== 1 ? 's' : ''}`);
      if (desktopCount > 0) parts.push(`${desktopCount} desktop${desktopCount !== 1 ? 's' : ''}`);
      deviceSubEl.textContent = parts.join(' · ');
    }
  }

  // Update "today" label to show items vs units
  const todayTrendEl = document.getElementById('statTodayTrend');
  if (todayTrendEl) {
    todayTrendEl.textContent = todayItems === 1 ? '1 entry logged today' : `${todayItems} entries logged today`;
  }

  renderTypeBreakdown();
  renderRecentActivity();
  renderDeviceConditionSummary();
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderTypeBreakdown() {
  const container = document.getElementById('typeBreakdown');
  if (!container) return;

  const healthyCounts = {};
  const faultyCounts  = {};
  COMPONENT_TYPES.forEach(t => { healthyCounts[t] = 0; faultyCounts[t] = 0; });
  inventory.forEach(i => {
    if (healthyCounts[i.type] !== undefined) {
      healthyCounts[i.type] += i.healthyQty;
      faultyCounts[i.type]  += i.faultyQty;
    }
  });

  const totals = COMPONENT_TYPES.map(t => healthyCounts[t] + faultyCounts[t]);
  const max    = Math.max(...totals, 1);

  if (inventory.length === 0) {
    container.innerHTML = `<p class="text-muted" style="font-size:13px;text-align:center;padding:20px 0;">No components yet. <button class="dash-link" onclick="openAdd()">Add your first item →</button></p>`;
    return;
  }

  container.innerHTML = COMPONENT_TYPES.map(type => {
    const meta    = COMPONENT_META[type];
    const hCount  = healthyCounts[type];
    const fCount  = faultyCounts[type];
    const total   = hCount + fCount;
    const hPct    = Math.round((hCount / max) * 100);
    const fPct    = Math.round((fCount / max) * 100);
    if (total === 0) return ''; // skip empty types
    return `
      <div class="type-bar-item">
        <div class="type-bar-label">
          <span>${meta.icon}</span>
          <span>${type}</span>
        </div>
        <div class="type-bar-track">
          <div class="type-bar-fill type-bar-healthy" style="width: 0%" data-target="${hPct}"></div>
          <div class="type-bar-fill type-bar-faulty"  style="width: 0%" data-target="${fPct}"></div>
        </div>
        <div class="type-bar-count">
          <span class="qty-green" title="Healthy">✓${hCount}</span>
          ${fCount > 0 ? `<span class="qty-red" title="Faulty"> ✕${fCount}</span>` : ''}
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  // Animate bars
  setTimeout(() => {
    container.querySelectorAll('.type-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  }, 50);
}

function renderRecentActivity() {
  const container = document.getElementById('recentActivity');
  if (!container) return;

  // Merge inventory + device events into one feed
  const invEvents = inventory.map(i => ({
    kind: 'component',
    icon: (COMPONENT_META[i.type] || {}).icon || '📦',
    label: `${i.brand} ${i.type}${i.capacity ? ' (' + i.capacity + ')' : ''}`,
    detail: `${i.totalQty} unit${i.totalQty !== 1 ? 's' : ''} · ${i.healthyQty} healthy${i.faultyQty > 0 ? ', ' + i.faultyQty + ' faulty' : ''}`,
    ts: i.createdAt,
    dotColor: currentTheme === 'dark' ? '#9575cd' : '#b39ddb',
  }));

  const devEvents = devices.map(d => ({
    kind: 'device',
    icon: d.type === 'Laptop' ? '💻' : '🖥️',
    label: `${d.brand} ${d.model}`,
    detail: `${d.type}${d.ram ? ' · ' + d.ram : ''}${d.cpu ? ' · ' + d.cpu : ''}`,
    ts: d.createdAt,
    dotColor: currentTheme === 'dark' ? '#4fc3f7' : '#90caf9',
  }));

  const all = [...invEvents, ...devEvents]
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, 8);

  if (all.length === 0) {
    container.innerHTML = `<p class="text-muted" style="font-size:13px;text-align:center;padding:20px 0;">No activity yet. <button class="dash-link" onclick="openAdd()">Add your first item →</button></p>`;
    return;
  }

  container.innerHTML = all.map(ev => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${ev.dotColor}"></div>
      <div style="flex:1;min-width:0">
        <div class="activity-text">
          ${ev.icon} <strong>${escHtml(ev.label)}</strong>
        </div>
        <div class="activity-detail">${escHtml(ev.detail)}</div>
        <div class="activity-time">${timeAgo(ev.ts)}</div>
      </div>
    </div>
  `).join('');
}

function timeAgo(isoStr) {
  const diff = (Date.now() - new Date(isoStr)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderDeviceConditionSummary() {
  const container = document.getElementById('deviceCondSummary');
  if (!container) return;

  if (devices.length === 0) {
    container.innerHTML = `<p class="text-muted" style="font-size:13px;text-align:center;padding:20px 0;">No devices logged yet. <button class="dash-link" onclick="openAddDevice()">Add your first device →</button></p>`;
    return;
  }

  const cats = [
    { key: 'condSound',    label: 'Sound',    icon: '🔊' },
    { key: 'condKeyboard', label: 'Keyboard', icon: '⌨️' },
    { key: 'condScreen',   label: 'Screen',   icon: '🖼️' },
    { key: 'condCamera',   label: 'Camera',   icon: '📷' },
  ];

  const condOrder = ['Good', 'Fair', 'Poor'];
  const condColors = { Good: '#4caf50', Fair: '#ff9800', Poor: '#f44336' };

  container.innerHTML = cats.map(cat => {
    const vals = devices.map(d => d[cat.key]).filter(Boolean);
    const total = vals.length;
    if (total === 0) return '';

    const counts = { Good: 0, Fair: 0, Poor: 0 };
    vals.forEach(v => { if (counts[v] !== undefined) counts[v]++; });

    // Dominant condition
    const dom = condOrder.reduce((a, b) => counts[a] >= counts[b] ? a : b);
    const domDot = dom === 'Good' ? '🟢' : dom === 'Fair' ? '🟡' : '🔴';

    const bars = condOrder.filter(c => counts[c] > 0).map(c => {
      const pct = Math.round((counts[c] / total) * 100);
      return `<div class="cond-seg" style="width:${pct}%;background:${condColors[c]}" title="${c}: ${counts[c]}"></div>`;
    }).join('');

    return `
      <div class="dev-cond-row">
        <div class="dev-cond-label">${cat.icon} ${cat.label}</div>
        <div class="dev-cond-bar">${bars}</div>
        <div class="dev-cond-badge">${domDot} ${dom}</div>
      </div>
    `;
  }).filter(Boolean).join('') ||
    `<p class="text-muted" style="font-size:13px;text-align:center;padding:20px 0;">Condition data not filled in yet.</p>`;

  // Summary line
  const total = devices.length;
  const goodDevices  = devices.filter(d => [d.condSound, d.condKeyboard, d.condScreen, d.condCamera].every(c => !c || c === 'Good' || c === 'N/A')).length;
  const poorDevices  = devices.filter(d => [d.condSound, d.condKeyboard, d.condScreen, d.condCamera].some(c => c === 'Poor')).length;

  const summaryEl = document.getElementById('deviceCondSummarySub');
  if (summaryEl) {
    const parts = [];
    if (goodDevices > 0) parts.push(`${goodDevices} fully good`);
    if (poorDevices > 0) parts.push(`${poorDevices} with poor parts`);
    summaryEl.textContent = parts.length ? `${total} device${total !== 1 ? 's' : ''} — ${parts.join(', ')}` : `${total} device${total !== 1 ? 's' : ''} tracked`;
  }
}

// =========================================
// INVENTORY TABLE RENDER
// =========================================
let searchQuery  = '';
let filterType   = '';
let filterBrand  = '';

function renderInventoryTable() {
  const tbody  = document.getElementById('inventoryTbody');
  const empty  = document.getElementById('inventoryEmpty');
  const countEl = document.getElementById('resultsCount');

  if (!tbody) return;

  // Rebuild brand filter options
  buildBrandFilter();

  const filtered = inventory.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || [item.brand, item.type, item.capacity, item.notes]
                          .some(f => (f || '').toLowerCase().includes(q));
    const matchT = !filterType  || item.type  === filterType;
    const matchB = !filterBrand || item.brand === filterBrand;
    return matchQ && matchT && matchB;
  });

  if (countEl) countEl.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (empty) empty.style.display = 'none';

  tbody.innerHTML = filtered.map(item => {
    const meta   = COMPONENT_META[item.type] || { icon: '📦', color: '#e0e0e0' };
    const status = item.faultyQty === 0 ? 'healthy' :
                   item.healthyQty === 0 ? 'faulty' : 'mixed';

    const badgeHtml = status === 'healthy'
      ? `<span class="badge badge-healthy">✅ Healthy</span>`
      : status === 'faulty'
      ? `<span class="badge badge-faulty">⚠️ Faulty</span>`
      : `<span class="badge badge-mixed">🔶 Mixed</span>`;

    const fmtDate = item.date
      ? new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      : '—';

    return `
      <tr data-id="${item.id}">
        <td>
          <div class="comp-cell">
            <div class="comp-icon-badge" style="background:${meta.color}">
              ${meta.icon}
            </div>
            <div>
              <div class="comp-name">${escHtml(item.brand)}</div>
              <div class="comp-type">${item.type}${item.capacity ? ' · ' + escHtml(item.capacity) : ''}</div>
            </div>
          </div>
        </td>
        <td><span class="chip">${meta.icon} ${item.type}</span></td>
        <td>${escHtml(item.capacity || '—')}</td>
        <td><span class="qty-green">✓ ${item.healthyQty}</span></td>
        <td><span class="qty-red">${item.faultyQty > 0 ? '✕ ' + item.faultyQty : '—'}</span></td>
        <td><strong>${item.totalQty}</strong></td>
        <td>${badgeHtml}</td>
        <td class="text-muted" style="font-size:12px">${fmtDate}</td>
        <td>
          <div class="row-actions">
            <button class="btn-icon" title="Edit" onclick="openEdit('${item.id}')">✏️</button>
            <button class="btn-icon" title="Delete" onclick="confirmDelete('${item.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function buildBrandFilter() {
  const sel = document.getElementById('filterBrand');
  if (!sel) return;
  const brands = [...new Set(inventory.map(i => i.brand))].sort();
  const current = sel.value;
  sel.innerHTML = `<option value="">All Brands</option>` +
    brands.map(b => `<option value="${escHtml(b)}" ${current === b ? 'selected' : ''}>${escHtml(b)}</option>`).join('');
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =========================================
// ADD / EDIT FORM
// =========================================
function openAdd() {
  editingId = null;
  resetForm();
  updateFormHeader(false);
  navigateTo('add');
}

function openEdit(id) {
  const item = inventory.find(i => i.id === id);
  if (!item) return;
  editingId = id;
  populateForm(item);
  updateFormHeader(true);
  navigateTo('add');
}

function updateFormHeader(isEdit) {
  const title = document.getElementById('formTitle');
  const sub   = document.getElementById('formSub');
  const btn   = document.getElementById('formSubmitBtn');
  if (title) title.textContent = isEdit ? 'Edit Item' : 'Add New Item';
  if (sub)   sub.textContent   = isEdit ? 'Update component details below' : 'Fill in the details for the new component';
  if (btn)   btn.textContent   = isEdit ? '💾 Save Changes' : '✅ Add to Inventory';
}

function populateForm(item) {
  setField('fType',      item.type);
  setField('fBrand',     item.brand);
  setField('fCapacity',  item.capacity);
  setField('fHealthy',   item.healthyQty);
  setField('fFaulty',    item.faultyQty);
  setField('fNotes',     item.notes);
  setField('fDate',      item.date);
  updateTotal();
}

function setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function resetForm() {
  ['fType','fBrand','fCapacity','fHealthy','fFaulty','fNotes'].forEach(id => setField(id, ''));
  setField('fDate', new Date().toISOString().slice(0, 10));
  updateTotal();
}

function updateTotal() {
  const h = parseInt(document.getElementById('fHealthy')?.value) || 0;
  const f = parseInt(document.getElementById('fFaulty')?.value)  || 0;
  const totalEl = document.getElementById('fTotal');
  if (totalEl) totalEl.textContent = h + f;
}

function handleFormSubmit(e) {
  e.preventDefault();

  const type      = document.getElementById('fType').value.trim();
  const brand     = document.getElementById('fBrand').value.trim();
  const capacity  = document.getElementById('fCapacity').value.trim();
  const healthyQty = parseInt(document.getElementById('fHealthy').value) || 0;
  const faultyQty  = parseInt(document.getElementById('fFaulty').value)  || 0;
  const notes     = document.getElementById('fNotes').value.trim();
  const date      = document.getElementById('fDate').value;

  if (!type || !brand) {
    showToast('Please fill in Component Type and Brand.', 'error');
    return;
  }

  if (healthyQty < 0 || faultyQty < 0) {
    showToast('Quantities cannot be negative.', 'error');
    return;
  }

  const totalQty = healthyQty + faultyQty;

  if (editingId) {
    const idx = inventory.findIndex(i => i.id === editingId);
    if (idx > -1) {
      inventory[idx] = { ...inventory[idx], type, brand, capacity, healthyQty, faultyQty, totalQty, notes, date };
      showToast('Item updated successfully! 🎉', 'success');
    }
    editingId = null;
  } else {
    inventory.unshift({
      id: generateId(),
      type, brand, capacity,
      healthyQty, faultyQty, totalQty,
      notes, date,
      createdAt: new Date().toISOString(),
    });
    showToast('Item added to inventory! ✨', 'success');
    resetForm();
  }

  saveInventory();
  navigateTo('inventory');
}

// =========================================
// DELETE
// =========================================
function confirmDelete(id) {
  deleteId = id;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.style.display = 'flex';
}

function closeDeleteModal() {
  deleteId = null;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.style.display = 'none';
}

function executeDelete() {
  if (!deleteId) return;
  inventory = inventory.filter(i => i.id !== deleteId);
  saveInventory();
  closeDeleteModal();
  showToast('Item removed from inventory.', 'info');
  renderInventoryTable();
  if (currentPage === 'dashboard') renderDashboard();
}

// =========================================
// TOAST
// =========================================
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${msg}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

// =========================================
// MOBILE SIDEBAR
// =========================================
function openSidebarMobile() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('active');
}

function closeSidebarMobile() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
}

// =========================================
// INIT
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  applyTheme(currentTheme);

  // Set today's date as default
  const dateField = document.getElementById('fDate');
  if (dateField) dateField.value = new Date().toISOString().slice(0, 10);

  // Update topbar date
  const dateEl = document.getElementById('topbarDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  // Navigation
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.nav));
  });

  // Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    if (currentPage === 'dashboard') renderDashboard();
    if (currentPage === 'inventory') renderInventoryTable();
  });

  // Form
  document.getElementById('inventoryForm')?.addEventListener('submit', handleFormSubmit);

  document.getElementById('fHealthy')?.addEventListener('input', updateTotal);
  document.getElementById('fFaulty')?.addEventListener('input',  updateTotal);

  // Search & filter
  document.getElementById('searchInput')?.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderInventoryTable();
  });

  document.getElementById('filterType')?.addEventListener('change', e => {
    filterType = e.target.value;
    renderInventoryTable();
  });

  document.getElementById('filterBrand')?.addEventListener('change', e => {
    filterBrand = e.target.value;
    renderInventoryTable();
  });

  document.getElementById('clearFilters')?.addEventListener('click', () => {
    searchQuery = ''; filterType = ''; filterBrand = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('filterType').value  = '';
    document.getElementById('filterBrand').value = '';
    renderInventoryTable();
  });

  // Form cancel
  document.getElementById('formCancel')?.addEventListener('click', () => {
    editingId = null;
    navigateTo('inventory');
  });

  // Delete modal
  document.getElementById('deleteConfirmBtn')?.addEventListener('click', executeDelete);
  document.getElementById('deleteCancelBtn')?.addEventListener('click',  closeDeleteModal);

  // Mobile
  document.getElementById('hamburger')?.addEventListener('click', openSidebarMobile);
  document.getElementById('overlay')?.addEventListener('click', closeSidebarMobile);

  // Shortcut: Add Inventory button
  document.getElementById('addInventoryBtn')?.addEventListener('click', openAdd);
  document.getElementById('addFirstBtn')?.addEventListener('click', openAdd);

  // Export CSV (inventory)
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportToCSV);

  // Export JSON (inventory)
  document.getElementById('exportJsonBtn')?.addEventListener('click', exportToJSON);

  // ---- Device form ----
  document.getElementById('deviceForm')?.addEventListener('submit', handleDeviceFormSubmit);

  document.getElementById('deviceFormCancel')?.addEventListener('click', () => {
    editingDeviceId = null;
    navigateTo('devices');
  });

  // Device search & filter
  document.getElementById('deviceSearchInput')?.addEventListener('input', e => {
    deviceSearchQuery = e.target.value;
    renderDevicesTable();
  });

  document.getElementById('deviceFilterType')?.addEventListener('change', e => {
    deviceFilterType = e.target.value;
    renderDevicesTable();
  });

  document.getElementById('deviceFilterCondition')?.addEventListener('change', e => {
    deviceFilterCondition = e.target.value;
    renderDevicesTable();
  });

  document.getElementById('deviceClearFilters')?.addEventListener('click', () => {
    deviceSearchQuery = ''; deviceFilterType = ''; deviceFilterCondition = '';
    const si = document.getElementById('deviceSearchInput');
    const ft = document.getElementById('deviceFilterType');
    const fc = document.getElementById('deviceFilterCondition');
    if (si) si.value = ''; if (ft) ft.value = ''; if (fc) fc.value = '';
    renderDevicesTable();
  });

  // Export devices CSV
  document.getElementById('exportDeviceCsvBtn')?.addEventListener('click', exportDevicesCSV);

  // Export devices JSON
  document.getElementById('exportDeviceJsonBtn')?.addEventListener('click', exportDevicesJSON);

  // Seed demo data on very first launch
  if (window.__needsSeed) {
    seedDemoData();
    localStorage.setItem('techie-seeded', '1');
    inventory = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  }

  // Initial render
  navigateTo('dashboard');
});

// =========================================
// EXPORT TO CSV
// =========================================
function exportToCSV() {
  if (inventory.length === 0) {
    showToast('No inventory data to export!', 'error');
    return;
  }

  // Apply current filters so what you see is what you export
  const filtered = inventory.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || [item.brand, item.type, item.capacity, item.notes]
                          .some(f => (f || '').toLowerCase().includes(q));
    const matchT = !filterType  || item.type  === filterType;
    const matchB = !filterBrand || item.brand === filterBrand;
    return matchQ && matchT && matchB;
  });

  if (filtered.length === 0) {
    showToast('No items match the current filter to export.', 'error');
    return;
  }

  // Build CSV rows
  const headers = [
    'Component Type',
    'Brand',
    'Capacity / Model',
    'Healthy Quantity',
    'Faulty Quantity',
    'Total Quantity',
    'Status',
    'Notes',
    'Date Checked',
    'Date Added',
  ];

  const csvRows = [headers.join(',')];

  filtered.forEach(item => {
    const status = item.faultyQty === 0 ? 'Healthy'
                 : item.healthyQty === 0 ? 'Faulty'
                 : 'Mixed';

    const row = [
      csvEscape(item.type),
      csvEscape(item.brand),
      csvEscape(item.capacity || ''),
      item.healthyQty,
      item.faultyQty,
      item.totalQty,
      csvEscape(status),
      csvEscape(item.notes || ''),
      csvEscape(item.date || ''),
      csvEscape(item.createdAt ? item.createdAt.slice(0, 10) : ''),
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10);
  const link  = document.createElement('a');
  link.href     = url;
  link.download = `techie-inventory-${today}.csv`;
  link.click();

  URL.revokeObjectURL(url);
  showToast(`Exported ${filtered.length} item${filtered.length !== 1 ? 's' : ''} to CSV! 📥`, 'success');
}

function csvEscape(value) {
  const str = String(value || '');
  // Wrap in quotes if the value contains comma, newline, or double quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// =========================================
// DEVICES — CRUD
// =========================================
let deviceSearchQuery     = '';
let deviceFilterType      = '';
let deviceFilterCondition = '';

const CONDITION_META = {
  Excellent: { icon: '🟢', badge: 'badge-excellent' },
  Good:      { icon: '🔵', badge: 'badge-good' },
  Fair:      { icon: '🟡', badge: 'badge-fair' },
  Poor:      { icon: '🔴', badge: 'badge-poor' },
};

const DEVICE_TYPE_META = {
  Laptop:       { icon: '💻' },
  'Desktop PC': { icon: '🖥️' },
};

function openAddDevice() {
  editingDeviceId = null;
  resetDeviceForm();
  updateDeviceFormHeader(false);
  navigateTo('add-device');
}

function openEditDevice(id) {
  const item = devices.find(d => d.id === id);
  if (!item) return;
  editingDeviceId = id;
  populateDeviceForm(item);
  updateDeviceFormHeader(true);
  navigateTo('add-device');
}

function updateDeviceFormHeader(isEdit) {
  const title = document.getElementById('deviceFormTitle');
  const sub   = document.getElementById('deviceFormSub');
  const btn   = document.getElementById('deviceFormSubmitBtn');
  if (title) title.textContent = isEdit ? 'Edit Device' : 'Add New Device';
  if (sub)   sub.textContent   = isEdit ? 'Update device details below' : 'Fill in the details for the laptop or PC';
  if (btn)   btn.textContent   = isEdit ? '💾 Save Changes' : '✅ Add Device';
}

function populateDeviceForm(item) {
  setField('dType',        item.type);
  setField('dBrand',       item.brand);
  setField('dModel',       item.model);
  setField('dRam',         item.ram);
  setField('dCpu',         item.cpu);
  setField('dStorage',     item.storage);
  setField('dCondSound',   item.condSound);
  setField('dCondKeyboard',item.condKeyboard);
  setField('dCondScreen',  item.condScreen);
  setField('dCondCamera',  item.condCamera);
  setField('dNotes',       item.notes);
  setField('dDate',        item.date);
}

function resetDeviceForm() {
  ['dType','dBrand','dModel','dRam','dCpu','dStorage',
   'dCondSound','dCondKeyboard','dCondScreen','dCondCamera','dNotes'
  ].forEach(id => setField(id, ''));
  setField('dDate', new Date().toISOString().slice(0, 10));
}

function handleDeviceFormSubmit(e) {
  e.preventDefault();

  const type        = document.getElementById('dType').value;
  const brand       = document.getElementById('dBrand').value.trim();
  const model       = document.getElementById('dModel').value.trim();
  const ram         = document.getElementById('dRam').value;
  const cpu         = document.getElementById('dCpu').value.trim();
  const storage     = document.getElementById('dStorage').value.trim();
  const condSound   = document.getElementById('dCondSound').value;
  const condKeyboard= document.getElementById('dCondKeyboard').value;
  const condScreen  = document.getElementById('dCondScreen').value;
  const condCamera  = document.getElementById('dCondCamera').value;
  const notes       = document.getElementById('dNotes').value.trim();
  const date        = document.getElementById('dDate').value;

  if (!type || !brand || !model) {
    showToast('Please fill in Device Type, Brand, and Model.', 'error');
    return;
  }

  if (!condSound && !condKeyboard && !condScreen && !condCamera) {
    showToast('Please rate at least one condition category.', 'error');
    return;
  }

  const deviceData = { type, brand, model, ram, cpu, storage,
    condSound, condKeyboard, condScreen, condCamera, notes, date };

  if (editingDeviceId) {
    const idx = devices.findIndex(d => d.id === editingDeviceId);
    if (idx > -1) {
      devices[idx] = { ...devices[idx], ...deviceData };
      showToast('Device updated successfully! 🎉', 'success');
    }
    editingDeviceId = null;
  } else {
    devices.unshift({
      id: generateId(),
      ...deviceData,
      createdAt: new Date().toISOString(),
    });
    showToast('Device added! ✨', 'success');
    resetDeviceForm();
  }

  saveDevices();
  navigateTo('devices');
}

function confirmDeleteDevice(id) {
  deleteDeviceId = id;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.style.display = 'flex';
  // Repurpose the same modal — store which delete is pending
  document.getElementById('deleteConfirmBtn').onclick = executeDeleteDevice;
}

function executeDeleteDevice() {
  if (!deleteDeviceId) return;
  devices = devices.filter(d => d.id !== deleteDeviceId);
  saveDevices();
  deleteDeviceId = null;
  closeDeleteModal();
  showToast('Device removed.', 'info');
  renderDevicesTable();
  // Reset confirm button back to default
  document.getElementById('deleteConfirmBtn').onclick = executeDelete;
}

// =========================================
// DEVICES — TABLE RENDER
// =========================================
function renderDevicesTable() {
  const tbody    = document.getElementById('devicesTbody');
  const empty    = document.getElementById('devicesEmpty');
  const countEl  = document.getElementById('deviceResultsCount');
  if (!tbody) return;

  const filtered = devices.filter(item => {
    const q = deviceSearchQuery.toLowerCase();
    const matchQ = !q || [item.brand, item.model, item.cpu, item.ram, item.storage, item.notes]
                          .some(f => (f || '').toLowerCase().includes(q));
    const matchT = !deviceFilterType      || item.type      === deviceFilterType;
    const matchC = !deviceFilterCondition || item.condition === deviceFilterCondition;
    return matchQ && matchT && matchC;
  });

  if (countEl) countEl.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (empty) empty.style.display = 'none';

  tbody.innerHTML = filtered.map(item => {
    const typeMeta = DEVICE_TYPE_META[item.type] || { icon: '🖥️' };

    const fmtDate = item.date
      ? new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      : '—';

    function condBadge(val) {
      if (!val) return '<span class="cond-badge na">⚫ —</span>';
      const cls = val === 'Good' ? 'good' : val === 'Fair' ? 'fair' : val === 'Poor' ? 'poor' : 'na';
      const dot = val === 'Good' ? '🟢' : val === 'Fair' ? '🟡' : val === 'Poor' ? '🔴' : '⚫';
      return `<span class="cond-badge ${cls}">${dot} ${val}</span>`;
    }

    return `
      <tr data-id="${item.id}">
        <td>
          <div class="comp-cell">
            <div class="comp-icon-badge" style="background: ${item.type === 'Laptop' ? '#e3f2fd' : '#ede7f6'}">
              ${typeMeta.icon}
            </div>
            <div>
              <div class="comp-name">${escHtml(item.brand)}</div>
              <div class="comp-type">${escHtml(item.model)}</div>
            </div>
          </div>
        </td>
        <td><span class="chip">${typeMeta.icon} ${item.type}</span></td>
        <td>${escHtml(item.ram || '—')}</td>
        <td style="font-size:13px">${escHtml(item.cpu || '—')}</td>
        <td>${escHtml(item.storage || '—')}</td>
        <td>${condBadge(item.condSound)}</td>
        <td>${condBadge(item.condKeyboard)}</td>
        <td>${condBadge(item.condScreen)}</td>
        <td>${condBadge(item.condCamera)}</td>
        <td class="text-muted" style="font-size:12px">${fmtDate}</td>
        <td class="notes-cell" title="${escHtml(item.notes)}">${escHtml(item.notes || '—')}</td>
        <td>
          <div class="row-actions">
            <button class="btn-icon" title="Edit"   onclick="openEditDevice('${item.id}')">✏️</button>
            <button class="btn-icon" title="Delete" onclick="confirmDeleteDevice('${item.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// =========================================
// DEVICES — EXPORT CSV
// =========================================
function exportDevicesCSV() {
  if (devices.length === 0) {
    showToast('No device data to export!', 'error');
    return;
  }

  const filtered = devices.filter(item => {
    const q = deviceSearchQuery.toLowerCase();
    const matchQ = !q || [item.brand, item.model, item.cpu, item.ram, item.storage, item.notes]
                          .some(f => (f || '').toLowerCase().includes(q));
    const matchT = !deviceFilterType      || item.type      === deviceFilterType;
    const matchC = !deviceFilterCondition || item.condition === deviceFilterCondition;
    return matchQ && matchT && matchC;
  });

  if (filtered.length === 0) {
    showToast('No devices match the current filter.', 'error');
    return;
  }

  const headers = ['Device Type','Brand','Model','RAM','CPU','Storage',
    'Sound','Keyboard','Screen','Camera','Notes','Date Checked','Date Added'];
  const csvRows = [headers.join(',')];

  filtered.forEach(item => {
    csvRows.push([
      csvEscape(item.type),
      csvEscape(item.brand),
      csvEscape(item.model),
      csvEscape(item.ram || ''),
      csvEscape(item.cpu || ''),
      csvEscape(item.storage || ''),
      csvEscape(item.condSound    || ''),
      csvEscape(item.condKeyboard || ''),
      csvEscape(item.condScreen   || ''),
      csvEscape(item.condCamera   || ''),
      csvEscape(item.notes || ''),
      csvEscape(item.date || ''),
      csvEscape(item.createdAt ? item.createdAt.slice(0,10) : ''),
    ].join(','));
  });

  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10);
  const link  = document.createElement('a');
  link.href = url;
  link.download = `techie-devices-${today}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${filtered.length} device${filtered.length !== 1 ? 's' : ''} to CSV! 📥`, 'success');
}

// =========================================
// EXPORT TO JSON
// =========================================
function exportToJSON() {
  if (inventory.length === 0) {
    showToast('No inventory data to export!', 'error');
    return;
  }

  // Apply current filters so what you see is what you export
  const filtered = inventory.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || [item.brand, item.type, item.capacity, item.notes]
                          .some(f => (f || '').toLowerCase().includes(q));
    const matchT = !filterType  || item.type  === filterType;
    const matchB = !filterBrand || item.brand === filterBrand;
    return matchQ && matchT && matchB;
  });

  if (filtered.length === 0) {
    showToast('No items match the current filter to export.', 'error');
    return;
  }

  const exportData = filtered.map(item => ({
    id:           item.id,
    type:         item.type,
    brand:        item.brand,
    capacity:     item.capacity     || '',
    healthyQty:   item.healthyQty,
    faultyQty:    item.faultyQty,
    totalQty:     item.totalQty,
    status:       item.faultyQty === 0 ? 'Healthy' : item.healthyQty === 0 ? 'Faulty' : 'Mixed',
    notes:        item.notes         || '',
    dateChecked:  item.date          || '',
    dateAdded:    item.createdAt     || '',
  }));

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10);
  const link  = document.createElement('a');
  link.href     = url;
  link.download = `techie-inventory-${today}.json`;
  link.click();

  URL.revokeObjectURL(url);
  showToast(`Exported ${filtered.length} item${filtered.length !== 1 ? 's' : ''} to JSON! 📄`, 'success');
}

function exportDevicesJSON() {
  if (devices.length === 0) {
    showToast('No device data to export!', 'error');
    return;
  }

  const filtered = devices.filter(item => {
    const q = deviceSearchQuery.toLowerCase();
    const matchQ = !q || [item.brand, item.model, item.cpu, item.ram, item.storage, item.notes]
                          .some(f => (f || '').toLowerCase().includes(q));
    const matchT = !deviceFilterType      || item.type      === deviceFilterType;
    const matchC = !deviceFilterCondition || item.condition === deviceFilterCondition;
    return matchQ && matchT && matchC;
  });

  if (filtered.length === 0) {
    showToast('No devices match the current filter.', 'error');
    return;
  }

  const exportData = filtered.map(item => ({
    id:           item.id,
    type:         item.type,
    brand:        item.brand,
    model:        item.model,
    ram:          item.ram          || '',
    cpu:          item.cpu          || '',
    storage:      item.storage      || '',
    condSound:    item.condSound    || '',
    condKeyboard: item.condKeyboard || '',
    condScreen:   item.condScreen   || '',
    condCamera:   item.condCamera   || '',
    notes:        item.notes        || '',
    dateChecked:  item.date         || '',
    dateAdded:    item.createdAt    || '',
  }));

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10);
  const link  = document.createElement('a');
  link.href     = url;
  link.download = `techie-devices-${today}.json`;
  link.click();

  URL.revokeObjectURL(url);
  showToast(`Exported ${filtered.length} device${filtered.length !== 1 ? 's' : ''} to JSON! 📄`, 'success');
}

// =========================================
// DEMO DATA (first launch)
// =========================================
function seedDemoData() {
  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0,10);

  const samples = [
    { type:'RAM',      brand:'Kingston', capacity:'8GB DDR4',  healthyQty:12, faultyQty:1, notes:'Checked July batch' },
    { type:'RAM',      brand:'Corsair',  capacity:'16GB DDR5', healthyQty:6,  faultyQty:0, notes:'' },
    { type:'HDD',      brand:'Seagate',  capacity:'1TB',       healthyQty:8,  faultyQty:2, notes:'2 units clicking sound' },
    { type:'HDD',      brand:'WD',       capacity:'2TB',       healthyQty:5,  faultyQty:0, notes:'' },
    { type:'SSD SATA', brand:'Samsung',  capacity:'500GB',     healthyQty:10, faultyQty:0, notes:'' },
    { type:'SSD NVMe', brand:'Samsung',  capacity:'1TB M.2',   healthyQty:4,  faultyQty:1, notes:'1 not detected on slot A' },
    { type:'CPU',      brand:'Intel',    capacity:'Core i7-12700', healthyQty:3, faultyQty:0, notes:'' },
    { type:'GPU',      brand:'NVIDIA',   capacity:'RTX 3060',  healthyQty:2,  faultyQty:1, notes:'Fan bearing issue' },
  ];

  const dates = [0,0,1,1,2,2,3,3].map(d => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - d);
    return fmt(dt);
  });

  inventory = samples.map((s, i) => ({
    id: generateId(),
    ...s,
    totalQty: s.healthyQty + s.faultyQty,
    date: dates[i],
    createdAt: new Date(now.getTime() - (i * 3600000)).toISOString(),
  }));

  saveInventory();
}
