using RetailPositions.Domain.Enums;

namespace RetailPositions.Domain.Entities;

/// <summary>
/// Represents an element that can be placed on the layout canvas.
/// </summary>
public class LayoutElement : BaseEntity
{
    public Guid FloorLayoutId { get; set; }
    public FloorLayout? FloorLayout { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public decimal X { get; set; }
    public decimal Y { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public Guid? AdditionalPositionId { get; set; }
    public AdditionalPosition? AdditionalPosition { get; set; }
    public PositionStatus Status { get; set; } = PositionStatus.Available;
}
