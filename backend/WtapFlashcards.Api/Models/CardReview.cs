namespace WtapFlashcards.Api.Models;

// Per-user, per-card SM-2 state. A user only has a review row once they've seen a card.
public class CardReview
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;

    public Guid CardId { get; set; }
    public Card Card { get; set; } = null!;

    // SM-2 fields
    public double EaseFactor { get; set; } = 2.5;
    public int IntervalDays { get; set; } = 0;
    public int Repetitions { get; set; } = 0;
    public DateTime DueAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastReviewedAt { get; set; }
}
