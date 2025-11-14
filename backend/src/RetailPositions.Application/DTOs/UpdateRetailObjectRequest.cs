using System.ComponentModel.DataAnnotations;

namespace RetailPositions.Application.DTOs;

/// <summary>
/// Request payload for updating retail object.
/// </summary>
public class UpdateRetailObjectRequest : CreateRetailObjectRequest
{
    [Required]
    public Guid Id { get; set; }
}
