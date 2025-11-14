using System.ComponentModel.DataAnnotations;
using RetailPositions.Domain.Enums;

namespace RetailPositions.Application.DTOs;

/// <summary>
/// Request payload for updating additional sales position.
/// </summary>
public class UpdateAdditionalPositionRequest : CreateAdditionalPositionRequest
{
    [Required]
    public Guid Id { get; set; }

    [Required]
    public PositionStatus Status { get; set; }
}
