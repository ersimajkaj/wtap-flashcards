using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WtapFlashcards.Api.Auth;
using WtapFlashcards.Api.Data;
using WtapFlashcards.Api.DTOs;
using WtapFlashcards.Api.Models;

namespace WtapFlashcards.Api.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class CardsController : ControllerBase
{
    private readonly AppDbContext _db;
    public CardsController(AppDbContext db) => _db = db;

    [HttpGet("decks/{deckId:guid}/cards")]
    public async Task<ActionResult<IEnumerable<CardResponse>>> ListForDeck(Guid deckId)
    {
        var userId = User.Id();
        var ownsDeck = await _db.Decks.AnyAsync(d => d.Id == deckId && d.OwnerId == userId);
        if (!ownsDeck) return NotFound();

        var cards = await _db.Cards
            .Where(c => c.DeckId == deckId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CardResponse(c.Id, c.DeckId, c.Question, c.Answer, c.CreatedAt))
            .ToListAsync();
        return Ok(cards);
    }

    [HttpPost("decks/{deckId:guid}/cards")]
    public async Task<ActionResult<CardResponse>> Create(Guid deckId, CreateCardRequest req)
    {
        var userId = User.Id();
        var ownsDeck = await _db.Decks.AnyAsync(d => d.Id == deckId && d.OwnerId == userId);
        if (!ownsDeck) return NotFound();

        var card = new Card
        {
            DeckId = deckId,
            Question = req.Question.Trim(),
            Answer = req.Answer.Trim()
        };
        _db.Cards.Add(card);
        await _db.SaveChangesAsync();
        return Ok(new CardResponse(card.Id, card.DeckId, card.Question, card.Answer, card.CreatedAt));
    }

    [HttpPatch("cards/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateCardRequest req)
    {
        var userId = User.Id();
        var card = await _db.Cards
            .Include(c => c.Deck)
            .FirstOrDefaultAsync(c => c.Id == id && c.Deck.OwnerId == userId);
        if (card is null) return NotFound();

        if (req.Question is not null) card.Question = req.Question.Trim();
        if (req.Answer is not null) card.Answer = req.Answer.Trim();
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("cards/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = User.Id();
        var card = await _db.Cards
            .Include(c => c.Deck)
            .FirstOrDefaultAsync(c => c.Id == id && c.Deck.OwnerId == userId);
        if (card is null) return NotFound();
        _db.Cards.Remove(card);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
