using System.ComponentModel.DataAnnotations;

namespace WtapFlashcards.Api.DTOs;

public record GenerateCardsRequest(
    [Required] Guid DeckId,
    [Required, MinLength(20), MaxLength(20000)] string Notes);

public record GeneratedCardDto(string Question, string Answer);

public record GenerateCardsResponse(int Created, IReadOnlyList<CardResponse> Cards);
