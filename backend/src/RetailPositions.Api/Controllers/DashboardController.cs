using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailPositions.Application.Services;

namespace RetailPositions.Api.Controllers;

/// <summary>
/// Dashboard metrics endpoints.
/// </summary>
[Authorize]
public class DashboardController : BaseApiController
{
    private readonly DashboardService _service;

    public DashboardController(DashboardService service)
    {
        _service = service;
    }

    /// <summary>
    /// Returns summary metrics for the current tenant.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummaryAsync(CancellationToken cancellationToken)
        => Ok(await _service.GetGlobalSummaryAsync(cancellationToken));

    /// <summary>
    /// Returns occupancy, revenue and expiring contract KPIs per store.
    /// </summary>
    [HttpGet("stores")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStoreMetricsAsync([FromQuery] int expiringInDays = 30, CancellationToken cancellationToken = default)
        => Ok(await _service.GetStoreMetricsAsync(expiringInDays, cancellationToken));

    /// <summary>
    /// Returns active contract metrics grouped by supplier.
    /// </summary>
    [HttpGet("suppliers")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSupplierMetricsAsync(CancellationToken cancellationToken)
        => Ok(await _service.GetSupplierMetricsAsync(cancellationToken));
}
