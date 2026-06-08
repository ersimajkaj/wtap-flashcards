using WtapFlashcards.Api.DTOs;
using WtapFlashcards.Api.Models;

namespace WtapFlashcards.Api.Services;

// SM-2 algorithm. Inputs are the existing review state and a 0..3 rating; output is the new state.
public interface ISrsService
{
    void ApplyRating(CardReview review, ReviewRating rating, DateTime now);
}

public class SrsService : ISrsService
{
    private const double MinEase = 1.3;

    public void ApplyRating(CardReview review, ReviewRating rating, DateTime now)
    {
        // Quality scale: Again=2, Hard=3, Good=4, Easy=5 (SM-2 uses 0..5; we collapse <3 into "lapse")
        var quality = rating switch
        {
            ReviewRating.Again => 2,
            ReviewRating.Hard => 3,
            ReviewRating.Good => 4,
            ReviewRating.Easy => 5,
            _ => 4
        };

        if (quality < 3)
        {
            // Lapse: reset progress, schedule for today
            review.Repetitions = 0;
            review.IntervalDays = 0;
        }
        else
        {
            review.Repetitions += 1;
            review.IntervalDays = review.Repetitions switch
            {
                1 => 1,
                2 => 6,
                _ => Math.Max(1, (int)Math.Round(review.IntervalDays * review.EaseFactor))
            };
        }

        // Update ease factor (SM-2 formula)
        var delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
        review.EaseFactor = Math.Max(MinEase, review.EaseFactor + delta);

        review.LastReviewedAt = now;
        review.DueAt = now.AddDays(review.IntervalDays);
    }
}
