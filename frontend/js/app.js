// Page initialization + UI rendering for both index.html and deck.html

let currentDeckId = null;
let selectedColor = DECK_COLORS[0];

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (document.getElementById('new-deck-form')) initIndexPage();
  if (document.getElementById('deck-title')) initDeckPage();
});

// ---------- INDEX PAGE ----------

function initIndexPage() {
  const form = document.getElementById('new-deck-form');
  buildColorPicker();

  form.onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('deck-name').value;
    const description = document.getElementById('deck-description').value;
    if (!name.trim()) return;
    const deck = createDeck(name, description, selectedColor);
    form.reset();
    selectedColor = DECK_COLORS[0];
    buildColorPicker();
    renderDeckList();
    toast(`Deck "${deck.name}" created`, 'success');
  };
  renderDeckList();
}

function buildColorPicker() {
  const container = document.getElementById('color-picker');
  if (!container) return;
  container.innerHTML = DECK_COLORS.map(c => `
    <button type="button" class="color-option color-${c}${c === selectedColor ? ' selected' : ''}" data-color="${c}" aria-label="${c}"></button>
  `).join('');
  container.querySelectorAll('.color-option').forEach(btn => {
    btn.onclick = () => {
      selectedColor = btn.dataset.color;
      buildColorPicker();
    };
  });
}

function renderDeckList() {
  const container = document.getElementById('deck-list');
  const decks = loadDecks();
  const countEl = document.getElementById('deck-count');
  if (countEl) countEl.textContent = decks.length ? `${decks.length} total` : '';

  if (decks.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <p>Nothing here yet. Make your first deck above.</p>
      </div>
    `;
    return;
  }

  // Newest decks first
  const sorted = [...decks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  container.innerHTML = sorted.map(deck => {
    const cardCount = getCardsForDeck(deck.id).length;
    const color = deck.color || DECK_COLORS[0];
    return `
      <article class="deck-card color-${color}">
        <a href="deck.html?id=${encodeURIComponent(deck.id)}" class="deck-link">
          <div class="deck-chip"></div>
          <div class="deck-body">
            <h3>${escapeHtml(deck.name)}</h3>
            ${deck.description ? `<p>${escapeHtml(deck.description)}</p>` : ''}
            <div class="deck-count">${cardCount} card${cardCount === 1 ? '' : 's'}</div>
          </div>
        </a>
        <div class="deck-actions">
          <button class="text-btn rename-btn" data-id="${deck.id}">Rename</button>
          <button class="text-btn text-btn-danger delete-btn" data-id="${deck.id}">Delete</button>
        </div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('.rename-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const deck = getDeck(id);
      const newName = prompt('New name:', deck.name);
      if (newName && newName.trim()) {
        updateDeck(id, { name: newName });
        renderDeckList();
        toast('Deck renamed', 'success');
      }
    };
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const deck = getDeck(id);
      const cardsToRestore = getCardsForDeck(id);
      deleteDeck(id);
      renderDeckList();
      toast(`Deleted "${deck.name}"`, 'info', {
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: () => {
            restoreDeck(deck, cardsToRestore);
            renderDeckList();
            toast('Restored', 'success');
          }
        }
      });
    };
  });
}

// ---------- DECK PAGE ----------

function initDeckPage() {
  const params = new URLSearchParams(window.location.search);
  currentDeckId = params.get('id');

  const deck = currentDeckId ? getDeck(currentDeckId) : null;
  if (!deck) {
    document.getElementById('deck-title').textContent = 'Deck not found';
    document.getElementById('deck-description').textContent = 'Go back and pick a deck.';
    return;
  }

  const color = deck.color || DECK_COLORS[0];
  document.getElementById('deck-title').innerHTML = `<span class="title-dot color-${color}"></span>${escapeHtml(deck.name)}`;
  document.getElementById('deck-description').textContent = deck.description || '';
  document.title = `${deck.name} – Flashcards`;

  setupTabs();
  setupCardForm();
  setupGenerateButton();
  renderCardList();
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      // Lazy-init study mode when its tab opens
      if (tab.dataset.tab === 'study') {
        startStudy(currentDeckId);
      } else {
        stopStudy();
      }
    };
  });
}

function setupCardForm() {
  const form = document.getElementById('new-card-form');
  form.onsubmit = (e) => {
    e.preventDefault();
    const question = document.getElementById('card-question').value;
    const answer = document.getElementById('card-answer').value;
    if (!question.trim() || !answer.trim()) return;
    createCard(currentDeckId, question, answer);
    form.reset();
    renderCardList();
    toast('Card added', 'success');
  };
}

function setupGenerateButton() {
  const btn = document.getElementById('generate-btn');
  if (!btn) return;

  btn.onclick = async () => {
    const notes = document.getElementById('ai-notes').value.trim();
    const status = document.getElementById('generate-status');

    if (!notes) {
      status.textContent = 'Paste some notes first.';
      return;
    }

    btn.disabled = true;
    status.innerHTML = `<span class="spinner"></span><span>Reading your notes and writing cards…</span>`;

    try {
      const cards = await generateCardsFromNotes(notes);
      cards.forEach(c => createCard(currentDeckId, c.question, c.answer));
      status.textContent = `Added ${cards.length} new card${cards.length === 1 ? '' : 's'}.`;
      document.getElementById('ai-notes').value = '';
      renderCardList();
      toast(`Generated ${cards.length} cards`, 'success');
    } catch (err) {
      status.textContent = err.message;
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };
}

function renderCardList() {
  const container = document.getElementById('card-list');
  if (!container) return;

  const cards = getCardsForDeck(currentDeckId);
  const countEl = document.getElementById('card-count');
  if (countEl) countEl.textContent = cards.length ? `${cards.length} total` : '';

  if (cards.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <p>No cards yet. Add one above or use AI Generate.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = cards.map(card => `
    <article class="card-item" data-id="${card.id}">
      <div class="card-body">
        <div class="card-q"><span class="label">Q</span>${escapeHtml(card.question)}</div>
        <div class="card-a"><span class="label">A</span>${escapeHtml(card.answer)}</div>
      </div>
      <div class="card-actions">
        <button class="text-btn edit-card-btn" data-id="${card.id}">Edit</button>
        <button class="text-btn text-btn-danger delete-card-btn" data-id="${card.id}">Delete</button>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('.edit-card-btn').forEach(btn => {
    btn.onclick = () => enterCardEditMode(btn.dataset.id);
  });

  container.querySelectorAll('.delete-card-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const card = getCard(id);
      deleteCard(id);
      renderCardList();
      toast('Card deleted', 'info', {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            createCard(card.deckId, card.question, card.answer);
            renderCardList();
          }
        }
      });
    };
  });
}

// Inline editing — replaces the card item with a form in place
function enterCardEditMode(cardId) {
  const card = getCard(cardId);
  const item = document.querySelector(`.card-item[data-id="${cardId}"]`);
  if (!item || !card) return;

  item.classList.add('editing');
  item.innerHTML = `
    <div class="card-body">
      <textarea class="edit-q" maxlength="500">${escapeHtml(card.question)}</textarea>
      <textarea class="edit-a" maxlength="1000">${escapeHtml(card.answer)}</textarea>
    </div>
    <div class="card-actions edit-actions">
      <button class="btn-outline cancel-edit">Cancel</button>
      <button class="btn-primary save-edit">Save</button>
    </div>
  `;

  const qEl = item.querySelector('.edit-q');
  qEl.focus();

  item.querySelector('.cancel-edit').onclick = () => renderCardList();
  item.querySelector('.save-edit').onclick = () => {
    const newQ = item.querySelector('.edit-q').value.trim();
    const newA = item.querySelector('.edit-a').value.trim();
    if (!newQ || !newA) {
      toast('Both fields are required', 'warning');
      return;
    }
    updateCard(cardId, { question: newQ, answer: newA });
    renderCardList();
    toast('Card updated', 'success');
  };
}
