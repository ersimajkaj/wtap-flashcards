using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WtapFlashcards.Api.Auth;
using WtapFlashcards.Api.Data;
using WtapFlashcards.Api.DTOs;
using WtapFlashcards.Api.Models;
using WtapFlashcards.Api.Services;

namespace WtapFlashcards.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/ai")]
public class AiController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IGeminiService _gemini;

    public AiController(AppDbContext db, IGeminiService gemini)
    {
        _db = db;
        _gemini = gemini;
    }

    [HttpPost("generate")]
    public async Task<ActionResult<GenerateCardsResponse>> Generate(GenerateCardsRequest req, CancellationToken ct)
    {
        var userId = User.Id();
        var ownsDeck = await _db.Decks.AnyAsync(d => d.Id == req.DeckId && d.OwnerId == userId, ct);
        if (!ownsDeck) return NotFound();

        IReadOnlyList<GeneratedCardDto> generated;
        try
        {
            generated = await _gemini.GenerateCardsAsync(req.Notes, ct);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var cards = generated.Select(g => new Card
        {
            DeckId = req.DeckId,
            Question = g.Question,
            Answer = g.Answer
        }).ToList();

        _db.Cards.AddRange(cards);
        await _db.SaveChangesAsync(ct);

        var response = cards.Select(c => new CardResponse(c.Id, c.DeckId, c.Question, c.Answer, c.CreatedAt)).ToList();
        return Ok(new GenerateCardsResponse(response.Count, response));
    }
}
