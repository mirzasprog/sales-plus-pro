using System.ComponentModel.DataAnnotations;

namespace RetailPositions.Application.DTOs;

/// <summary>
/// Request payload for updating lease.
/// </summary>
public class UpdateBrandLeaseRequest : CreateBrandLeaseRequest
{
    [Required]
    public Guid Id { get; set; }
}
