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
    const [summary, recentData, attentionData] = await Promise.all([
      getItemsSummary(),
      getItems({ sort: 'updated_at', order: 'desc', limit: 8 }),
      getItems({ status: 'low', limit: 5 }),
    ]);

    // Stat cards
    document.getElementById('stat-total').textContent = summary.total || 0;
    document.getElementById('stat-low').textContent = summary.low_stock || 0;
    document.getElementById('stat-out').textContent = summary.out_of_stock || 0;
    document.getElementById('stat-expired').textContent = summary.expired || 0;

    renderRecentTable(recentData.items || []);
    renderAttentionItems(attentionData.items || []);

    // Shopping list = low + out
    const outData = await getItems({ status: 'out', limit: 50 });
    const shoppingItems = [...(attentionData.items || []), ...(outData.items || [])];
    renderShoppingList(shoppingItems);
  } catch (err) {
    showToast(err.message || 'Failed to load dashboard', 'error');
  }
}

function renderRecentTable(items) {
  const tbody = document.getElementById('recent-tbody');
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px">No items yet. <a href="add-item.html">Add your first item →</a></td></tr>';
    return;
  }
  tbody.innerHTML = items.map(item => `
    <tr>
      <td class="item-name-cell">${escHtml(item.name)}</td>
      <td>${item.category_icon || '📦'} ${escHtml(item.category_name || 'Uncategorized')}</td>
      <td>${item.quantity} ${escHtml(item.unit || '')}</td>
      <td><span class="badge badge-${item.status}">${item.status}</span></td>
      <td><a href="edit-item.html?id=${item.id}" class="btn btn-ghost btn-sm">Edit</a></td>
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
        <button class="btn btn-ghost btn-sm restock-btn" data-id="${item.id}" data-min="${item.min_quantity}">Restock</button>
        <a href="edit-item.html?id=${item.id}" class="btn btn-ghost btn-sm">Edit</a>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.restock-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const min = parseInt(btn.dataset.min, 10);
      try {
        const item = await import('./api.js').then(m => m.getItem(id));
        await updateItem(id, { ...item, quantity: min + 5 });
        showToast('Item restocked!', 'success');
        loadDashboard();
      } catch (err) {
        showToast(err.message || 'Failed to restock', 'error');
      }
    });
  });
}

function renderShoppingList(items) {
  const list = document.getElementById('shopping-list');
  if (!items.length) {
    list.innerHTML = '<p style="color:var(--text-secondary);font-size:0.875rem">Nothing to restock — you\'re all set! ✅</p>';
    return;
  }
  const unique = [...new Map(items.map(i => [i.id, i])).values()];
  list.innerHTML = unique.map(item => `
    <div class="shopping-item">
      <input type="checkbox" id="shop-${item.id}">
      <label for="shop-${item.id}" class="shopping-item-name" style="font-weight:normal;margin:0;color:var(--text-primary)">${escHtml(item.name)}</label>
      <span class="badge badge-${item.status}">${item.status}</span>
    </div>
  `).join('');
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
