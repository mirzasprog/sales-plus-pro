using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(
        IRepository<AdditionalPosition> positions,
        IRepository<BrandLease> leases,
        ILogger<DashboardService> logger)
    {
        _positions = positions;
        _leases = leases;
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
}
