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
}
