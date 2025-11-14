using RetailPositions.Domain.Enums;

namespace RetailPositions.Domain.Entities;

/// <summary>
/// Represents a lease of an additional position by a brand.
/// </summary>
public class BrandLease : BaseEntity
{
    public Guid AdditionalPositionId { get; set; }
    public AdditionalPosition? AdditionalPosition { get; set; }
    public Guid BrandId { get; set; }
    public Brand? Brand { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Price { get; set; }
    public PositionStatus Status { get; set; }
    public string? Notes { get; set; }
}
