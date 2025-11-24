using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RetailPositions.Application.DTOs;
using RetailPositions.Application.Interfaces;
using RetailPositions.Application.Mapping;
using RetailPositions.Domain.Entities;
using RetailPositions.Domain.Enums;

namespace RetailPositions.Application.Services;

/// <summary>
/// Business logic for managing additional sales positions.
/// </summary>
public class AdditionalPositionService
{
    private readonly IRepository<AdditionalPosition> _positions;
    private readonly IRepository<PositionStatusHistory> _statusHistory;
    private readonly ILogger<AdditionalPositionService> _logger;

    public AdditionalPositionService(
        IRepository<AdditionalPosition> positions,
        IRepository<PositionStatusHistory> statusHistory,
        ILogger<AdditionalPositionService> logger)
    {
        _positions = positions;
        _statusHistory = statusHistory;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<AdditionalPositionDto>> GetAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _positions.GetAsync(include: query => query
            .Include(x => x.RetailObject)
            .Include(x => x.Leases)
                .ThenInclude(l => l.Brand), cancellationToken: cancellationToken);
        return entities.Select(e => e.ToDto()).ToList();
    }

    public async Task<AdditionalPositionDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = (await _positions.GetAsync(x => x.Id == id, query => query
            .Include(x => x.RetailObject)
            .Include(x => x.Leases)
                .ThenInclude(l => l.Brand), cancellationToken)).FirstOrDefault();
        return entity?.ToDto();
    }

    public async Task<AdditionalPositionDto> CreateAsync(CreateAdditionalPositionRequest request, string user, CancellationToken cancellationToken = default)
    {
        var entity = new AdditionalPosition
        {
            RetailObjectId = request.RetailObjectId,
            Name = request.Name,
            PositionType = request.PositionType,
            Width = request.Width,
            Height = request.Height,
            CreatedBy = user
        };

        entity = await _positions.AddAsync(entity, cancellationToken);
        await TrackStatusChange(entity, PositionStatus.Available, "Initial creation", user, cancellationToken);
        return entity.ToDto();
    }

    public async Task UpdateAsync(UpdateAdditionalPositionRequest request, string user, CancellationToken cancellationToken = default)
    {
        var entity = await _positions.GetByIdAsync(request.Id, cancellationToken) ?? throw new KeyNotFoundException("Position not found");

        entity.RetailObjectId = request.RetailObjectId;
        entity.Name = request.Name;
        entity.PositionType = request.PositionType;
        entity.Width = request.Width;
        entity.Height = request.Height;
        entity.ModifiedBy = user;
        entity.ModifiedAtUtc = DateTime.UtcNow;

        if (entity.Status != request.Status)
        {
            entity.Status = request.Status;
            await TrackStatusChange(entity, request.Status, "Status updated", user, cancellationToken);
        }

        await _positions.UpdateAsync(entity, cancellationToken);
        _logger.LogInformation("Additional position {Position} updated by {User}", entity.Id, user);
    }

    public async Task DeleteAsync(Guid id, string user, CancellationToken cancellationToken = default)
    {
        await _positions.DeleteAsync(id, cancellationToken);
        _logger.LogInformation("Additional position {Position} deleted by {User}", id, user);
    }

    private async Task TrackStatusChange(AdditionalPosition entity, PositionStatus status, string comment, string user, CancellationToken cancellationToken)
    {
        var history = new PositionStatusHistory
        {
            AdditionalPositionId = entity.Id,
            Status = status,
            EffectiveFromUtc = DateTime.UtcNow,
            Comment = comment,
            CreatedBy = user
        };

        await _statusHistory.AddAsync(history, cancellationToken);
    }
}
