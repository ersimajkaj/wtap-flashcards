// Study mode: flip through cards one at a time

const studyState = {
  cards: [],
  currentIndex: 0,
  showingAnswer: false
};

function startStudy(deckId) {
  studyState.cards = getCardsForDeck(deckId);
  // Shuffle so repeated study sessions vary
  studyState.cards.sort(() => Math.random() - 0.5);
  studyState.currentIndex = 0;
  studyState.showingAnswer = false;
  renderStudyCard();
}

function renderStudyCard() {
  const container = document.getElementById('study-card');
  if (!container) return;

  if (studyState.cards.length === 0) {
    container.innerHTML = '<p class="empty">No cards in this deck yet. Add some first.</p>';
    return;
  }

  const card = studyState.cards[studyState.currentIndex];
  const side = studyState.showingAnswer ? card.answer : card.question;
  const label = studyState.showingAnswer ? 'Answer' : 'Question';
  const flipLabel = studyState.showingAnswer ? 'Show Question' : 'Show Answer';

  container.innerHTML = `
    <div class="study-progress">${studyState.currentIndex + 1} / ${studyState.cards.length}</div>
    <div class="study-side-label">${label}</div>
    <div class="study-text">${escapeHtml(side)}</div>
    <div class="study-actions">
      <button id="flip-btn">${flipLabel}</button>
      <button id="next-btn">Next →</button>
    </div>
  `;

  document.getElementById('flip-btn').onclick = () => {
    studyState.showingAnswer = !studyState.showingAnswer;
    renderStudyCard();
  };

  document.getElementById('next-btn').onclick = () => {
    studyState.currentIndex = (studyState.currentIndex + 1) % studyState.cards.length;
    studyState.showingAnswer = false;
    renderStudyCard();
  };
}
