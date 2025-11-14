using System.ComponentModel.DataAnnotations;

namespace RetailPositions.Application.DTOs;

/// <summary>
/// Payload for updating brand.
/// </summary>
public class UpdateBrandRequest : CreateBrandRequest
{
    [Required]
    public Guid Id { get; set; }
}
