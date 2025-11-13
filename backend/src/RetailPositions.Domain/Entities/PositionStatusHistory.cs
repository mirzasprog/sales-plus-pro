using RetailPositions.Domain.Enums;

namespace RetailPositions.Domain.Entities;

/// <summary>
/// Tracks changes of position status over time.
/// </summary>
public class PositionStatusHistory : BaseEntity
{
    public Guid AdditionalPositionId { get; set; }
    public AdditionalPosition? AdditionalPosition { get; set; }
    public PositionStatus Status { get; set; }
    public DateTime EffectiveFromUtc { get; set; }
    public DateTime? EffectiveToUtc { get; set; }
    public string Comment { get; set; } = string.Empty;
}
