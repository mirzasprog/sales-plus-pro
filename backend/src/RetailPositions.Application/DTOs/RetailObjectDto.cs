namespace RetailPositions.Application.DTOs;

/// <summary>
/// Represents a retail object returned by API.
/// </summary>
public record RetailObjectDto(Guid Id, string Code, string Name, string Street, string City, string PostalCode, string Country, int LayoutCount, int PositionCount);
