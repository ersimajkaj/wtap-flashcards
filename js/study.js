// Study mode: 3D flip card with keyboard shortcuts

const studyState = {
  cards: [],
  currentIndex: 0,
  flipped: false,
  deckId: null
};

let keyHandler = null;

function startStudy(deckId) {
  studyState.deckId = deckId;
  studyState.cards = getCardsForDeck(deckId);
  // Shuffle so repeated study sessions vary
  studyState.cards.sort(() => Math.random() - 0.5);
  studyState.currentIndex = 0;
  studyState.flipped = false;
  renderStudyCard();
  attachKeyboardShortcuts();
}

function stopStudy() {
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }
}

function attachKeyboardShortcuts() {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = (e) => {
    const studyTab = document.getElementById('tab-study');
    if (!studyTab || !studyTab.classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      flipCard();
    } else if (e.code === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      nextCard();
    } else if (e.code === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      prevCard();
    }
  };
  document.addEventListener('keydown', keyHandler);
}

function flipCard() {
  if (!studyState.cards.length) return;
  studyState.flipped = !studyState.flipped;
  const flipEl = document.querySelector('.flip-card');
  if (flipEl) flipEl.dataset.flipped = studyState.flipped;
}

function nextCard() {
  if (!studyState.cards.length) return;
  // Flip back first, then swap content after transition
  if (studyState.flipped) {
    studyState.flipped = false;
    const flipEl = document.querySelector('.flip-card');
    if (flipEl) flipEl.dataset.flipped = 'false';
    setTimeout(() => {
      studyState.currentIndex = (studyState.currentIndex + 1) % studyState.cards.length;
      renderStudyCard();
    }, 350);
  } else {
    studyState.currentIndex = (studyState.currentIndex + 1) % studyState.cards.length;
    renderStudyCard();
  }
}

function prevCard() {
  if (!studyState.cards.length) return;
  if (studyState.flipped) {
    studyState.flipped = false;
    const flipEl = document.querySelector('.flip-card');
    if (flipEl) flipEl.dataset.flipped = 'false';
    setTimeout(() => {
      studyState.currentIndex = (studyState.currentIndex - 1 + studyState.cards.length) % studyState.cards.length;
      renderStudyCard();
    }, 350);
  } else {
    studyState.currentIndex = (studyState.currentIndex - 1 + studyState.cards.length) % studyState.cards.length;
    renderStudyCard();
  }
}

function renderStudyCard() {
  const container = document.getElementById('study-card');
  if (!container) return;

  if (studyState.cards.length === 0) {
    container.innerHTML = `
      <div class="study-empty">
        <p>No cards yet. Add some first, or generate a batch with AI.</p>
      </div>
    `;
    return;
  }

  const card = studyState.cards[studyState.currentIndex];
  const progress = ((studyState.currentIndex + 1) / studyState.cards.length) * 100;

  container.innerHTML = `
    <div class="study-progress-bar">
      <div class="study-progress-fill" style="width: ${progress}%"></div>
    </div>
    <div class="study-meta">
      <span>${studyState.currentIndex + 1} of ${studyState.cards.length}</span>
      <span class="study-hint">Space to flip · → for next</span>
    </div>

    <div class="flip-card" data-flipped="${studyState.flipped}">
      <div class="flip-inner">
        <div class="flip-face flip-front">
          <span class="flip-label">Question</span>
          <div class="flip-text">${escapeHtml(card.question)}</div>
        </div>
        <div class="flip-face flip-back">
          <span class="flip-label">Answer</span>
          <div class="flip-text">${escapeHtml(card.answer)}</div>
        </div>
      </div>
    </div>

    <div class="study-actions">
      <button id="prev-btn" class="btn-ghost">← Prev</button>
      <button id="flip-btn" class="btn-outline">Flip</button>
      <button id="next-btn" class="btn-primary">Next →</button>
    </div>
  `;

  document.getElementById('flip-btn').onclick = flipCard;
  document.getElementById('next-btn').onclick = nextCard;
  document.getElementById('prev-btn').onclick = prevCard;

  // Clicking the card itself also flips — feels natural
  document.querySelector('.flip-card').onclick = (e) => {
    if (e.target.closest('button')) return;
    flipCard();
  };
}
