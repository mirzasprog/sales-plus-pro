using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RetailPositions.Application.DTOs;
using RetailPositions.Application.Interfaces;
using RetailPositions.Application.Mapping;
using RetailPositions.Domain.Entities;

namespace RetailPositions.Application.Services;

/// <summary>
/// Provides retail object CRUD operations and dashboards.
/// </summary>
public class RetailObjectService
{
    private readonly IRepository<RetailObject> _repository;
    private readonly ILogger<RetailObjectService> _logger;

    public RetailObjectService(IRepository<RetailObject> repository, ILogger<RetailObjectService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<RetailObjectDto>> GetAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAsync(include: query => query
            .Include(x => x.Layouts)
            .Include(x => x.AdditionalPositions), cancellationToken: cancellationToken);
        return entities.Select(e => e.ToDto()).ToList();
    }

    public async Task<RetailObjectDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = (await _repository.GetAsync(x => x.Id == id, query => query
            .Include(o => o.Layouts)
            .Include(o => o.AdditionalPositions), cancellationToken)).FirstOrDefault();
        return entity?.ToDto();
    }

    public async Task<RetailObjectDto> CreateAsync(CreateRetailObjectRequest request, string user, CancellationToken cancellationToken = default)
    {
        var entity = new RetailObject
        {
            Code = request.Code,
            Name = request.Name,
            Address = new()
            {
                Street = request.Street,
                City = request.City,
                PostalCode = request.PostalCode,
                Country = request.Country
            },
            CreatedBy = user
        };

        entity = await _repository.AddAsync(entity, cancellationToken);
        _logger.LogInformation("Retail object {RetailObject} created by {User}", entity.Id, user);
        return entity.ToDto();
    }

    public async Task UpdateAsync(UpdateRetailObjectRequest request, string user, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken) ?? throw new KeyNotFoundException("Retail object not found");

        entity.Code = request.Code;
        entity.Name = request.Name;
        entity.Address.Street = request.Street;
        entity.Address.City = request.City;
        entity.Address.PostalCode = request.PostalCode;
        entity.Address.Country = request.Country;
        entity.ModifiedBy = user;
        entity.ModifiedAtUtc = DateTime.UtcNow;

        await _repository.UpdateAsync(entity, cancellationToken);
        _logger.LogInformation("Retail object {RetailObject} updated by {User}", entity.Id, user);
    }

    public async Task DeleteAsync(Guid id, string user, CancellationToken cancellationToken = default)
    {
        await _repository.DeleteAsync(id, cancellationToken);
        _logger.LogInformation("Retail object {RetailObject} deleted by {User}", id, user);
    }
}
