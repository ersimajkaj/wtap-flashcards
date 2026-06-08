using System.ComponentModel.DataAnnotations;

namespace WtapFlashcards.Api.DTOs;

// 0=Again, 1=Hard, 2=Good, 3=Easy — mirrors Anki's four-button scheme
public enum ReviewRating { Again = 0, Hard = 1, Good = 2, Easy = 3 }

public record ReviewRequest(
    [Required] Guid CardId,
    [Required] ReviewRating Rating);

public record DueCardResponse(
    Guid CardId,
    Guid DeckId,
    string Question,
    string Answer,
    DateTime DueAt,
    int IntervalDays,
    double EaseFactor,
    int Repetitions);

public record StudyStatsResponse(
    int DueNow,
    int LearnedTotal,
    int NewCards);
