namespace RetailPositions.Application.DTOs;

/// <summary>
/// Aggregated metrics for a supplier/brand.
/// </summary>
public record SupplierMetricsDto(
    Guid Id,
    string Name,
    string Category,
    int ActiveContracts,
    int ActiveStores,
    int ActivePositions,
    decimal ActiveRevenue,
    DateTime? NextExpiry);
