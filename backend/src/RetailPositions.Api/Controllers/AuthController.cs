using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailPositions.Application.DTOs;
using RetailPositions.Application.Services;

namespace RetailPositions.Api.Controllers;

/// <summary>
/// Authentication endpoints.
/// </summary>
[AllowAnonymous]
public class AuthController : BaseApiController
{
    private readonly AuthService _service;

    public AuthController(AuthService service)
    {
        _service = service;
    }

    /// <summary>
    /// Performs login and returns JWT token.
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> LoginAsync([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var response = await _service.LoginAsync(request, cancellationToken);
        return Ok(response);
    }
}
