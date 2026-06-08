// API wrappers for decks. Same function names the rest of the app already uses.

const DECK_COLORS = ['violet', 'rose', 'amber', 'emerald', 'sky', 'slate'];

async function loadDecks() {
  return await decksApi.list();
}

async function getDeck(id) {
  try { return await decksApi.get(id); }
  catch { return null; }
}

async function createDeck(name, description, color) {
  return await decksApi.create({ name, description, color });
}

async function updateDeck(id, updates) {
  await decksApi.update(id, updates);
}

async function deleteDeck(id) {
  await decksApi.remove(id);
}

// Re-creates a deck + its cards (used by undo after delete).
async function restoreDeck(deck, cards) {
  const fresh = await decksApi.create({
    name: deck.name,
    description: deck.description,
    color: deck.color
  });
  for (const c of cards) {
    await cardsApi.create(fresh.id, { question: c.question, answer: c.answer });
  }
}
