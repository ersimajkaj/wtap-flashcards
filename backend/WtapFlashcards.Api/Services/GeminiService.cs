using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using WtapFlashcards.Api.DTOs;

namespace WtapFlashcards.Api.Services;

public interface IGeminiService
{
    Task<IReadOnlyList<GeneratedCardDto>> GenerateCardsAsync(string notes, CancellationToken ct);
}

public class GeminiService : IGeminiService
{
    private readonly HttpClient _http;
    private readonly GeminiOptions _options;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(HttpClient http, IOptions<GeminiOptions> options, ILogger<GeminiService> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<GeneratedCardDto>> GenerateCardsAsync(string notes, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
            throw new InvalidOperationException("Gemini API key is not configured.");

        var prompt = $$"""
You are a flashcard generator. Read the notes below and create flashcards from them.
Each flashcard tests ONE specific concept.

Return ONLY a JSON array. No markdown, no extra text.
Each item must have exactly two fields: "question" and "answer".
Aim for 5 to 15 flashcards. Keep questions specific. Keep answers concise (1-2 sentences).

Notes:
{{notes}}
""";

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_options.Model}:generateContent";
        var body = new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } },
            generationConfig = new { responseMimeType = "application/json" }
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };
        req.Headers.Add("X-goog-api-key", _options.ApiKey);

        using var resp = await _http.SendAsync(req, ct);
        var raw = await resp.Content.ReadAsStringAsync(ct);

        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gemini error {Status}: {Body}", resp.StatusCode, raw[..Math.Min(200, raw.Length)]);
            throw new InvalidOperationException($"AI service returned {(int)resp.StatusCode}.");
        }

        // Drill into Gemini's response envelope to the inner JSON text
        using var doc = JsonDocument.Parse(raw);
        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? throw new InvalidOperationException("AI returned empty content.");

        List<GeneratedCardDto>? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<List<GeneratedCardDto>>(text, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (JsonException)
        {
            throw new InvalidOperationException("AI response was not valid JSON.");
        }

        if (parsed is null || parsed.Count == 0)
            throw new InvalidOperationException("AI returned no usable cards.");

        return parsed
            .Where(c => !string.IsNullOrWhiteSpace(c.Question) && !string.IsNullOrWhiteSpace(c.Answer))
            .Select(c => new GeneratedCardDto(c.Question.Trim(), c.Answer.Trim()))
            .ToList();
    }
}
