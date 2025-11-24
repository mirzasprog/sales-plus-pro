using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailPositions.Application.DTOs;
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
    public async Task<IActionResult> GetSummaryAsync([FromQuery] DashboardFilterDto? filter, CancellationToken cancellationToken)
        => Ok(await _service.GetGlobalSummaryAsync(filter, cancellationToken));

    /// <summary>
    /// Returns occupancy, revenue and expiring contract KPIs per store.
    /// </summary>
    [HttpGet("stores")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStoreMetricsAsync([FromQuery] int expiringInDays = 30, [FromQuery] DashboardFilterDto? filter = null, CancellationToken cancellationToken = default)
        => Ok(await _service.GetStoreMetricsAsync(expiringInDays, filter, cancellationToken));

    /// <summary>
    /// Returns active contract metrics grouped by supplier.
    /// </summary>
    [HttpGet("suppliers")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSupplierMetricsAsync([FromQuery] DashboardFilterDto? filter, CancellationToken cancellationToken)
        => Ok(await _service.GetSupplierMetricsAsync(filter, cancellationToken));
}
