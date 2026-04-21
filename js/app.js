// Page initialization + UI rendering for both index.html and deck.html

let currentDeckId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('new-deck-form')) initIndexPage();
  if (document.getElementById('deck-title')) initDeckPage();
});

// ---------- INDEX PAGE ----------

function initIndexPage() {
  const form = document.getElementById('new-deck-form');
  form.onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('deck-name').value;
    const description = document.getElementById('deck-description').value;
    if (!name.trim()) return;
    createDeck(name, description);
    form.reset();
    renderDeckList();
  };
  renderDeckList();
}

function renderDeckList() {
  const container = document.getElementById('deck-list');
  const decks = loadDecks();

  if (decks.length === 0) {
    container.innerHTML = '<p class="empty">No decks yet. Create one above to get started.</p>';
    return;
  }

  // Newest decks first
  const sorted = [...decks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  container.innerHTML = sorted.map(deck => {
    const cardCount = getCardsForDeck(deck.id).length;
    return `
      <article class="deck-card">
        <h3><a href="deck.html?id=${encodeURIComponent(deck.id)}">${escapeHtml(deck.name)}</a></h3>
        ${deck.description ? `<p>${escapeHtml(deck.description)}</p>` : ''}
        <div class="deck-meta">
          <span>${cardCount} card${cardCount === 1 ? '' : 's'}</span>
          <button class="rename-btn" data-id="${deck.id}">Rename</button>
          <button class="delete-btn" data-id="${deck.id}">Delete</button>
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
      }
    };
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const deck = getDeck(id);
      if (confirm(`Delete "${deck.name}" and all its cards?`)) {
        deleteDeck(id);
        renderDeckList();
      }
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

  document.getElementById('deck-title').textContent = deck.name;
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
      if (tab.dataset.tab === 'study') startStudy(currentDeckId);
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
  };
}

function setupGenerateButton() {
  const btn = document.getElementById('generate-btn');
  if (!btn) return;

  btn.onclick = async () => {
    const notes = document.getElementById('ai-notes').value.trim();
    const status = document.getElementById('generate-status');

    if (!notes) {
      status.textContent = 'Please paste some notes first.';
      return;
    }

    btn.disabled = true;
    status.textContent = 'Generating cards...';

    try {
      const cards = await generateCardsFromNotes(notes);
      cards.forEach(c => createCard(currentDeckId, c.question, c.answer));
      status.textContent = `Created ${cards.length} card${cards.length === 1 ? '' : 's'}.`;
      document.getElementById('ai-notes').value = '';
      renderCardList();
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
    } finally {
      btn.disabled = false;
    }
  };
}

function renderCardList() {
  const container = document.getElementById('card-list');
  if (!container) return;

  const cards = getCardsForDeck(currentDeckId);

  if (cards.length === 0) {
    container.innerHTML = '<p class="empty">No cards yet. Add one above or use AI Generate.</p>';
    return;
  }

  container.innerHTML = cards.map(card => `
    <article class="card-item" data-id="${card.id}">
      <div class="card-q"><strong>Q:</strong> ${escapeHtml(card.question)}</div>
      <div class="card-a"><strong>A:</strong> ${escapeHtml(card.answer)}</div>
      <div class="card-actions">
        <button class="edit-card-btn" data-id="${card.id}">Edit</button>
        <button class="delete-card-btn" data-id="${card.id}">Delete</button>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('.edit-card-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const card = getCard(id);
      const newQ = prompt('Question:', card.question);
      if (newQ === null) return;
      const newA = prompt('Answer:', card.answer);
      if (newA === null) return;
      updateCard(id, { question: newQ, answer: newA });
      renderCardList();
    };
  });

  container.querySelectorAll('.delete-card-btn').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Delete this card?')) {
        deleteCard(btn.dataset.id);
        renderCardList();
      }
    };
  });
}
