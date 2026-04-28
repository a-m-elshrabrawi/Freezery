import { initTheme, toggleTheme, showToast, getItem, updateItem, deleteItem, getCategories, getMe, logout } from './api.js';

initTheme();

let itemId = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user } = await getMe();
    document.querySelectorAll('.username-display').forEach(el => el.textContent = user.username);
    document.querySelectorAll('.user-avatar').forEach(el => el.textContent = user.username[0].toUpperCase());
  } catch {
    window.location.href = 'login.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  itemId = params.get('id');
  if (!itemId) { window.location.href = 'inventory.html'; return; }

  setupNav();
  setupTheme();
  setupLogout();
  await loadCategories();
  await loadItem();
  setupForm();
  setupDelete();
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
    const select = document.getElementById('category_id');
    if (select) {
      select.innerHTML = '<option value="">Select category…</option>' +
        (data.categories || []).map(c => `<option value="${c.id}">${c.icon} ${escHtml(c.name)}</option>`).join('');
    }
  } catch {}
}

async function loadItem() {
  try {
    const item = await getItem(itemId);
    fillForm(item);
  } catch {
    showToast('Item not found', 'error');
    setTimeout(() => { window.location.href = 'inventory.html'; }, 1500);
  }
}

function fillForm(item) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('name', item.name);
  set('category_id', item.category_id);
  set('quantity', item.quantity);
  set('unit', item.unit);
  set('min_quantity', item.min_quantity);
  set('location', item.location);
  set('purchase_date', item.purchase_date ? item.purchase_date.split('T')[0] : '');
  set('expiry_date', item.expiry_date ? item.expiry_date.split('T')[0] : '');
  set('purchase_price', item.purchase_price);
  set('description', item.description);
  set('notes', item.notes);
}

function setupForm() {
  const form = document.getElementById('edit-item-form');
  if (!form) return;

  const expiryInput = document.getElementById('expiry_date');
  if (expiryInput) {
    expiryInput.addEventListener('change', () => {
      const warn = document.getElementById('expiry-warning');
      warn.textContent = expiryInput.value && new Date(expiryInput.value) < new Date()
        ? '⚠️ This date is in the past' : '';
    });
  }

  const purchaseInput = document.getElementById('purchase_date');
  if (purchaseInput) {
    purchaseInput.addEventListener('change', () => {
      const warn = document.getElementById('purchase-warning');
      warn.textContent = purchaseInput.value && new Date(purchaseInput.value) > new Date()
        ? '⚠️ This date is in the future' : '';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const data = getFormData(form);
    const errors = validateItem(data);
    if (errors.length) {
      errors.forEach(({ field, message }) => showFieldError(field, message));
      return;
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      await updateItem(itemId, data);
      showToast('Item updated!', 'success');
      setTimeout(() => { window.location.href = 'inventory.html'; }, 1500);
    } catch (err) {
      if (err.field) showFieldError(err.field, err.message);
      else showToast(err.message || 'Failed to update item', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  });
}

function setupDelete() {
  const deleteBtn = document.getElementById('delete-item-btn');
  if (!deleteBtn) return;
  deleteBtn.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal">
      <h3>Delete Item</h3>
      <p>Are you sure you want to delete this item? This cannot be undone.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cancel-del">Cancel</button>
        <button class="btn btn-danger" id="confirm-del">Delete</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cancel-del').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#confirm-del').addEventListener('click', async () => {
      try {
        await deleteItem(itemId);
        overlay.remove();
        showToast('Item deleted', 'success');
        setTimeout(() => { window.location.href = 'inventory.html'; }, 1200);
      } catch (err) {
        overlay.remove();
        showToast(err.message || 'Delete failed', 'error');
      }
    });
  });
}

function getFormData(form) {
  const fd = new FormData(form);
  return {
    name: fd.get('name'),
    category_id: fd.get('category_id') || null,
    quantity: fd.get('quantity'),
    unit: fd.get('unit') || 'units',
    min_quantity: fd.get('min_quantity') || 1,
    location: fd.get('location') || null,
    purchase_date: fd.get('purchase_date') || null,
    expiry_date: fd.get('expiry_date') || null,
    purchase_price: fd.get('purchase_price') || null,
    description: fd.get('description') || null,
    notes: fd.get('notes') || null,
  };
}

function validateItem(data) {
  const errors = [];
  if (!data.name || data.name.trim().length === 0) errors.push({ field: 'name', message: 'Name is required' });
  if (data.name && data.name.length > 200) errors.push({ field: 'name', message: 'Max 200 characters' });
  if (data.quantity === '' || data.quantity === null) errors.push({ field: 'quantity', message: 'Quantity is required' });
  else if (isNaN(parseInt(data.quantity, 10)) || parseInt(data.quantity, 10) < 0) errors.push({ field: 'quantity', message: 'Must be a non-negative integer' });
  if (data.min_quantity !== '' && data.min_quantity !== null && (isNaN(parseInt(data.min_quantity, 10)) || parseInt(data.min_quantity, 10) < 0)) {
    errors.push({ field: 'min_quantity', message: 'Must be a non-negative integer' });
  }
  if (data.purchase_price && (isNaN(parseFloat(data.purchase_price)) || parseFloat(data.purchase_price) < 0)) {
    errors.push({ field: 'purchase_price', message: 'Must be a positive number' });
  }
  return errors;
}

function showFieldError(field, message) {
  const el = document.getElementById(`error-${field}`);
  if (el) el.textContent = message;
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
