// Shared UI helpers: theme toggle + toasts

const THEME_KEY = 'flashcards.theme';

// Inline SVGs for the one place that still uses iconography: theme toggle
const SUN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const MOON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

// -------- Theme --------

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.innerHTML = theme === 'dark' ? SUN_SVG : MOON_SVG;
  }
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(stored || (prefersDark ? 'dark' : 'light'));

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.onclick = () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    };
  }
}

// -------- Toasts --------

function getToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

// Shows a transient message. options: { duration, action: { label, onClick } }
function toast(message, type = 'info', options = {}) {
  const container = getToastContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;

  el.innerHTML = `
    <span class="toast-msg">${escapeHtml(message)}</span>
    ${options.action ? `<button class="toast-action">${escapeHtml(options.action.label)}</button>` : ''}
    <button class="toast-close" aria-label="Dismiss">×</button>
  `;

  container.appendChild(el);

  // Animate in
  requestAnimationFrame(() => el.classList.add('show'));

  const duration = options.duration ?? 4000;
  let timer = setTimeout(() => dismiss(), duration);

  function dismiss() {
    clearTimeout(timer);
    el.classList.remove('show');
    el.classList.add('hide');
    setTimeout(() => el.remove(), 250);
  }

  if (options.action) {
    el.querySelector('.toast-action').onclick = () => {
      options.action.onClick();
      dismiss();
    };
  }
  el.querySelector('.toast-close').onclick = dismiss;

  return dismiss;
}
