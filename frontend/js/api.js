// Backend API client + session. Replaces the old localStorage layer.

const API_BASE = (() => {
  const stored = localStorage.getItem('flashcards.apiBase');
  return stored || 'http://localhost:5000/api';
})();

const TOKEN_KEY = 'flashcards.token';
const USER_KEY = 'flashcards.user';

const session = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isAuthed: () => !!localStorage.getItem(TOKEN_KEY)
};

// Redirects unauthed visitors to login. Call at top of protected pages.
function requireAuth() {
  if (!session.isAuthed()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = session.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  // Auto-logout on expired/invalid token
  if (res.status === 401 && auth && session.isAuthed()) {
    session.clear();
    window.location.href = 'index.html';
    throw new Error('Session expired');
  }

  if (res.status === 204) return null;

  let payload = null;
  const text = await res.text();
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (!res.ok) {
    const msg = (payload && payload.error) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return payload;
}

// ---------- Auth ----------

const authApi = {
  register: (email, password) =>
    apiFetch('/auth/register', { method: 'POST', body: { email, password }, auth: false }),
  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: { email, password }, auth: false })
};

// ---------- Decks ----------

const decksApi = {
  list: () => apiFetch('/decks'),
  get: (id) => apiFetch(`/decks/${id}`),
  create: (deck) => apiFetch('/decks', { method: 'POST', body: deck }),
  update: (id, patch) => apiFetch(`/decks/${id}`, { method: 'PATCH', body: patch }),
  remove: (id) => apiFetch(`/decks/${id}`, { method: 'DELETE' })
};

// ---------- Cards ----------

const cardsApi = {
  listForDeck: (deckId) => apiFetch(`/decks/${deckId}/cards`),
  create: (deckId, card) => apiFetch(`/decks/${deckId}/cards`, { method: 'POST', body: card }),
  update: (id, patch) => apiFetch(`/cards/${id}`, { method: 'PATCH', body: patch }),
  remove: (id) => apiFetch(`/cards/${id}`, { method: 'DELETE' })
};

// ---------- AI ----------

const aiApi = {
  generate: (deckId, notes) =>
    apiFetch('/ai/generate', { method: 'POST', body: { deckId, notes } })
};

// ---------- Study (SM-2) ----------

const studyApi = {
  due: (deckId, limit = 20) => apiFetch(`/study/${deckId}/due?limit=${limit}`),
  review: (cardId, rating) =>
    apiFetch('/study/review', { method: 'POST', body: { cardId, rating } }),
  stats: (deckId) => apiFetch(`/study/${deckId}/stats`)
};

// Shared utilities (formerly in storage.js)
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
