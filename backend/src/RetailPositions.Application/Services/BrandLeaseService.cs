using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RetailPositions.Application.DTOs;
using RetailPositions.Application.Mapping;
using RetailPositions.Domain.Entities;
using RetailPositions.Domain.Enums;
using RetailPositions.Domain.Repositories;

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
        var entities = await _leases.Query()
            .Include(x => x.Brand)
            .Include(x => x.AdditionalPosition)
            .ToListAsync(cancellationToken);
        return entities.Select(e => e.ToDto()).ToList();
    }

    public async Task<BrandLeaseDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _leases.Query()
            .Include(x => x.Brand)
            .Include(x => x.AdditionalPosition)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
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

        await _leases.AddAsync(entity, cancellationToken);
        await SyncPositionStatus(entity, cancellationToken);
        await _leases.SaveChangesAsync(cancellationToken);
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

        await SyncPositionStatus(entity, cancellationToken);
        _leases.Update(entity);
        await _leases.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Lease {Lease} updated by {User}", entity.Id, user);
    }

    public async Task DeleteAsync(Guid id, string user, CancellationToken cancellationToken = default)
    {
        var entity = await _leases.GetByIdAsync(id, cancellationToken);
        if (entity is not null)
        {
            await SyncPositionStatus(entity, cancellationToken, deleted: true);
            _leases.Remove(entity);
            await _leases.SaveChangesAsync(cancellationToken);
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
        _positions.Update(position);
    }
}
