using System.ComponentModel.DataAnnotations;

namespace WtapFlashcards.Api.Models;

public class Card
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(500)]
    public string Question { get; set; } = string.Empty;

    [Required, MaxLength(2000)]
    public string Answer { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid DeckId { get; set; }
    public Deck Deck { get; set; } = null!;

    public ICollection<CardReview> Reviews { get; set; } = new List<CardReview>();
}
