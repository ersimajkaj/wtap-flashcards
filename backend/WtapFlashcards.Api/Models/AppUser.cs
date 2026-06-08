using Microsoft.AspNetCore.Identity;

namespace WtapFlashcards.Api.Models;

public class AppUser : IdentityUser
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Deck> Decks { get; set; } = new List<Deck>();
    public ICollection<CardReview> Reviews { get; set; } = new List<CardReview>();
}
