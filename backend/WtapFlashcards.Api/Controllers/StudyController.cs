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
[Route("api/study")]
public class StudyController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ISrsService _srs;

    public StudyController(AppDbContext db, ISrsService srs)
    {
        _db = db;
        _srs = srs;
    }

    // Returns due cards for a deck: existing reviews due now + cards never seen yet.
    [HttpGet("{deckId:guid}/due")]
    public async Task<ActionResult<IEnumerable<DueCardResponse>>> Due(Guid deckId, [FromQuery] int limit = 20)
    {
        var userId = User.Id();
        var ownsDeck = await _db.Decks.AnyAsync(d => d.Id == deckId && d.OwnerId == userId);
        if (!ownsDeck) return NotFound();

        var now = DateTime.UtcNow;

        // Cards in this deck that already have a review for this user
        var reviewed = await _db.CardReviews
            .Where(r => r.UserId == userId && r.Card.DeckId == deckId && r.DueAt <= now)
            .OrderBy(r => r.DueAt)
            .Take(limit)
            .Select(r => new DueCardResponse(
                r.CardId, r.Card.DeckId, r.Card.Question, r.Card.Answer,
                r.DueAt, r.IntervalDays, r.EaseFactor, r.Repetitions))
            .ToListAsync();

        var remaining = limit - reviewed.Count;
        if (remaining <= 0) return Ok(reviewed);

        // Brand-new cards: no review row yet
        var newOnes = await _db.Cards
            .Where(c => c.DeckId == deckId && !c.Reviews.Any(r => r.UserId == userId))
            .OrderBy(c => c.CreatedAt)
            .Take(remaining)
            .Select(c => new DueCardResponse(c.Id, c.DeckId, c.Question, c.Answer, now, 0, 2.5, 0))
            .ToListAsync();

        return Ok(reviewed.Concat(newOnes));
    }

    [HttpPost("review")]
    public async Task<IActionResult> Review(ReviewRequest req)
    {
        var userId = User.Id();

        // Verify the card belongs to a deck this user owns
        var card = await _db.Cards
            .Include(c => c.Deck)
            .FirstOrDefaultAsync(c => c.Id == req.CardId && c.Deck.OwnerId == userId);
        if (card is null) return NotFound();

        var review = await _db.CardReviews
            .FirstOrDefaultAsync(r => r.UserId == userId && r.CardId == req.CardId);

        if (review is null)
        {
            review = new CardReview { UserId = userId, CardId = req.CardId };
            _db.CardReviews.Add(review);
        }

        _srs.ApplyRating(review, req.Rating, DateTime.UtcNow);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            review.CardId,
            review.DueAt,
            review.IntervalDays,
            review.EaseFactor,
            review.Repetitions
        });
    }

    [HttpGet("{deckId:guid}/stats")]
    public async Task<ActionResult<StudyStatsResponse>> Stats(Guid deckId)
    {
        var userId = User.Id();
        var ownsDeck = await _db.Decks.AnyAsync(d => d.Id == deckId && d.OwnerId == userId);
        if (!ownsDeck) return NotFound();

        var now = DateTime.UtcNow;
        var dueNow = await _db.CardReviews.CountAsync(r => r.UserId == userId && r.Card.DeckId == deckId && r.DueAt <= now);
        var learnedTotal = await _db.CardReviews.CountAsync(r => r.UserId == userId && r.Card.DeckId == deckId && r.Repetitions > 0);
        var newCards = await _db.Cards.CountAsync(c => c.DeckId == deckId && !c.Reviews.Any(r => r.UserId == userId));

        return Ok(new StudyStatsResponse(dueNow + newCards, learnedTotal, newCards));
    }
}
