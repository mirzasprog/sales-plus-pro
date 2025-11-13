using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailPositions.Application.DTOs;
using RetailPositions.Application.Services;

namespace RetailPositions.Api.Controllers;

/// <summary>
/// Handles CRUD operations for additional positions.
/// </summary>
[Authorize]
public class AdditionalPositionsController : BaseApiController
{
    private readonly AdditionalPositionService _service;

    public AdditionalPositionsController(AdditionalPositionService service)
    {
        _service = service;
    }

    /// <summary>
    /// Returns all additional positions.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<AdditionalPositionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAsync(CancellationToken cancellationToken)
        => Ok(await _service.GetAsync(cancellationToken));

    /// <summary>
    /// Returns additional position by id.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AdditionalPositionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>
    /// Creates additional position.
    /// </summary>
    [Authorize(Roles = "Admin,StoreManager")]
    [HttpPost]
    [ProducesResponseType(typeof(AdditionalPositionDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateAsync([FromBody] CreateAdditionalPositionRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(request, User.Identity?.Name ?? "system", cancellationToken);
        return CreatedAtAction(nameof(GetByIdAsync), new { id = result.Id }, result);
    }

    /// <summary>
    /// Updates additional position.
    /// </summary>
    [Authorize(Roles = "Admin,StoreManager")]
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateAsync(Guid id, [FromBody] UpdateAdditionalPositionRequest request, CancellationToken cancellationToken)
    {
        if (id != request.Id)
        {
            return BadRequest("Route id mismatch");
        }

        await _service.UpdateAsync(request, User.Identity?.Name ?? "system", cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Deletes additional position.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        await _service.DeleteAsync(id, User.Identity?.Name ?? "system", cancellationToken);
        return NoContent();
    }
}
