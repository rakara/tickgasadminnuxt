/**
 * TickGas Admin App — auth helpers
 * All pages in this app are admin-authenticated.
 */

// ── PWA: register service worker ────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('[SW] Registration failed:', err);
    });
  });
}
function authFetch(url, options = {}) {
    const token = localStorage.getItem('adminToken');
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(url, { ...options, headers });
}

function requireAuth() {
    if (!localStorage.getItem('adminToken')) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

function logout() {
    // Destroy every key we own — belt-and-braces clear in case future
    // keys are added without updating this list.
    localStorage.removeItem('admin');
    localStorage.removeItem('adminToken');

    // Wipe everything else that may have been set by any page
    try {
        localStorage.clear();
        sessionStorage.clear();
    } catch (e) {
        // Private-mode browsers may throw — ignore, we already removed the key items
    }

    // Replace so the back button can't return to an authenticated page
    window.location.replace('/index.html');
}
