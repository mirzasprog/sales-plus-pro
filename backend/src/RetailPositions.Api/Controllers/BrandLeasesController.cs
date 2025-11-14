using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailPositions.Application.DTOs;
using RetailPositions.Application.Services;

namespace RetailPositions.Api.Controllers;

/// <summary>
/// Endpoints for managing leases.
/// </summary>
[Authorize(Roles = "Admin,StoreManager")]
public class BrandLeasesController : BaseApiController
{
    private readonly BrandLeaseService _service;

    public BrandLeasesController(BrandLeaseService service)
    {
        _service = service;
    }

    /// <summary>
    /// Returns all leases.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<BrandLeaseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAsync(CancellationToken cancellationToken)
        => Ok(await _service.GetAsync(cancellationToken));

    /// <summary>
    /// Returns lease by id.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(BrandLeaseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>
    /// Creates new lease.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(BrandLeaseDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateAsync([FromBody] CreateBrandLeaseRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(request, User.Identity?.Name ?? "system", cancellationToken);
        return CreatedAtAction(nameof(GetByIdAsync), new { id = result.Id }, result);
    }

    /// <summary>
    /// Updates lease.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateAsync(Guid id, [FromBody] UpdateBrandLeaseRequest request, CancellationToken cancellationToken)
    {
        if (id != request.Id)
        {
            return BadRequest("Route id mismatch");
        }

        await _service.UpdateAsync(request, User.Identity?.Name ?? "system", cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Deletes lease by id.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        await _service.DeleteAsync(id, User.Identity?.Name ?? "system", cancellationToken);
        return NoContent();
    }
}
