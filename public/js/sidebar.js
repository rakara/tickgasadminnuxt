/**
 * TickGas Admin - sidebar.js
 *
 * Single source of truth for the sidebar. Every page includes this file
 * and calls renderSidebar(activeKey) once the DOM is ready.
 *
 * Usage:
 *   <script src="/js/sidebar.js"></script>
 *   <script>renderSidebar('dashboard');</script>
 */

const NAV_ITEMS = [
  { key: 'dashboard',  label: '📊 Dashboard',  href: 'dashboard.html'  },
  { key: 'suppliers',  label: '👥 Suppliers',   href: 'suppliers.html'  },
  { key: 'agents',     label: '🧑 Agents',      href: 'agents.html'     },
  { key: 'orders',     label: '📦 Orders',      href: 'orders.html'     },
  { key: 'payments',   label: '💰 Payments',    href: 'payments.html'   },
  { key: 'analytics',  label: '📈 Analytics',   href: 'analytics.html'  },
  { key: 'locations',  label: '📍 Locations',   href: 'locations.html'  },
];

// ── PWA install prompt ────────────────────────────────────────────────────────
// Captured here so it is available on every authenticated page that loads sidebar.js.
let _sidebarInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _sidebarInstallPrompt = e;
  // Show install button if the sidebar has already been rendered
  const btn = document.getElementById('sidebarInstallBtn');
  if (btn) btn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
  _sidebarInstallPrompt = null;
  const btn = document.getElementById('sidebarInstallBtn');
  if (btn) btn.style.display = 'none';
});

function sidebarInstallApp() {
  if (!_sidebarInstallPrompt) return;
  _sidebarInstallPrompt.prompt();
  _sidebarInstallPrompt.userChoice.then(({ outcome }) => {
    if (outcome === 'accepted') {
      _sidebarInstallPrompt = null;
      const btn = document.getElementById('sidebarInstallBtn');
      if (btn) btn.style.display = 'none';
    }
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderSidebar(activeKey) {
  const admin  = JSON.parse(localStorage.getItem('admin') || '{}');
  const email  = admin.email || '';
  const handle = email.includes('@') ? email.split('@')[0] : (email || 'Admin');

  const navHTML = NAV_ITEMS.map(item => {
    const isActive = item.key === activeKey;
    const cls      = 'nav-item' + (isActive ? ' active' : '');
    const handler  = isActive ? '' : `onclick="location.href='${item.href}'"`;
    return `<div class="${cls}" ${handler}>${item.label}</div>`;
  }).join('\n      ');

  const html = `
    <!-- Mobile backdrop -->
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>

    <!-- Hamburger (mobile only) -->
    <button class="hamburger-btn" id="hamburgerBtn" onclick="openSidebar()" aria-label="Open navigation">
      <span></span><span></span><span></span>
    </button>

    <div class="sidebar" id="adminSidebar">
      <!-- Close button (mobile only) -->
      <button class="sidebar-close-btn" onclick="closeSidebar()" aria-label="Close navigation">✕</button>

      <div class="logo">TickGas Admin</div>

      <!-- Profile card -->
      <div class="sidebar-profile" onclick="location.href='profile.html'" title="View profile">
        <div class="sidebar-avatar">${handle.charAt(0).toUpperCase()}</div>
        <div class="sidebar-profile-info">
          <div class="sidebar-profile-name">${_esc(handle)}</div>
          <div class="sidebar-profile-role">Administrator</div>
        </div>
        <div class="sidebar-profile-chevron">›</div>
      </div>

      <div class="sidebar-divider"></div>

      <!-- Navigation links -->
      ${navHTML}

      <!-- PWA install button — pushed to bottom, only visible when installable -->
      <div style="flex:1;"></div>
      <div class="sidebar-divider"></div>
      <button id="sidebarInstallBtn"
              onclick="sidebarInstallApp()"
              class="sidebar-install-btn">
        ⬇ Install App
      </button>
    </div>`;

  const container = document.querySelector('.container');
  if (!container) { console.error('[sidebar] .container not found'); return; }

  // Clean up any previously injected sidebar elements
  ['adminSidebar', 'sidebarOverlay', 'hamburgerBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  container.insertAdjacentHTML('afterbegin', html);

  // If the install prompt was already captured before this render, show the button
  if (_sidebarInstallPrompt) {
    const btn = document.getElementById('sidebarInstallBtn');
    if (btn) btn.style.display = 'flex';
  }
}

// ── Mobile open/close ─────────────────────────────────────────────────────────
function openSidebar() {
  document.getElementById('adminSidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
  document.getElementById('hamburgerBtn').classList.add('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('adminSidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
  document.getElementById('hamburgerBtn').classList.remove('hidden');
  document.body.style.overflow = '';
}

// ── XSS guard ─────────────────────────────────────────────────────────────────
function _esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
