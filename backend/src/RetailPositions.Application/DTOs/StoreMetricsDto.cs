namespace RetailPositions.Application.DTOs;

/// <summary>
/// Aggregated metrics for a single retail object.
/// </summary>
public record StoreMetricsDto(
    Guid Id,
    string Code,
    string Name,
    string Street,
    string City,
    int TotalPositions,
    int Occupied,
    int Available,
    int Reserved,
    int Inactive,
    int ExpiringContracts,
    decimal ActiveRevenue,
    int LayoutCount);
