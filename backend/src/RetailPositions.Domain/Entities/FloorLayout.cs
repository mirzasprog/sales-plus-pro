namespace RetailPositions.Domain.Entities;

/// <summary>
/// Represents a 2D layout of a retail object level.
/// </summary>
public class FloorLayout : BaseEntity
{
    public Guid RetailObjectId { get; set; }
    public RetailObject? RetailObject { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Level { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public ICollection<LayoutElement> Elements { get; set; } = new HashSet<LayoutElement>();
}
