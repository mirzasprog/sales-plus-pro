using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RetailPositions.Application.DTOs;
using RetailPositions.Application.Interfaces;
using RetailPositions.Domain.Entities;
using RetailPositions.Domain.Enums;

namespace RetailPositions.Application.Services;

/// <summary>
/// Aggregates KPIs used by dashboards and list pages.
/// </summary>
public class DashboardService
{
    private readonly IRepository<RetailObject> _stores;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(IRepository<RetailObject> stores, ILogger<DashboardService> logger)
    {
        _stores = stores;
        _logger = logger;
    }

    public async Task<DashboardSummaryDto> GetGlobalSummaryAsync(DashboardFilterDto? filter = null, CancellationToken cancellationToken = default)
    {
        filter ??= new();

        var snapshot = await LoadSnapshotAsync(filter, cancellationToken);
        var now = snapshot.Now;

        // KPI: total, available, occupied, reserved, expiringSoon, inactive are simple counts by PositionStatus.
        var totalPositions = snapshot.Positions.Count;
        var available = snapshot.Positions.Count(p => p.Status == PositionStatus.Available);
        var occupied = snapshot.Positions.Count(p => p.Status == PositionStatus.Occupied);
        var reserved = snapshot.Positions.Count(p => p.Status == PositionStatus.Reserved);
        var expiringSoon = snapshot.Positions.Count(p => p.Status == PositionStatus.ExpiringSoon);
        var inactive = snapshot.Positions.Count(p => p.Status == PositionStatus.Inactive);

        // KPI: active leases are the ones where StartDate <= now <= EndDate; expiring contracts are active leases ending in <=45 days.
        var activeLeases = snapshot.Positions
            .SelectMany(p => p.Leases.Select(l => new { Lease = l, Position = p }))
            .Where(x => x.Lease.StartDate <= now && x.Lease.EndDate >= now)
            .ToList();

        var expiringContracts = activeLeases.Count(x => x.Lease.EndDate <= now.AddDays(45));

        // KPI: coverage = stores with at least one active position / total filtered stores (uses statuses Occupied/Reserved/ExpiringSoon as "active").
        var activeStoreCount = snapshot.Stores
            .Count(store => store.AdditionalPositions.Any(p => IsActiveForCoverage(p.Status)));
        var coverage = snapshot.Stores.Count == 0
            ? 0
            : Math.Round((decimal)activeStoreCount / snapshot.Stores.Count * 100, 2);

        var supplierMetrics = BuildSupplierMetrics(activeLeases);

        var expiringContractRows = activeLeases
            .Where(x => x.Lease.EndDate <= now.AddDays(45))
            .OrderBy(x => x.Lease.EndDate)
            .Select(x => new ExpiringContractDto(
                x.Lease.Id,
                x.Lease.Brand?.Name ?? "—",
                x.Position.RetailObject?.Name ?? "—",
                x.Position.Name,
                x.Lease.EndDate,
                x.Lease.Price))
            .ToList();

        _logger.LogDebug("Dashboard summary calculated for {TotalPositions} positions", totalPositions);
        return new DashboardSummaryDto(
            totalPositions,
            available,
            occupied,
            reserved,
            expiringSoon,
            inactive,
            expiringContracts,
            coverage,
            supplierMetrics.Take(5).ToList(),
            expiringContractRows);
    }

    public async Task<IReadOnlyCollection<StoreMetricsDto>> GetStoreMetricsAsync(int expiringInDays = 30, DashboardFilterDto? filter = null, CancellationToken cancellationToken = default)
    {
        filter ??= new();
        var snapshot = await LoadSnapshotAsync(filter, cancellationToken);
        var now = snapshot.Now;
        var expiryThreshold = now.AddDays(expiringInDays);

        var response = snapshot.Stores.Select(store =>
        {
            var positions = snapshot.Positions.Where(p => p.RetailObjectId == store.Id).ToList();
            var leases = positions.SelectMany(p => p.Leases).Where(l => l.StartDate <= now && l.EndDate >= now).ToList();

            // KPI per store: counts per status and expiring leases by EndDate window.
            return new StoreMetricsDto(
                store.Id,
                store.Code,
                store.Name,
                store.Address.Street,
                store.Address.City,
                positions.Count,
                positions.Count(p => p.Status == PositionStatus.Occupied),
                positions.Count(p => p.Status == PositionStatus.Available),
                positions.Count(p => p.Status == PositionStatus.Reserved),
                positions.Count(p => p.Status == PositionStatus.Inactive),
                leases.Count(l => l.EndDate <= expiryThreshold),
                leases.Sum(l => l.Price),
                store.Layouts.Count);
        }).ToList();

        _logger.LogDebug("Store metrics calculated for {StoreCount} stores", response.Count);
        return response;
    }

    public async Task<IReadOnlyCollection<SupplierMetricsDto>> GetSupplierMetricsAsync(DashboardFilterDto? filter = null, CancellationToken cancellationToken = default)
    {
        filter ??= new();
        var snapshot = await LoadSnapshotAsync(filter, cancellationToken);
        var now = snapshot.Now;

        var activeLeases = snapshot.Positions
            .SelectMany(p => p.Leases.Select(l => new { Lease = l, Position = p }))
            .Where(x => x.Lease.StartDate <= now && x.Lease.EndDate >= now)
            .ToList();

        var metrics = BuildSupplierMetrics(activeLeases).ToList();
        _logger.LogDebug("Supplier metrics calculated for {SupplierCount} suppliers", metrics.Count);
        return metrics;
    }

    private async Task<(List<RetailObject> Stores, List<AdditionalPosition> Positions, DateTime Now)> LoadSnapshotAsync(DashboardFilterDto filter, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var stores = await _stores.GetAsync(
            include: query => query
                // eager-load everything used across KPI calculations
                .Include(x => x.Layouts)
                .Include(x => x.AdditionalPositions)
                    .ThenInclude(p => p.Leases)
                        .ThenInclude(l => l.Brand),
            cancellationToken: cancellationToken);

        var filteredStores = stores
            .Where(store => string.IsNullOrWhiteSpace(filter.Region) || store.Address.City.Equals(filter.Region, StringComparison.OrdinalIgnoreCase))
            .Where(store => !filter.StoreId.HasValue || store.Id == filter.StoreId)
            .ToList();

        var filteredPositions = filteredStores
            .SelectMany(store => store.AdditionalPositions)
            .Where(position => MatchesFilters(position, filter, now))
            .ToList();

        return (filteredStores, filteredPositions, now);
    }

    private static bool MatchesFilters(AdditionalPosition position, DashboardFilterDto filter, DateTime now)
    {
        var matchesType = string.IsNullOrWhiteSpace(filter.PositionType) || position.PositionType.Equals(filter.PositionType, StringComparison.OrdinalIgnoreCase);
        var matchesSupplier = !filter.SupplierId.HasValue || position.Leases.Any(l => l.BrandId == filter.SupplierId && l.StartDate <= now && l.EndDate >= now);
        return matchesType && matchesSupplier;
    }

    private static IEnumerable<SupplierMetricsDto> BuildSupplierMetrics(IEnumerable<dynamic> activeLeases)
    {
        /* LINQ equivalent SQL:
         * SELECT BrandId, COUNT(*) ActiveContracts, COUNT(DISTINCT PositionId) ActivePositions,
         * COUNT(DISTINCT StoreId) ActiveStores, SUM(Price) ActiveRevenue, MIN(EndDate) NextExpiry
         * FROM BrandLeases WHERE StartDate <= GETUTCDATE() AND EndDate >= GETUTCDATE() GROUP BY BrandId
         */
        return activeLeases
            .Where(x => x.Lease.BrandId != Guid.Empty)
            .GroupBy(x => x.Lease.BrandId)
            .Select(group => new SupplierMetricsDto(
                group.Key,
                group.First().Lease.Brand?.Name ?? "—",
                group.First().Lease.Brand?.Category ?? string.Empty,
                group.Count(),
                group.Select(x => x.Position.RetailObjectId).Distinct().Count(),
                group.Select(x => x.Position.Id).Distinct().Count(),
                group.Sum(x => x.Lease.Price),
                group.Min(x => (DateTime?)x.Lease.EndDate)))
            .OrderByDescending(x => x.ActiveRevenue);
    }

    private static bool IsActiveForCoverage(PositionStatus status)
        => status is PositionStatus.Occupied or PositionStatus.Reserved or PositionStatus.ExpiringSoon;
}
