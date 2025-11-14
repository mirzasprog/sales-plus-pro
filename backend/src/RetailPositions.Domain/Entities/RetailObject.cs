using RetailPositions.Domain.ValueObjects;

namespace RetailPositions.Domain.Entities;

/// <summary>
/// Represents a single store or supermarket object.
/// </summary>
public class RetailObject : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Address Address { get; set; } = new();
    public ICollection<FloorLayout> Layouts { get; set; } = new HashSet<FloorLayout>();
    public ICollection<AdditionalPosition> AdditionalPositions { get; set; } = new HashSet<AdditionalPosition>();
}
