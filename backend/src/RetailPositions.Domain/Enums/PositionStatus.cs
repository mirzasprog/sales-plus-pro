namespace RetailPositions.Domain.Enums;

/// <summary>
/// Represents current state of an additional sales position.
/// </summary>
public enum PositionStatus
{
    Available = 0,
    Reserved = 1,
    Occupied = 2,
    ExpiringSoon = 3,
    Inactive = 4
}
