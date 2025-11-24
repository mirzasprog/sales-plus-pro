namespace RetailPositions.Application.DTOs;

/// <summary>
/// Filters that can be applied to dashboard level aggregations.
/// </summary>
public class DashboardFilterDto
{
    public string? Region { get; set; }
    public Guid? StoreId { get; set; }
    public Guid? SupplierId { get; set; }
    public string? PositionType { get; set; }
}
