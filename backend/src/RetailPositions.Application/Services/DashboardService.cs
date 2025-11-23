using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RetailPositions.Application.DTOs;
using RetailPositions.Application.Interfaces;
using RetailPositions.Domain.Entities;
using RetailPositions.Domain.Enums;

namespace RetailPositions.Application.Services;

/// <summary>
/// Aggregates KPIs used by dashboards.
/// </summary>
public class DashboardService
{
    private readonly IRepository<AdditionalPosition> _positions;
    private readonly IRepository<BrandLease> _leases;
    private readonly IRepository<RetailObject> _stores;
    private readonly IRepository<Brand> _brands;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(
        IRepository<AdditionalPosition> positions,
        IRepository<BrandLease> leases,
        IRepository<RetailObject> stores,
        IRepository<Brand> brands,
        ILogger<DashboardService> logger)
    {
        _positions = positions;
        _leases = leases;
        _stores = stores;
        _brands = brands;
        _logger = logger;
    }

    public async Task<object> GetGlobalSummaryAsync(CancellationToken cancellationToken = default)
    {
        var positions = await _positions.GetAsync(include: query => query.Include(x => x.Leases), cancellationToken: cancellationToken);
        var leases = await _leases.GetAsync(cancellationToken: cancellationToken);
        var now = DateTime.UtcNow;

        var response = new
        {
            totalPositions = positions.Count,
            available = positions.Count(p => p.Status == PositionStatus.Available),
            occupied = positions.Count(p => p.Status == PositionStatus.Occupied),
            expiringSoon = leases.Count(l => l.EndDate <= now.AddDays(7) && l.EndDate >= now),
            inactive = positions.Count(p => p.Status == PositionStatus.Inactive),
            revenueYtd = leases.Where(l => l.StartDate.Year == now.Year).Sum(l => l.Price)
        };

        _logger.LogDebug("Dashboard summary calculated");
        return response;
    }

    public async Task<IReadOnlyCollection<StoreMetricsDto>> GetStoreMetricsAsync(int expiringInDays = 30, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var expiryThreshold = now.AddDays(expiringInDays);

        var stores = await _stores.GetAsync(
            include: query => query
                .Include(x => x.AdditionalPositions)
                    .ThenInclude(p => p.Leases)
                .Include(x => x.Layouts),
            cancellationToken: cancellationToken);

        var response = stores.Select(store =>
        {
            var allLeases = store.AdditionalPositions.SelectMany(p => p.Leases).ToList();
            var activeLeases = allLeases.Where(l => l.StartDate <= now && l.EndDate >= now).ToList();

            return new StoreMetricsDto(
                store.Id,
                store.Code,
                store.Name,
                store.Address.Street,
                store.Address.City,
                store.AdditionalPositions.Count,
                store.AdditionalPositions.Count(p => p.Status == PositionStatus.Occupied),
                store.AdditionalPositions.Count(p => p.Status == PositionStatus.Available),
                store.AdditionalPositions.Count(p => p.Status == PositionStatus.Reserved),
                store.AdditionalPositions.Count(p => p.Status == PositionStatus.Inactive),
                activeLeases.Count(l => l.EndDate <= expiryThreshold),
                activeLeases.Sum(l => l.Price),
                store.Layouts.Count);
        }).ToList();

        _logger.LogDebug("Store metrics calculated for {Count} stores", response.Count);
        return response;
    }

    public async Task<IReadOnlyCollection<SupplierMetricsDto>> GetSupplierMetricsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var brands = await _brands.GetAsync(
            include: query => query.Include(x => x.Leases).ThenInclude(l => l.AdditionalPosition),
            cancellationToken: cancellationToken);

        var response = brands.Select(brand =>
        {
            var activeLeases = brand.Leases.Where(l => l.StartDate <= now && l.EndDate >= now).ToList();
            var nextExpiry = activeLeases.OrderBy(l => l.EndDate).Select(l => (DateTime?)l.EndDate).FirstOrDefault();
            var activeStoreIds = activeLeases.Select(l => l.AdditionalPosition?.RetailObjectId).Where(id => id.HasValue).Distinct().Count();

            return new SupplierMetricsDto(
                brand.Id,
                brand.Name,
                brand.Category,
                activeLeases.Count,
                activeStoreIds,
                activeLeases.Select(l => l.AdditionalPositionId).Distinct().Count(),
                activeLeases.Sum(l => l.Price),
                nextExpiry);
        }).ToList();

        _logger.LogDebug("Supplier metrics calculated for {Count} suppliers", response.Count);
        return response;
    }
}
