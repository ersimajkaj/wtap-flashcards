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
[Route("api/decks")]
public class DecksController : ControllerBase
{
    private readonly AppDbContext _db;
    public DecksController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DeckResponse>>> List()
    {
        var userId = User.Id();
        var decks = await _db.Decks
            .Where(d => d.OwnerId == userId)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new DeckResponse(d.Id, d.Name, d.Description, d.Color, d.CreatedAt, d.Cards.Count))
            .ToListAsync();
        return Ok(decks);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DeckResponse>> Get(Guid id)
    {
        var userId = User.Id();
        var deck = await _db.Decks
            .Where(d => d.Id == id && d.OwnerId == userId)
            .Select(d => new DeckResponse(d.Id, d.Name, d.Description, d.Color, d.CreatedAt, d.Cards.Count))
            .FirstOrDefaultAsync();
        return deck is null ? NotFound() : Ok(deck);
    }

    [HttpPost]
    public async Task<ActionResult<DeckResponse>> Create(CreateDeckRequest req)
    {
        var deck = new Deck
        {
            OwnerId = User.Id(),
            Name = req.Name.Trim(),
            Description = req.Description?.Trim() ?? string.Empty,
            Color = string.IsNullOrWhiteSpace(req.Color) ? "violet" : req.Color
        };
        _db.Decks.Add(deck);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = deck.Id },
            new DeckResponse(deck.Id, deck.Name, deck.Description, deck.Color, deck.CreatedAt, 0));
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateDeckRequest req)
    {
        var userId = User.Id();
        var deck = await _db.Decks.FirstOrDefaultAsync(d => d.Id == id && d.OwnerId == userId);
        if (deck is null) return NotFound();

        if (req.Name is not null) deck.Name = req.Name.Trim();
        if (req.Description is not null) deck.Description = req.Description.Trim();
        if (req.Color is not null) deck.Color = req.Color;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = User.Id();
        var deck = await _db.Decks.FirstOrDefaultAsync(d => d.Id == id && d.OwnerId == userId);
        if (deck is null) return NotFound();
        _db.Decks.Remove(deck);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
