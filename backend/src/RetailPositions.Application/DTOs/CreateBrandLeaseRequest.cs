using System.ComponentModel.DataAnnotations;
using RetailPositions.Domain.Enums;

namespace RetailPositions.Application.DTOs;

/// <summary>
/// Request payload for creating a new lease.
/// </summary>
public class CreateBrandLeaseRequest
{
    [Required]
    public Guid AdditionalPositionId { get; set; }

    [Required]
    public Guid BrandId { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    [Range(0, 999999)]
    public decimal Price { get; set; }

    [Required]
    public PositionStatus Status { get; set; }

    [MaxLength(1024)]
    public string? Notes { get; set; }
}
