namespace RetailPositions.Domain.ValueObjects;

/// <summary>
/// Represents postal address of a retail object.
/// </summary>
public class Address
{
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}
