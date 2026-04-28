import { initTheme, toggleTheme, showToast, getItemsSummary, getItems, updateItem, getMe, logout } from './api.js';

initTheme();

document.addEventListener('DOMContentLoaded', async () => {
  // Auth check
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
  loadDashboard();
});

function setupNav() {
  document.querySelectorAll('.hamburger').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
    });
  });

  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => document.querySelector('.sidebar').classList.remove('open'));
  }

  document.querySelector('.sidebar-close')?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('open');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelector('.sidebar')?.classList.remove('open');
  });

  const topbarUserBtn = document.getElementById('topbar-user-btn');
  const topbarDropdown = document.getElementById('topbar-user-dropdown');
  if (topbarUserBtn && topbarDropdown) {
    topbarUserBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      topbarDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => topbarDropdown.classList.remove('open'));
  }
}

function setupTheme() {
  document.querySelectorAll('#theme-toggle, #topbar-theme-toggle').forEach(btn => {
    btn?.addEventListener('click', toggleTheme);
  });
}

function setupLogout() {
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await logout().catch(() => {});
      window.location.href = 'login.html';
    });
  });
}

async function loadDashboard() {
  try {
    const [summary, recentData, lowData, outData] = await Promise.all([
      getItemsSummary(),
      getItems({ sort: 'updated_at', order: 'desc', limit: 8 }),
      getItems({ status: 'low', limit: 5 }),
      getItems({ status: 'out', limit: 5 }),
    ]);

    // Stat cards
    document.getElementById('stat-total').textContent = summary.total || 0;
    document.getElementById('stat-low').textContent = summary.low_stock || 0;
    document.getElementById('stat-out').textContent = summary.out_of_stock || 0;
    document.getElementById('stat-expired').textContent = summary.expired || 0;

    const attentionItems = [...(outData.items || []), ...(lowData.items || [])];
    renderRecentTable(recentData.items || []);
    renderAttentionItems(attentionItems);

  } catch (err) {
    showToast(err.message || 'Failed to load dashboard', 'error');
  }
}

function renderRecentTable(items) {
  const tbody = document.getElementById('recent-tbody');
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:24px">No items yet. <a href="add-item.html">Add your first item →</a></td></tr>';
    return;
  }
  tbody.innerHTML = items.map(item => `
    <tr>
      <td class="item-name-cell">${escHtml(item.name)}</td>
      <td>${item.category_icon || '📦'} ${escHtml(item.category_name || 'Uncategorized')}</td>
      <td>${item.quantity} ${escHtml(item.unit || '')}</td>
      <td><span class="badge badge-${item.status}">${item.status}</span></td>
    </tr>
  `).join('');
}

function renderAttentionItems(items) {
  const list = document.getElementById('attention-list');
  if (!items.length) {
    list.innerHTML = '<p style="color:var(--text-secondary);font-size:0.875rem">All items are well stocked! 🎉</p>';
    return;
  }
  list.innerHTML = items.map(item => `
    <div class="attention-item">
      <div class="attention-item-info">
        <div class="attention-item-name">${escHtml(item.name)}</div>
        <div class="attention-item-meta">${item.quantity} ${item.unit} · Min: ${item.min_quantity}</div>
      </div>
      <div class="attention-item-actions">
        <span class="badge badge-${item.status}">${item.status}</span>
        <button class="btn btn-ghost btn-sm restock-btn" data-id="${item.id}" data-name="${escHtml(item.name)}" data-unit="${escHtml(item.unit || '')}" data-qty="${item.quantity}">Restock</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.restock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const unit = btn.dataset.unit;
      const currentQty = parseInt(btn.dataset.qty, 10);
      showRestockModal({ id, name, unit, currentQty });
    });
  });
}


function showRestockModal({ id, name, unit, currentQty }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Restock "${name}"</h3>
      <p>Current quantity: <strong>${currentQty} ${unit}</strong>. How many did you buy?</p>
      <div class="form-group" style="margin-bottom:20px">
        <label class="form-label" for="restock-qty">Quantity purchased${unit ? ` (${unit})` : ''}</label>
        <input class="form-input" type="number" id="restock-qty" min="1" value="1" style="max-width:140px">
      </div>
      <p class="restock-error" id="restock-error" style="color:var(--danger);font-size:0.85rem;margin:0 0 12px;display:none"></p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="restock-cancel">Cancel</button>
        <button class="btn btn-primary" id="restock-confirm">Add to stock</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#restock-qty');
  input.focus();
  input.select();

  overlay.querySelector('#restock-cancel').addEventListener('click', () => overlay.remove());

  overlay.querySelector('#restock-confirm').addEventListener('click', async () => {
    const added = parseInt(input.value, 10);
    const errEl = overlay.querySelector('#restock-error');
    if (!added || added < 1) {
      errEl.textContent = 'Please enter a quantity of at least 1.';
      errEl.style.display = 'block';
      input.focus();
      return;
    }
    errEl.style.display = 'none';
    try {
      const { getItem } = await import('./api.js');
      const item = await getItem(id);
      await updateItem(id, { ...item, quantity: item.quantity + added });
      overlay.remove();
      showToast(`Added ${added} ${unit} to ${name}`, 'success');
      loadDashboard();
    } catch (err) {
      showToast(err.message || 'Failed to restock', 'error');
    }
  });

  overlay.addEventListener('keydown', e => {
    if (e.key === 'Enter') overlay.querySelector('#restock-confirm').click();
    if (e.key === 'Escape') overlay.remove();
  });
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
