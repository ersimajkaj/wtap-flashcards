using System.Security.Claims;

namespace WtapFlashcards.Api.Auth;

// Thin helper used by controllers to grab the authenticated user's id
public static class CurrentUser
{
    public static string Id(this ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? principal.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
        ?? throw new UnauthorizedAccessException("Missing user id claim");
}
