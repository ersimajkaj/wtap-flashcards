using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using WtapFlashcards.Api.Models;

namespace WtapFlashcards.Api.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Deck> Decks => Set<Deck>();
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<CardReview> CardReviews => Set<CardReview>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Deck>(b =>
        {
            b.HasOne(d => d.Owner)
                .WithMany(u => u.Decks)
                .HasForeignKey(d => d.OwnerId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(d => d.OwnerId);
        });

        builder.Entity<Card>(b =>
        {
            b.HasOne(c => c.Deck)
                .WithMany(d => d.Cards)
                .HasForeignKey(c => c.DeckId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(c => c.DeckId);
        });

        builder.Entity<CardReview>(b =>
        {
            b.HasOne(r => r.User)
                .WithMany(u => u.Reviews)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(r => r.Card)
                .WithMany(c => c.Reviews)
                .HasForeignKey(r => r.CardId)
                .OnDelete(DeleteBehavior.Cascade);
            // One review row per (user, card) pair
            b.HasIndex(r => new { r.UserId, r.CardId }).IsUnique();
            b.HasIndex(r => new { r.UserId, r.DueAt });
        });
    }
}
