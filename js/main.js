/* Fărcașa EYV – theme, lang, UI (auth is in db.js) */
(function () {
  const THEME_KEY = 'farcasa_theme_v2';
  const LANG_KEY = 'farcasa_lang';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll('[data-theme-btn]').forEach((btn) => {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Light mode' : 'Dark mode';
    });
  }
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  document.querySelectorAll('[data-theme-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = (localStorage.getItem(THEME_KEY) || 'light') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  });

  function applyLang(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang-ro').forEach((el) => el.classList.toggle('hidden', lang !== 'ro'));
    document.querySelectorAll('.lang-en').forEach((el) => el.classList.toggle('hidden', lang !== 'en'));
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      btn.textContent = lang === 'ro' ? 'EN' : 'RO';
    });
    localStorage.setItem(LANG_KEY, lang);
  }
  applyLang(localStorage.getItem(LANG_KEY) || 'ro');
  document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = (localStorage.getItem(LANG_KEY) || 'ro') === 'ro' ? 'en' : 'ro';
      applyLang(next);
    });
  });

  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('mobile-menu')?.classList.toggle('hidden');
  });

  document.getElementById('join-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    this.classList.add('hidden');
    document.getElementById('form-success')?.classList.remove('hidden');
  });
  document.getElementById('contact-form')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const fd = new FormData(this);
    const btn = this.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      await window.FarcasaInbox.add({
        name: fd.get('name'),
        email: fd.get('email'),
        dept: fd.get('dept'),
        message: fd.get('message')
      });
      this.classList.add('hidden');
      const ok = document.getElementById('contact-success');
      if (ok) {
        ok.classList.remove('hidden');
        ok.querySelector('p').textContent = 'Mesaj trimis. Îl vedem în dashboard.';
      }
    } catch (err) {
      if (window.FarcasaUI) await window.FarcasaUI.alert(err.message || 'Nu s-a putut trimite mesajul.', 'Mesaj'); else console.error(err);
      if (btn) btn.disabled = false;
    }
  });

  function ensureAuthSlot() {
    let slot = document.getElementById('auth-slot');
    if (slot) return slot;
    const headerInner = document.querySelector('.site-header .header-inner') 
      || document.querySelector('.site-header .max-w-6xl') 
      || document.querySelector('.site-header > div');
    if (!headerInner) return null;
    // zona dreapta: theme/lang/menu
    let right = headerInner.querySelector('.header-right') || headerInner.querySelector('.flex.items-center.gap-2');
    if (!right) {
      right = document.createElement('div');
      right.className = 'header-right flex items-center gap-2 shrink-0';
      headerInner.appendChild(right);
    }
    slot = document.createElement('div');
    slot.id = 'auth-slot';
    slot.className = 'flex items-center gap-1.5 sm:gap-2 text-sm shrink-0';
    // auth înainte de theme buttons
    right.insertBefore(slot, right.firstChild);
    return slot;
  }

  async function resolveDisplayName(user) {
    if (!user) return '';
    if (user.displayName) return user.displayName;
    try {
      if (window.FarcasaForum && user.uid) {
        const prof = await window.FarcasaForum.getUserProfile(user.uid);
        if (prof && prof.displayName) return prof.displayName;
      }
    } catch (e) {}
    // fallback: part before @
    if (user.email) return String(user.email).split('@')[0];
    return '';
  }

  async function renderAuthSlot() {
    const slot = ensureAuthSlot();
    if (!slot || !window.FarcasaAuth) return;
    const logged = window.FarcasaAuth.isLoggedIn();
    const admin = logged && window.FarcasaAuth.isAdmin();
    const user = window.FarcasaAuth.getUser();
    const name = logged ? await resolveDisplayName(user) : '';
    const email = (user && user.email) ? user.email : '';
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const dash = (admin && !location.pathname.endsWith('dashboard.html'))
      ? '<a href="dashboard.html" class="acct-item">Dashboard</a>' : '';
    const authBtns = logged
      ? `<button type="button" id="header-logout-btn" class="acct-item">Logout</button>`
      : `<a href="login.html" class="acct-item">Login</a><a href="login.html?tab=signup" class="acct-item">Sign up</a>`;
    slot.innerHTML = `
      <div class="acct-wrap">
        <button type="button" id="acct-btn" class="acct-burger" aria-label="Cont">☰</button>
        <div id="acct-menu" class="acct-menu hidden">
          ${logged ? `<div class="acct-name">${name || 'Cont'}</div><div class="acct-email">${email}</div>` : '<div class="acct-name">Cont</div>'}
          ${dash}
          ${logged ? '<a href="setari.html" class="acct-item">Setări cont</a><a href="tichet.html" class="acct-item">Tichet</a><button type="button" id="delete-account-btn" class="acct-item">Șterge contul</button>' : ''}
          ${authBtns}
          <div class="acct-sep"></div>
          <button type="button" class="acct-item" data-set-theme="light">Temă light</button>
          <button type="button" class="acct-item${theme === 'dark' ? '' : ''}" data-set-theme="dark">Temă dark</button>
        </div>
      </div>`;
    document.getElementById('acct-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('acct-menu')?.classList.toggle('hidden');
    });
    document.getElementById('delete-account-btn')?.addEventListener('click', async () => {
      const ok = await window.FarcasaUI.confirm('Se șterge contul. Rămâne doar istoricul de ban, dacă există. Continui?', 'Șterge contul');
      if (!ok) return;
      const pass = await window.FarcasaUI.prompt('Scrie parola ca să confirmi.', 'Parolă');
      if (!pass) return;
      try {
        await window.FarcasaAuth.deleteAccount(pass);
        location.href = 'index.html';
      } catch (e) {
        await window.FarcasaUI.alert(e.message || String(e), 'Eroare');
      }
    });
    document.getElementById('header-logout-btn')?.addEventListener('click', async () => {
      try { await window.FarcasaAuth.logout(); } catch (e) {}
      window.location.href = 'index.html';
    });
    slot.querySelectorAll('[data-set-theme]').forEach((btn) => {
      btn.addEventListener('click', () => applyTheme(btn.dataset.setTheme));
    });
    document.querySelectorAll('[data-theme-btn]').forEach((b) => b.classList.add('hidden'));
    document.querySelectorAll('#logout-btn').forEach((b) => b.classList.add('hidden'));
  }

  function refreshAdminUI() {
    if (!window.FarcasaAuth) return;
    const logged = window.FarcasaAuth.isLoggedIn();
    const admin = logged && window.FarcasaAuth.isAdmin();
    document.querySelectorAll('[data-admin-only]').forEach((el) => {
      el.classList.toggle('hidden', !admin);
    });
    document.querySelectorAll('[data-guest-only]').forEach((el) => {
      el.classList.toggle('hidden', logged);
    });
    document.querySelectorAll('[data-user-only]').forEach((el) => {
      el.classList.toggle('hidden', !logged);
    });
    const badge = document.getElementById('auth-mode-badge');
    if (badge) {
      badge.textContent = window.FarcasaAuth.mode() === 'firebase' ? 'Cloud DB' : 'Local demo';
    }
    const label = document.getElementById('nav-user-label');
    if (label) {
      const u = window.FarcasaAuth.getUser();
      label.textContent = u && u.email ? u.email : '';
    }
    renderAuthSlot();
  }

  function normalizePublicNav() {
    if (document.body.dataset.page === 'dashboard') return;
    const nav = document.querySelector('.site-header nav');
    if (!nav) return;
    const page = (location.pathname.split('/').pop() || 'index.html').split('?')[0] || 'index.html';
    const items = [
      ['index.html', 'Acasă'],
      ['postari.html', 'Postări'],
      ['forum.html', 'Forum'],
      ['despre.html', 'Despre'],
      ['program.html', 'Program EYV'],
      ['evenimente.html', 'Evenimente'],
      ['monitorizare.html', 'Monitorizare'],
      ['feedback.html', 'Feedback'],
      ['impact.html', 'Impact'],
      ['contact.html', 'Contact']
    ];
    nav.className = 'site-nav hidden lg:flex items-center';
    nav.innerHTML = items.map(([href, label]) => {
      const on = page === href || (page === '' && href === 'index.html');
      return `<a href="${href}" class="nav-link${on ? ' is-active' : ''}">${label}</a>`;
    }).join('');
  }

  document.addEventListener('click', () => document.getElementById('acct-menu')?.classList.add('hidden'));
  document.addEventListener('DOMContentLoaded', async () => {
    normalizePublicNav();
    if (window.FarcasaAuth?.waitAuth) {
      try { await window.FarcasaAuth.waitAuth(3000); } catch (e) {}
    }
    refreshAdminUI();
    if (window.FarcasaAuth && window.FarcasaAuth.onAuth) {
      window.FarcasaAuth.onAuth(() => refreshAdminUI());
    }
  });
})();


window.FarcasaUI = (function () {
  function ensure() {
    let root = document.getElementById('site-dialog');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'site-dialog';
    root.className = 'hidden';
    root.style.cssText = 'position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,.45)';
    root.innerHTML = `
      <div class="card" style="width:min(420px,100%);padding:1.25rem 1.25rem 1rem;background:var(--bg-card);color:var(--text)">
        <h3 id="site-dialog-title" class="text-lg font-bold mb-2" style="color:var(--text)"></h3>
        <p id="site-dialog-text" class="text-sm mb-3" style="color:var(--text-muted)"></p>
        <input id="site-dialog-input" class="w-full px-3 py-2 mb-3 hidden" autocomplete="off">
        <div class="flex justify-end gap-2">
          <button type="button" id="site-dialog-cancel" class="btn-ghost text-sm py-2">Anulează</button>
          <button type="button" id="site-dialog-ok" class="btn-primary text-sm py-2">OK</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    return root;
  }
  function open(opts) {
    const root = ensure();
    const title = root.querySelector('#site-dialog-title');
    const text = root.querySelector('#site-dialog-text');
    const input = root.querySelector('#site-dialog-input');
    const ok = root.querySelector('#site-dialog-ok');
    const cancel = root.querySelector('#site-dialog-cancel');
    title.textContent = opts.title || '';
    text.textContent = opts.text || '';
    input.classList.toggle('hidden', !opts.prompt);
    input.value = opts.value || '';
    cancel.classList.toggle('hidden', opts.alert === true);
    ok.textContent = opts.okLabel || 'OK';
    root.classList.remove('hidden');
    if (opts.prompt) setTimeout(() => input.focus(), 30);
    return new Promise((resolve) => {
      function close(val) {
        root.classList.add('hidden');
        ok.onclick = null;
        cancel.onclick = null;
        resolve(val);
      }
      ok.onclick = () => close(opts.prompt ? input.value.trim() : true);
      cancel.onclick = () => close(opts.prompt ? null : false);
      root.onclick = (e) => { if (e.target === root) close(opts.prompt ? null : false); };
    });
  }
  return {
    alert(text, title) { return open({ title: title || 'Mesaj', text, alert: true, okLabel: 'OK' }); },
    confirm(text, title) { return open({ title: title || 'Confirmă', text, okLabel: 'Da', alert: false }); },
    prompt(text, title, value) { return open({ title: title || 'Completează', text, prompt: true, value: value || '', okLabel: 'Salvează' }); }
  };
})();
