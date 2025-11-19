using RetailPositions.Domain.Entities;

namespace RetailPositions.Infrastructure.Identity;

/// <summary>
/// Represents application user for authentication.
/// </summary>
public class ApplicationUser : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public bool IsActive { get; set; } = true;
}
