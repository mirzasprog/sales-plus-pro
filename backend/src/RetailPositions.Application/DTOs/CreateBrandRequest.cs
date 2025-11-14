using System.ComponentModel.DataAnnotations;

namespace RetailPositions.Application.DTOs;

/// <summary>
/// Payload for creating brand.
/// </summary>
public class CreateBrandRequest
{
    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Category { get; set; } = string.Empty;
}
