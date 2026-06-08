// Calls the backend AI proxy. The Gemini key lives on the server now.

async function generateCardsFromNotes(deckId, notes) {
  const result = await aiApi.generate(deckId, notes);
  return result.cards;
}
