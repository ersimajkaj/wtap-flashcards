// CRUD operations for Card records (each card belongs to a deck)

function createCard(deckId, question, answer) {
  const cards = loadCards();
  const card = {
    id: generateId(),
    deckId,
    question: question.trim(),
    answer: answer.trim(),
    createdAt: new Date().toISOString()
  };
  cards.push(card);
  saveCards(cards);
  return card;
}

function getCard(id) {
  return loadCards().find(c => c.id === id) || null;
}

function getCardsForDeck(deckId) {
  return loadCards().filter(c => c.deckId === deckId);
}

function updateCard(id, updates) {
  const cards = loadCards();
  const card = cards.find(c => c.id === id);
  if (!card) return null;
  if (updates.question !== undefined) card.question = updates.question.trim();
  if (updates.answer !== undefined) card.answer = updates.answer.trim();
  saveCards(cards);
  return card;
}

function deleteCard(id) {
  const cards = loadCards().filter(c => c.id !== id);
  saveCards(cards);
}
