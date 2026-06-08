using System.ComponentModel.DataAnnotations;

namespace WtapFlashcards.Api.DTOs;

public record DeckResponse(
    Guid Id,
    string Name,
    string Description,
    string Color,
    DateTime CreatedAt,
    int CardCount);

public record CreateDeckRequest(
    [Required, MaxLength(100)] string Name,
    [MaxLength(200)] string? Description,
    [MaxLength(20)] string? Color);

public record UpdateDeckRequest(
    [MaxLength(100)] string? Name,
    [MaxLength(200)] string? Description,
    [MaxLength(20)] string? Color);
