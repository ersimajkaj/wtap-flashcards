// Gemini integration. Key is provided by the user and stored in their localStorage.
// Rationale: this is a frontend-only app. Hardcoding a key would expose it in the repo
// and in every user's browser. Asking each user for their own key keeps the repo clean
// and the key scoped to the person running the app. Proper long-term fix: backend proxy.

const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const API_KEY_STORAGE = 'flashcards.apiKey';

// Retrieves the key from localStorage, prompting once if missing
function getApiKey() {
  let key = localStorage.getItem(API_KEY_STORAGE);
  if (!key) {
    key = prompt('Enter your Gemini API key (get one free at https://aistudio.google.com/apikey):');
    if (key && key.trim()) {
      key = key.trim();
      localStorage.setItem(API_KEY_STORAGE, key);
    } else {
      return null;
    }
  }
  return key;
}

// Lets the user reset a bad/expired key
function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE);
}

// Sends notes to Gemini and parses the response into flashcard objects
async function generateCardsFromNotes(notes) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key required. Refresh and enter your Gemini key to continue.');
  }

  const prompt = `You are a flashcard generator. Read the notes below and create flashcards from them.
Each flashcard tests ONE specific concept.

Return ONLY a JSON array. No markdown, no extra text.
Each item must have exactly two fields: "question" and "answer".
Aim for 5 to 15 flashcards. Keep questions specific. Keep answers concise (1-2 sentences).

Notes:
${notes}`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // Force structured JSON output so we can safely JSON.parse the response
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    // If key is invalid/expired, wipe it so the user gets re-prompted next time
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      clearApiKey();
    }
    throw new Error(`Gemini API error ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI returned no content.');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('AI response was not valid JSON.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('AI did not return an array of cards.');
  }

  // Defensive filter: drop malformed entries instead of crashing
  return parsed
    .filter(c => c && typeof c.question === 'string' && typeof c.answer === 'string')
    .map(c => ({ question: c.question.trim(), answer: c.answer.trim() }))
    .filter(c => c.question && c.answer);
}
