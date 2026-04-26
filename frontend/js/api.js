import config from './config.js';

// ── Theme ──────────────────────────────────────────────────────────────────

export function initTheme() {
  const saved = localStorage.getItem('freezery-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
  updateToggleIcon();
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let next;
  if (current === 'dark') next = 'light';
  else if (current === 'light') next = 'dark';
  else next = systemDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('freezery-theme', next);
  updateToggleIcon();
}

function updateToggleIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    || (!document.documentElement.getAttribute('data-theme')
        && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('#theme-toggle, #topbar-theme-toggle').forEach(btn => {
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  });
}

// ── Toast ──────────────────────────────────────────────────────────────────

export function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Fetch helper ───────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = config.API_BASE + path;
  let res;
  try {
    res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error('Connection failed. Check your network.');
  }

  if (res.status === 401) {
    if (!window.location.pathname.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Unauthorized');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.field = data.field;
    err.status = res.status;
    throw err;
  }

  return res.json();
}

// ── Items ──────────────────────────────────────────────────────────────────

export async function getItems(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/items${qs ? '?' + qs : ''}`);
}

export async function getItem(id) {
  return apiFetch(`/api/items/${id}`);
}

export async function createItem(data) {
  return apiFetch('/api/items', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateItem(id, data) {
  return apiFetch(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteItem(id) {
  return apiFetch(`/api/items/${id}`, { method: 'DELETE' });
}

export async function getItemsSummary() {
  return apiFetch('/api/items/summary');
}

// ── Categories ─────────────────────────────────────────────────────────────

export async function getCategories() {
  return apiFetch('/api/categories');
}

export async function createCategory(data) {
  return apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCategory(id, data) {
  return apiFetch(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteCategory(id) {
  return apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function login(username, password) {
  return apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export async function register(username, password) {
  return apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export async function logout() {
  return apiFetch('/api/auth/logout', { method: 'POST' });
}

export async function getMe() {
  return apiFetch('/api/auth/me');
}

// ── Recommendations ────────────────────────────────────────────────────────

export async function getRecommendations() {
  return apiFetch('/api/recommendations', { method: 'POST' });
}
