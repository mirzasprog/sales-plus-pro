using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailPositions.Application.DTOs;
using RetailPositions.Application.Services;

namespace RetailPositions.Api.Controllers;

/// <summary>
/// Exposes CRUD operations for retail objects.
/// </summary>
[Authorize(Roles = "Admin")]
public class RetailObjectsController : BaseApiController
{
    private readonly RetailObjectService _service;

    public RetailObjectsController(RetailObjectService service)
    {
        _service = service;
    }

    /// <summary>
    /// Returns paginated list of retail objects.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<RetailObjectDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAsync(CancellationToken cancellationToken)
        => Ok(await _service.GetAsync(cancellationToken));

    /// <summary>
    /// Returns single retail object by id.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(RetailObjectDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>
    /// Creates new retail object.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(RetailObjectDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateAsync([FromBody] CreateRetailObjectRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(request, User.Identity?.Name ?? "system", cancellationToken);
        return CreatedAtAction(nameof(GetByIdAsync), new { id = result.Id }, result);
    }

    /// <summary>
    /// Updates retail object.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAsync(Guid id, [FromBody] UpdateRetailObjectRequest request, CancellationToken cancellationToken)
    {
        if (id != request.Id)
        {
            return BadRequest("Route id mismatch");
        }

        await _service.UpdateAsync(request, User.Identity?.Name ?? "system", cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Deletes retail object by id.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        await _service.DeleteAsync(id, User.Identity?.Name ?? "system", cancellationToken);
        return NoContent();
    }
}
