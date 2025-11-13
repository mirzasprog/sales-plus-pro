using System.ComponentModel.DataAnnotations;

namespace RetailPositions.Application.DTOs;

/// <summary>
/// Request payload for creating additional sales position.
/// </summary>
public class CreateAdditionalPositionRequest
{
    [Required]
    public Guid RetailObjectId { get; set; }

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string PositionType { get; set; } = string.Empty;

    [Range(0.01, 9999)]
    public decimal Width { get; set; }

    [Range(0.01, 9999)]
    public decimal Height { get; set; }
}
