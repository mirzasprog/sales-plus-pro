namespace RetailPositions.Application.DTOs;

/// <summary>
/// Response model for brand entity.
/// </summary>
public record BrandDto(Guid Id, string Name, string Category, int ActiveLeases);
