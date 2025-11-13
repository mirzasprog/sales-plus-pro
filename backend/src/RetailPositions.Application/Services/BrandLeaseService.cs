using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RetailPositions.Application.DTOs;
using RetailPositions.Application.Interfaces;
using RetailPositions.Application.Mapping;
using RetailPositions.Domain.Entities;
using RetailPositions.Domain.Enums;

namespace RetailPositions.Application.Services;

/// <summary>
/// Manages lease lifecycle for additional positions.
/// </summary>
public class BrandLeaseService
{
    private readonly IRepository<BrandLease> _leases;
    private readonly IRepository<AdditionalPosition> _positions;
    private readonly ILogger<BrandLeaseService> _logger;

    public BrandLeaseService(
        IRepository<BrandLease> leases,
        IRepository<AdditionalPosition> positions,
        ILogger<BrandLeaseService> logger)
    {
        _leases = leases;
        _positions = positions;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<BrandLeaseDto>> GetAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _leases.GetAsync(include: query => query
            .Include(x => x.Brand)
            .Include(x => x.AdditionalPosition), cancellationToken: cancellationToken);
        return entities.Select(e => e.ToDto()).ToList();
    }

    public async Task<BrandLeaseDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = (await _leases.GetAsync(x => x.Id == id, query => query
            .Include(x => x.Brand)
            .Include(x => x.AdditionalPosition), cancellationToken)).FirstOrDefault();
        return entity?.ToDto();
    }

    public async Task<BrandLeaseDto> CreateAsync(CreateBrandLeaseRequest request, string user, CancellationToken cancellationToken = default)
    {
        if (request.EndDate <= request.StartDate)
        {
            throw new ArgumentException("End date must be greater than start date");
        }

        var entity = new BrandLease
        {
            AdditionalPositionId = request.AdditionalPositionId,
            BrandId = request.BrandId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Price = request.Price,
            Status = request.Status,
            Notes = request.Notes,
            CreatedBy = user
        };

        entity = await _leases.AddAsync(entity, cancellationToken);
        await SyncPositionStatus(entity, cancellationToken);
        return entity.ToDto();
    }

    public async Task UpdateAsync(UpdateBrandLeaseRequest request, string user, CancellationToken cancellationToken = default)
    {
        var entity = await _leases.GetByIdAsync(request.Id, cancellationToken) ?? throw new KeyNotFoundException("Lease not found");

        if (request.EndDate <= request.StartDate)
        {
            throw new ArgumentException("End date must be greater than start date");
        }

        entity.StartDate = request.StartDate;
        entity.EndDate = request.EndDate;
        entity.Price = request.Price;
        entity.Status = request.Status;
        entity.Notes = request.Notes;
        entity.ModifiedBy = user;
        entity.ModifiedAtUtc = DateTime.UtcNow;

        await _leases.UpdateAsync(entity, cancellationToken);
        await SyncPositionStatus(entity, cancellationToken);
        _logger.LogInformation("Lease {Lease} updated by {User}", entity.Id, user);
    }

    public async Task DeleteAsync(Guid id, string user, CancellationToken cancellationToken = default)
    {
        var entity = await _leases.GetByIdAsync(id, cancellationToken);
        if (entity is not null)
        {
            await _leases.DeleteAsync(id, cancellationToken);
            await SyncPositionStatus(entity, cancellationToken, deleted: true);
            _logger.LogInformation("Lease {Lease} deleted by {User}", id, user);
        }
    }

    private async Task SyncPositionStatus(BrandLease lease, CancellationToken cancellationToken, bool deleted = false)
    {
        var position = await _positions.GetByIdAsync(lease.AdditionalPositionId, cancellationToken);
        if (position is null)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var isActive = !deleted && lease.StartDate <= now && lease.EndDate >= now;
        var isExpiring = !deleted && lease.EndDate <= now.AddDays(7) && lease.EndDate >= now;

        PositionStatus newStatus = PositionStatus.Available;
        if (isActive)
        {
            newStatus = PositionStatus.Occupied;
        }
        else if (isExpiring)
        {
            newStatus = PositionStatus.ExpiringSoon;
        }

        position.Status = newStatus;
        await _positions.UpdateAsync(position, cancellationToken);
    }
}
