using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using WtapFlashcards.Api.Auth;
using WtapFlashcards.Api.DTOs;
using WtapFlashcards.Api.Models;

namespace WtapFlashcards.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _users;
    private readonly SignInManager<AppUser> _signIn;
    private readonly IJwtTokenService _tokens;

    public AuthController(UserManager<AppUser> users, SignInManager<AppUser> signIn, IJwtTokenService tokens)
    {
        _users = users;
        _signIn = signIn;
        _tokens = tokens;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        var existing = await _users.FindByEmailAsync(req.Email);
        // Generic message — don't leak whether the email is registered
        if (existing is not null)
            return BadRequest(new { error = "Registration failed." });

        var user = new AppUser { UserName = req.Email, Email = req.Email };
        var result = await _users.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(new { error = "Registration failed.", details = result.Errors.Select(e => e.Description) });

        var token = _tokens.CreateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Email!));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = await _users.FindByEmailAsync(req.Email);
        if (user is null)
            return Unauthorized(new { error = "Invalid credentials." });

        var ok = await _signIn.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: true);
        if (!ok.Succeeded)
            return Unauthorized(new { error = "Invalid credentials." });

        var token = _tokens.CreateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Email!));
    }
}
