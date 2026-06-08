using System.ComponentModel.DataAnnotations;

namespace WtapFlashcards.Api.DTOs;

public record CardResponse(
    Guid Id,
    Guid DeckId,
    string Question,
    string Answer,
    DateTime CreatedAt);

public record CreateCardRequest(
    [Required, MaxLength(500)] string Question,
    [Required, MaxLength(2000)] string Answer);

public record UpdateCardRequest(
    [MaxLength(500)] string? Question,
    [MaxLength(2000)] string? Answer);
