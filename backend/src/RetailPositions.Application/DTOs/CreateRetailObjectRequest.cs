using System.ComponentModel.DataAnnotations;

namespace RetailPositions.Application.DTOs;

/// <summary>
/// Request payload for creating new retail object.
/// </summary>
public class CreateRetailObjectRequest
{
    [Required]
    [MaxLength(64)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Street { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string City { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string PostalCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Country { get; set; } = string.Empty;
}
