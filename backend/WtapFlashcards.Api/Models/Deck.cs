using System.ComponentModel.DataAnnotations;

namespace WtapFlashcards.Api.Models;

public class Deck
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Color { get; set; } = "violet";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public string OwnerId { get; set; } = string.Empty;
    public AppUser Owner { get; set; } = null!;

    public ICollection<Card> Cards { get; set; } = new List<Card>();
}
