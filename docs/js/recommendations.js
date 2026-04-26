import { initTheme, toggleTheme, showToast, getRecommendations, getMe, logout } from './api.js';

initTheme();

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

  document.getElementById('generate-btn')?.addEventListener('click', generateRecommendations);
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

async function generateRecommendations() {
  const btn = document.getElementById('generate-btn');
  const output = document.getElementById('rec-output');
  btn.disabled = true;

  output.innerHTML = `<div style="text-align:center;padding:48px 20px">
    <div class="spinner" style="margin:0 auto 16px"></div>
    <p style="color:var(--text-secondary)">Analyzing your inventory…</p>
  </div>`;

  try {
    const data = await getRecommendations();

    if (!data.recommendations || data.recommendations.length === 0) {
      output.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <h3>All looks good!</h3>
        <p>No recommendations right now. Your inventory is in great shape.</p>
      </div>`;
      return;
    }

    if (data.item_count === 0) {
      output.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <h3>No items in inventory</h3>
        <p><a href="add-item.html">Add some items</a> to get recommendations.</p>
      </div>`;
      return;
    }

    const groups = { high: [], medium: [], low: [] };
    data.recommendations.forEach(r => {
      const p = r.priority?.toLowerCase();
      if (groups[p]) groups[p].push(r);
      else groups.low.push(r);
    });

    const priorityLabels = { high: '🔴 High Priority', medium: '🟡 Medium Priority', low: '🟢 Low Priority' };
    const priorityColors = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };

    let html = '';
    ['high', 'medium', 'low'].forEach(priority => {
      if (!groups[priority].length) return;
      html += `<div class="rec-group">
        <h3 style="color:${priorityColors[priority]};margin-bottom:16px">${priorityLabels[priority]}</h3>
        <div class="recommendations-grid">
          ${groups[priority].map(rec => `
            <div class="card rec-card">
              <div class="rec-card-top">
                <span class="badge" style="background:${priorityColors[priority]}20;color:${priorityColors[priority]}">${rec.priority?.toUpperCase()}</span>
                <span class="cat-badge">${escHtml(rec.category || '')}</span>
              </div>
              <div class="rec-item-name">${escHtml(rec.item_name)}</div>
              <div class="rec-action">${escHtml(rec.action)}</div>
              <div class="rec-reason">${escHtml(rec.reason)}</div>
            </div>
          `).join('')}
        </div>
      </div>`;
    });

    const ts = new Date(data.generated_at).toLocaleString();
    html += `<div class="rec-meta">
      ${data.recommendations.length} recommendation${data.recommendations.length !== 1 ? 's' : ''} generated from ${data.item_count} item${data.item_count !== 1 ? 's' : ''} · ${ts}
    </div>`;

    output.innerHTML = html;
  } catch (err) {
    if (err.status === 503) {
      output.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">🔑</div>
        <h3>API Key Not Configured</h3>
        <p>The <code>ANTHROPIC_API_KEY</code> environment variable is not set. See <strong>Guide 1</strong> in the setup documentation.</p>
      </div>`;
    } else {
      output.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p>${escHtml(err.message || 'Failed to generate recommendations')}</p>
      </div>`;
    }
  } finally {
    btn.disabled = false;
  }
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
