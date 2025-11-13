using RetailPositions.Domain.Enums;

namespace RetailPositions.Domain.Entities;

/// <summary>
/// Represents an additional sales position available for leasing by brands.
/// </summary>
public class AdditionalPosition : BaseEntity
{
    public Guid RetailObjectId { get; set; }
    public RetailObject? RetailObject { get; set; }
    public string Name { get; set; } = string.Empty;
    public string PositionType { get; set; } = string.Empty;
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public PositionStatus Status { get; set; } = PositionStatus.Available;
    public ICollection<BrandLease> Leases { get; set; } = new HashSet<BrandLease>();
    public ICollection<PositionAttachment> Attachments { get; set; } = new HashSet<PositionAttachment>();
    public ICollection<PositionStatusHistory> StatusHistory { get; set; } = new HashSet<PositionStatusHistory>();
    public Guid? FloorLayoutId { get; set; }
    public FloorLayout? FloorLayout { get; set; }
    public Guid? LayoutElementId { get; set; }
    public LayoutElement? LayoutElement { get; set; }
}
