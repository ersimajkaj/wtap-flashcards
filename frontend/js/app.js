// Page initialization + UI rendering for both decks.html and deck.html.
// All data access is async via api.js.

let currentDeckId = null;
let selectedColor = DECK_COLORS[0];

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  if (!requireAuth()) return;
  setupHeader();
  if (document.getElementById('new-deck-form')) await initIndexPage();
  if (document.getElementById('deck-title')) await initDeckPage();
});

// Header: shows current user email + logout button
function setupHeader() {
  const headerInner = document.querySelector('.header-inner');
  if (!headerInner) return;
  const user = session.getUser();
  if (!user) return;

  const userBox = document.createElement('div');
  userBox.className = 'user-box';
  userBox.innerHTML = `
    <span class="user-email">${escapeHtml(user.email)}</span>
    <button id="logout-btn" class="logout-btn">Logout</button>
  `;
  headerInner.appendChild(userBox);

  // Move the theme toggle into the user group so it sits inline with email + logout
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) userBox.appendChild(themeBtn);

  document.getElementById('logout-btn').onclick = () => {
    session.clear();
    window.location.href = 'index.html';
  };
}

// ---------- INDEX PAGE ----------

async function initIndexPage() {
  const form = document.getElementById('new-deck-form');
  buildColorPicker();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('deck-name').value;
    const description = document.getElementById('deck-description').value;
    if (!name.trim()) return;
    try {
      const deck = await createDeck(name, description, selectedColor);
      form.reset();
      selectedColor = DECK_COLORS[0];
      buildColorPicker();
      await renderDeckList();
      toast(`Deck "${deck.name}" created`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  await renderDeckList();
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

async function renderDeckList() {
  const container = document.getElementById('deck-list');
  let decks;
  try {
    decks = await loadDecks();
  } catch (err) {
    container.innerHTML = `<div class="empty"><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }
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

  container.innerHTML = decks.map(deck => {
    const color = deck.color || DECK_COLORS[0];
    return `
      <article class="deck-card color-${color}">
        <a href="deck.html?id=${encodeURIComponent(deck.id)}" class="deck-link">
          <div class="deck-chip"></div>
          <div class="deck-body">
            <h3>${escapeHtml(deck.name)}</h3>
            ${deck.description ? `<p>${escapeHtml(deck.description)}</p>` : ''}
            <div class="deck-count">${deck.cardCount} card${deck.cardCount === 1 ? '' : 's'}</div>
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
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const deck = await getDeck(id);
      if (!deck) return;
      const newName = prompt('New name:', deck.name);
      if (newName && newName.trim()) {
        try {
          await updateDeck(id, { name: newName });
          await renderDeckList();
          toast('Deck renamed', 'success');
        } catch (err) { toast(err.message, 'error'); }
      }
    };
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const deck = await getDeck(id);
      if (!deck) return;
      // Grab the cards BEFORE deleting so undo can recreate them
      const cardsToRestore = await getCardsForDeck(id);
      try {
        await deleteDeck(id);
        await renderDeckList();
        toast(`Deleted "${deck.name}"`, 'info', {
          duration: 6000,
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await restoreDeck(deck, cardsToRestore);
                await renderDeckList();
                toast('Restored', 'success');
              } catch (err) { toast(err.message, 'error'); }
            }
          }
        });
      } catch (err) { toast(err.message, 'error'); }
    };
  });
}

// ---------- DECK PAGE ----------

async function initDeckPage() {
  const params = new URLSearchParams(window.location.search);
  currentDeckId = params.get('id');

  const deck = currentDeckId ? await getDeck(currentDeckId) : null;
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
  await renderCardList();
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
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
  form.onsubmit = async (e) => {
    e.preventDefault();
    const question = document.getElementById('card-question').value;
    const answer = document.getElementById('card-answer').value;
    if (!question.trim() || !answer.trim()) return;
    try {
      await createCard(currentDeckId, question, answer);
      form.reset();
      await renderCardList();
      toast('Card added', 'success');
    } catch (err) { toast(err.message, 'error'); }
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
      const cards = await generateCardsFromNotes(currentDeckId, notes);
      status.textContent = `Added ${cards.length} new card${cards.length === 1 ? '' : 's'}.`;
      document.getElementById('ai-notes').value = '';
      await renderCardList();
      toast(`Generated ${cards.length} cards`, 'success');
    } catch (err) {
      status.textContent = err.message;
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };
}

async function renderCardList() {
  const container = document.getElementById('card-list');
  if (!container) return;

  let cards;
  try {
    cards = await getCardsForDeck(currentDeckId);
  } catch (err) {
    container.innerHTML = `<div class="empty"><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }
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

  // Keep card data accessible by id so edit/delete handlers don't refetch
  const cardsById = new Map(cards.map(c => [c.id, c]));

  container.querySelectorAll('.edit-card-btn').forEach(btn => {
    btn.onclick = () => enterCardEditMode(btn.dataset.id, cardsById.get(btn.dataset.id));
  });

  container.querySelectorAll('.delete-card-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const card = cardsById.get(id);
      try {
        await deleteCard(id);
        await renderCardList();
        toast('Card deleted', 'info', {
          duration: 5000,
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await createCard(card.deckId, card.question, card.answer);
                await renderCardList();
              } catch (err) { toast(err.message, 'error'); }
            }
          }
        });
      } catch (err) { toast(err.message, 'error'); }
    };
  });
}

// Inline editing — swaps the card item for a form in place
function enterCardEditMode(cardId, card) {
  const item = document.querySelector(`.card-item[data-id="${cardId}"]`);
  if (!item || !card) return;

  item.classList.add('editing');
  item.innerHTML = `
    <div class="card-body">
      <textarea class="edit-q" maxlength="500">${escapeHtml(card.question)}</textarea>
      <textarea class="edit-a" maxlength="2000">${escapeHtml(card.answer)}</textarea>
    </div>
    <div class="card-actions edit-actions">
      <button class="btn-outline cancel-edit">Cancel</button>
      <button class="btn-primary save-edit">Save</button>
    </div>
  `;

  item.querySelector('.edit-q').focus();

  item.querySelector('.cancel-edit').onclick = () => renderCardList();
  item.querySelector('.save-edit').onclick = async () => {
    const newQ = item.querySelector('.edit-q').value.trim();
    const newA = item.querySelector('.edit-a').value.trim();
    if (!newQ || !newA) {
      toast('Both fields are required', 'warning');
      return;
    }
    try {
      await updateCard(cardId, { question: newQ, answer: newA });
      await renderCardList();
      toast('Card updated', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };
}
