// Study mode driven by the server's SM-2 scheduler.
// User flips the card, picks Again/Hard/Good/Easy, server updates the schedule,
// next due card is loaded.

const studyState = {
  queue: [],
  current: null,
  flipped: false,
  deckId: null,
  loading: false
};

let keyHandler = null;

async function startStudy(deckId) {
  studyState.deckId = deckId;
  studyState.flipped = false;
  studyState.current = null;
  studyState.queue = [];
  renderStudyLoading();
  attachKeyboardShortcuts();
  await fetchNextBatch();
  advanceToNext();
}

function stopStudy() {
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }
}

async function fetchNextBatch() {
  if (studyState.loading) return;
  studyState.loading = true;
  try {
    studyState.queue = await studyApi.due(studyState.deckId, 20);
  } catch (err) {
    toast(err.message, 'error');
    studyState.queue = [];
  } finally {
    studyState.loading = false;
  }
}

function advanceToNext() {
  studyState.flipped = false;
  studyState.current = studyState.queue.shift() || null;
  renderStudyCard();
}

function attachKeyboardShortcuts() {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = (e) => {
    const studyTab = document.getElementById('tab-study');
    if (!studyTab || !studyTab.classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!studyState.current) return;

    if (e.code === 'Space') {
      e.preventDefault();
      flipCard();
    } else if (studyState.flipped) {
      // Number-key shortcuts mirror the four rating buttons
      if (e.key === '1') { e.preventDefault(); rate(0); }
      else if (e.key === '2') { e.preventDefault(); rate(1); }
      else if (e.key === '3') { e.preventDefault(); rate(2); }
      else if (e.key === '4') { e.preventDefault(); rate(3); }
    }
  };
  document.addEventListener('keydown', keyHandler);
}

function flipCard() {
  if (!studyState.current) return;
  studyState.flipped = !studyState.flipped;
  const flipEl = document.querySelector('.flip-card');
  if (flipEl) flipEl.dataset.flipped = studyState.flipped;
  const actions = document.querySelector('.study-actions');
  if (actions) actions.dataset.showRatings = studyState.flipped;
}

async function rate(rating) {
  if (!studyState.current) return;
  const cardId = studyState.current.cardId;
  try {
    await studyApi.review(cardId, rating);
  } catch (err) {
    toast(err.message, 'error');
    return;
  }
  if (studyState.queue.length < 3) {
    await fetchNextBatch();
  }
  advanceToNext();
}

function renderStudyLoading() {
  const container = document.getElementById('study-card');
  if (!container) return;
  container.innerHTML = `<div class="study-empty"><span class="spinner"></span><p>Loading due cards…</p></div>`;
}

function renderStudyCard() {
  const container = document.getElementById('study-card');
  if (!container) return;

  if (!studyState.current) {
    container.innerHTML = `
      <div class="study-empty">
        <h3>You're caught up</h3>
        <p>No cards due right now. Come back later, or add more cards to this deck.</p>
      </div>
    `;
    return;
  }

  const card = studyState.current;
  container.innerHTML = `
    <div class="study-meta">
      <span>${card.repetitions === 0 ? 'New card' : `Seen ${card.repetitions}×`}</span>
      <span class="study-hint">Space to flip · 1-4 to rate</span>
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

    <div class="study-actions" data-show-ratings="${studyState.flipped}">
      <button id="flip-btn" class="btn-outline study-flip-btn">Flip (Space)</button>
      <div class="rating-buttons">
        <button class="rating-btn rating-again" data-rating="0">Again<span>1</span></button>
        <button class="rating-btn rating-hard" data-rating="1">Hard<span>2</span></button>
        <button class="rating-btn rating-good" data-rating="2">Good<span>3</span></button>
        <button class="rating-btn rating-easy" data-rating="3">Easy<span>4</span></button>
      </div>
    </div>
  `;

  document.getElementById('flip-btn').onclick = flipCard;
  document.querySelectorAll('.rating-btn').forEach(b => {
    b.onclick = () => rate(parseInt(b.dataset.rating, 10));
  });

  document.querySelector('.flip-card').onclick = (e) => {
    if (e.target.closest('button')) return;
    flipCard();
  };
}
