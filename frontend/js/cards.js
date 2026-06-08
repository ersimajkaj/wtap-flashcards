// API wrappers for cards.

async function getCardsForDeck(deckId) {
  return await cardsApi.listForDeck(deckId);
}

async function createCard(deckId, question, answer) {
  return await cardsApi.create(deckId, { question, answer });
}

async function updateCard(id, updates) {
  await cardsApi.update(id, updates);
}

async function deleteCard(id) {
  await cardsApi.remove(id);
}
