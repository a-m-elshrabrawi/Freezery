import { initTheme, toggleTheme, showToast, getItems, updateItem, deleteItem, getCategories, getMe, logout } from './api.js';

initTheme();

let allItems = [];
let currentPage = 1;
const PAGE_SIZE = 15;
let sortField = 'updated_at';
let sortOrder = 'desc';
let filters = { search: '', category: '', status: '' };
let categories = [];
let resizeTimer;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user } = await getMe();
    document.querySelectorAll('.username-display').forEach(el => el.textContent = user.username);
    document.querySelectorAll('.user-avatar').forEach(el => el.textContent = user.username[0].toUpperCase());
  } catch {
    window.location.href = 'login.html';
    return;
  }

  setupNav();
  setupTheme();
  setupLogout();
  await loadCategories();
  await loadItems();
  setupFilters();
  setupFilterToggle();
});

function setupNav() {
  document.querySelectorAll('.hamburger').forEach(btn => {
    btn.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
  });
  document.querySelector('.sidebar-overlay')?.addEventListener('click', () => document.querySelector('.sidebar').classList.remove('open'));
  document.querySelector('.sidebar-close')?.addEventListener('click', () => document.querySelector('.sidebar').classList.remove('open'));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelector('.sidebar')?.classList.remove('open');
  });
  const topbarUserBtn = document.getElementById('topbar-user-btn');
  const topbarDropdown = document.getElementById('topbar-user-dropdown');
  if (topbarUserBtn && topbarDropdown) {
    topbarUserBtn.addEventListener('click', e => { e.stopPropagation(); topbarDropdown.classList.toggle('open'); });
    document.addEventListener('click', () => topbarDropdown.classList.remove('open'));
  }
}

function setupTheme() {
  document.querySelectorAll('#theme-toggle, #topbar-theme-toggle').forEach(btn => btn?.addEventListener('click', toggleTheme));
}

function setupLogout() {
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await logout().catch(() => {});
      window.location.href = 'login.html';
    });
  });
}

async function loadCategories() {
  try {
    const data = await getCategories();
    categories = data.categories || [];
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
      catSelect.innerHTML = '<option value="">All Categories</option>' +
        categories.map(c => `<option value="${c.id}">${c.icon} ${escHtml(c.name)}</option>`).join('');
    }
  } catch {}
}

async function loadItems() {
  try {
    const params = {
      sort: sortField,
      order: sortOrder,
      ...(filters.search && { search: filters.search }),
      ...(filters.category && { category: filters.category }),
      ...(filters.status && { status: filters.status }),
    };
    const data = await getItems(params);
    allItems = data.items || [];
    currentPage = 1;
    renderItems();
  } catch (err) {
    showToast(err.message || 'Failed to load inventory', 'error');
  }
}

async function adjustQuantity(id, delta) {
  const item = allItems.find(i => i.id == id);
  if (!item) return;
  if (delta < 0 && item.quantity === 0) {
    showToast('Quantity is already at 0', 'warning');
    return;
  }
  const newQty = Math.max(0, item.quantity + delta);
  if (newQty === item.quantity) return;
  try {
    await updateItem(id, {
      name: item.name,
      category_id: item.category_id,
      quantity: newQty,
      unit: item.unit,
      min_quantity: item.min_quantity,
      location: item.location,
      purchase_date: item.purchase_date,
      expiry_date: item.expiry_date,
      purchase_price: item.purchase_price,
      description: item.description,
      notes: item.notes,
    });
    await loadItems();
  } catch (err) {
    showToast(err.message || 'Failed to update quantity', 'error');
  }
}

function renderItems() {
  const container = document.getElementById('inventory-container');
  if (!allItems.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><h3>No items found</h3><p>Try adjusting your filters or <a href="add-item.html">add a new item</a>.</p></div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = allItems.slice(start, start + PAGE_SIZE);
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    renderCards(pageItems, container);
  } else {
    renderTable(pageItems, container);
  }

  renderPagination();
}

function renderTable(items, container) {
  const isTablet = window.innerWidth < 1024;
  container.innerHTML = `
    <div class="inventory-table-wrap">
      <table class="inventory-table">
        <thead>
          <tr>
            <th><button class="sort-btn" data-field="name">Name ${sortField==='name'?(sortOrder==='asc'?'↑':'↓'):''}</button></th>
            <th><button class="sort-btn" data-field="category">Category ${sortField==='category'?(sortOrder==='asc'?'↑':'↓'):''}</button></th>
            <th><button class="sort-btn" data-field="quantity">Qty ${sortField==='quantity'?(sortOrder==='asc'?'↑':'↓'):''}</button></th>
            <th>Status</th>
            <th><button class="sort-btn" data-field="location">Location ${sortField==='location'?(sortOrder==='asc'?'↑':'↓'):''}</button></th>
            ${!isTablet ? '<th class="col-purchase-date"><button class="sort-btn" data-field="updated_at">Updated '+(sortField==='updated_at'?(sortOrder==='asc'?'↑':'↓'):'')+' </button></th>' : ''}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td class="item-name-cell">
                ${escHtml(item.name)}
                ${item.expiry_date ? `<div class="item-meta">Exp: ${formatDate(item.expiry_date)}</div>` : ''}
              </td>
              <td><span class="cat-badge">${item.category_icon || '📦'} ${escHtml(item.category_name || 'Uncategorized')}</span></td>
              <td>
                <div class="qty-control">
                  <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
                  <span>${item.quantity} <span style="color:var(--text-secondary);font-size:0.8em">${escHtml(item.unit || '')}</span></span>
                  <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
                </div>
                <div class="item-meta">Min: ${item.min_quantity}</div>
              </td>
              <td><span class="badge badge-${item.status}">${item.status}</span></td>
              <td>${escHtml(item.location || '—')}</td>
              ${!isTablet ? `<td class="col-purchase-date" style="color:var(--text-secondary);font-size:0.8rem">${formatDate(item.updated_at)}</td>` : ''}
              <td>
                <div class="table-actions">
                  <a href="edit-item.html?id=${item.id}" class="btn btn-ghost btn-sm">Edit</a>
                  <button class="btn btn-danger btn-sm delete-btn" data-id="${item.id}" data-name="${escHtml(item.name)}">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;

  container.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      if (sortField === field) sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      else { sortField = field; sortOrder = 'asc'; }
      loadItems();
    });
  });

  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => adjustQuantity(btn.dataset.id, parseInt(btn.dataset.delta)));
  });

  bindDeleteButtons(container);
}

function renderCards(items, container) {
  container.innerHTML = `<div class="inventory-cards">
    ${items.map(item => `
      <div class="inventory-card" data-id="${item.id}">
        <div class="inventory-card-top">
          <div class="inventory-card-badges">
            <span class="badge badge-${item.status}">${item.status}</span>
            <span class="cat-badge">${item.category_icon || '📦'} ${escHtml(item.category_name || 'Uncategorized')}</span>
          </div>
        </div>
        <div class="inventory-card-name-row">
          <div class="inventory-card-name">${escHtml(item.name)}</div>
          <div class="inventory-card-qty-inline">
            <div class="qty-control">
              <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
              <span>${item.quantity} ${escHtml(item.unit || '')}</span>
              <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
            </div>
            <span class="item-meta" style="text-align:right">Min: ${item.min_quantity}</span>
          </div>
        </div>
        <div class="inventory-card-meta">
          ${item.location ? `📍 ${escHtml(item.location)}` : ''}
          ${item.expiry_date ? ` · Expires ${formatDate(item.expiry_date)}` : ''}
        </div>
        <div class="inventory-card-actions">
          <a href="edit-item.html?id=${item.id}" class="btn btn-ghost btn-sm">Edit</a>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${item.id}" data-name="${escHtml(item.name)}">Delete</button>
        </div>
      </div>
    `).join('')}
  </div>`;

  bindDeleteButtons(container);
  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => adjustQuantity(btn.dataset.id, parseInt(btn.dataset.delta)));
  });
}

function bindDeleteButtons(container) {
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(btn.dataset.id, btn.dataset.name));
  });
}

function confirmDelete(id, name) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Delete Item</h3>
      <p>Are you sure you want to delete <strong>${escHtml(name)}</strong>? This cannot be undone.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cancel-delete">Cancel</button>
        <button class="btn btn-danger" id="confirm-delete">Delete</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#cancel-delete').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#confirm-delete').addEventListener('click', async () => {
    try {
      await deleteItem(id);
      overlay.remove();
      showToast('Item deleted', 'success');
      loadItems();
    } catch (err) {
      overlay.remove();
      showToast(err.message || 'Delete failed', 'error');
    }
  });
}


function renderPagination() {
  const total = allItems.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pag = document.getElementById('pagination');
  if (totalPages <= 1) { pag.innerHTML = ''; return; }

  const isMobile = window.innerWidth < 600;
  if (isMobile) {
    pag.innerHTML = `<div class="pagination-simple">
      <button class="btn btn-ghost" ${currentPage === 1 ? 'disabled' : ''} id="pag-prev">← Prev</button>
      <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
      <button class="btn btn-ghost" ${currentPage === totalPages ? 'disabled' : ''} id="pag-next">Next →</button>
    </div>`;
    pag.querySelector('#pag-prev')?.addEventListener('click', () => { currentPage--; renderItems(); });
    pag.querySelector('#pag-next')?.addEventListener('click', () => { currentPage++; renderItems(); });
  } else {
    const pages = getPaginationRange(currentPage, totalPages);
    pag.innerHTML = `<div class="pagination">${pages.map(p =>
      p === '…' ? `<span style="padding:0 4px;color:var(--text-secondary)">…</span>` :
      `<button class="${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`
    ).join('')}</div>`;
    pag.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => { currentPage = parseInt(btn.dataset.page); renderItems(); });
    });
  }
}

function getPaginationRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
  return [1, '…', current-1, current, current+1, '…', total];
}

function setupFilters() {
  let searchTimer;
  const searchInput = document.getElementById('filter-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        filters.search = searchInput.value;
        loadItems();
      }, 300);
    });
  }

  ['filter-category', 'filter-status'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', e => {
      if (id === 'filter-category') filters.category = e.target.value;
      if (id === 'filter-status') filters.status = e.target.value;
      loadItems();
    });
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderItems, 200);
  });
}

function setupFilterToggle() {
  const toggleBtn = document.getElementById('filter-toggle-btn');
  const filterPanel = document.getElementById('filter-panel');
  if (toggleBtn && filterPanel) {
    toggleBtn.addEventListener('click', () => {
      filterPanel.classList.toggle('open');
      toggleBtn.textContent = filterPanel.classList.contains('open') ? 'Filters ▲' : 'Filters ▾';
    });
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
