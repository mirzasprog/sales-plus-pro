using RetailPositions.Domain.Enums;

namespace RetailPositions.Application.DTOs;

/// <summary>
/// DTO for additional position entity.
/// </summary>
public record AdditionalPositionDto(
    Guid Id,
    Guid RetailObjectId,
    string RetailObjectName,
    string Name,
    string PositionType,
    decimal Width,
    decimal Height,
    PositionStatus Status,
    int ActiveLeases,
    DateTime? LeaseStart,
    DateTime? LeaseEnd);
