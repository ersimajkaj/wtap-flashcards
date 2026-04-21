// CRUD operations for Deck records

function createDeck(name, description) {
  const decks = loadDecks();
  const deck = {
    id: generateId(),
    name: name.trim(),
    description: (description || '').trim(),
    createdAt: new Date().toISOString()
  };
  decks.push(deck);
  saveDecks(decks);
  return deck;
}

function getDeck(id) {
  return loadDecks().find(d => d.id === id) || null;
}

function updateDeck(id, updates) {
  const decks = loadDecks();
  const deck = decks.find(d => d.id === id);
  if (!deck) return null;
  if (updates.name !== undefined) deck.name = updates.name.trim();
  if (updates.description !== undefined) deck.description = updates.description.trim();
  saveDecks(decks);
  return deck;
}

// Cascading delete: removing a deck also removes all its cards
function deleteDeck(id) {
  const decks = loadDecks().filter(d => d.id !== id);
  saveDecks(decks);
  const cards = loadCards().filter(c => c.deckId !== id);
  saveCards(cards);
}
