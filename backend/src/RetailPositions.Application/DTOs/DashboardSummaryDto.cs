namespace RetailPositions.Application.DTOs;

/// <summary>
/// Aggregated KPIs shown on the dashboard.
/// </summary>
public record DashboardSummaryDto(
    int TotalPositions,
    int AvailablePositions,
    int OccupiedPositions,
    int ReservedPositions,
    int ExpiringSoonPositions,
    int InactivePositions,
    int ExpiringContracts,
    decimal CoveragePercent,
    IReadOnlyCollection<SupplierMetricsDto> TopSuppliers,
    IReadOnlyCollection<ExpiringContractDto> ExpiringContractsList);

/// <summary>
/// Represents a contract that is nearing expiry used by dashboard widgets.
/// </summary>
public record ExpiringContractDto(
    Guid Id,
    string Supplier,
    string Store,
    string Position,
    DateTime EndDate,
    decimal Value);
