using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using RetailPositions.Application.DTOs;
using RetailPositions.Infrastructure.Identity;
using RetailPositions.Domain.Repositories;

namespace RetailPositions.Application.Services;

/// <summary>
/// Handles authentication and JWT token generation.
/// </summary>
public class AuthService
{
    private readonly IRepository<ApplicationUser> _users;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IRepository<ApplicationUser> users, IConfiguration configuration, ILogger<AuthService> logger)
    {
        _users = users;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _users.Query().FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Invalid login attempt for {Email}", request.Email);
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT key not configured"));
        var expires = DateTime.UtcNow.AddHours(8);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Email, user.Email)
            }),
            Expires = expires,
            Issuer = _configuration["Jwt:Issuer"],
            Audience = _configuration["Jwt:Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var serialized = tokenHandler.WriteToken(token);
        return new AuthResponse(serialized, expires, user.Role, user.DisplayName);
    }
}
