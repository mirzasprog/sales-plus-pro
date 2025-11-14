using RetailPositions.Domain.Enums;

namespace RetailPositions.Application.DTOs;

/// <summary>
/// Represents lease details.
/// </summary>
public record BrandLeaseDto(
    Guid Id,
    Guid AdditionalPositionId,
    Guid BrandId,
    string BrandName,
    DateTime StartDate,
    DateTime EndDate,
    decimal Price,
    PositionStatus Status,
    string? Notes);
