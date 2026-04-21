// localStorage keys + shared utilities
const STORAGE_KEYS = {
  DECKS: 'flashcards.decks',
  CARDS: 'flashcards.cards'
};

function loadDecks() {
  const raw = localStorage.getItem(STORAGE_KEYS.DECKS);
  return raw ? JSON.parse(raw) : [];
}

function saveDecks(decks) {
  localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));
}

function loadCards() {
  const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
  return raw ? JSON.parse(raw) : [];
}

function saveCards(cards) {
  localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
}

// Random unique ID for new records
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Prevent XSS when rendering user input into innerHTML
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
