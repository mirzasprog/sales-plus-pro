namespace RetailPositions.Domain.Entities;

/// <summary>
/// Represents a marketing brand that can lease retail positions.
/// </summary>
public class Brand : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public ICollection<BrandLease> Leases { get; set; } = new HashSet<BrandLease>();
}
