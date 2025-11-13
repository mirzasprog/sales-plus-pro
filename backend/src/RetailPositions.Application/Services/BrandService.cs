using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RetailPositions.Application.DTOs;
using RetailPositions.Application.Interfaces;
using RetailPositions.Application.Mapping;
using RetailPositions.Domain.Entities;

namespace RetailPositions.Application.Services;

/// <summary>
/// Provides brand CRUD operations.
/// </summary>
public class BrandService
{
    private readonly IRepository<Brand> _brands;
    private readonly ILogger<BrandService> _logger;

    public BrandService(IRepository<Brand> brands, ILogger<BrandService> logger)
    {
        _brands = brands;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<BrandDto>> GetAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _brands.GetAsync(include: query => query.Include(x => x.Leases), cancellationToken: cancellationToken);
        return entities.Select(e => e.ToDto()).ToList();
    }

    public async Task<BrandDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = (await _brands.GetAsync(x => x.Id == id, query => query.Include(x => x.Leases), cancellationToken)).FirstOrDefault();
        return entity?.ToDto();
    }

    public async Task<BrandDto> CreateAsync(CreateBrandRequest request, string user, CancellationToken cancellationToken = default)
    {
        var entity = new Brand
        {
            Name = request.Name,
            Category = request.Category,
            CreatedBy = user
        };

        entity = await _brands.AddAsync(entity, cancellationToken);
        _logger.LogInformation("Brand {Brand} created by {User}", entity.Id, user);
        return entity.ToDto();
    }

    public async Task UpdateAsync(UpdateBrandRequest request, string user, CancellationToken cancellationToken = default)
    {
        var entity = await _brands.GetByIdAsync(request.Id, cancellationToken) ?? throw new KeyNotFoundException("Brand not found");

        entity.Name = request.Name;
        entity.Category = request.Category;
        entity.ModifiedBy = user;
        entity.ModifiedAtUtc = DateTime.UtcNow;

        await _brands.UpdateAsync(entity, cancellationToken);
        _logger.LogInformation("Brand {Brand} updated by {User}", entity.Id, user);
    }

    public async Task DeleteAsync(Guid id, string user, CancellationToken cancellationToken = default)
    {
        await _brands.DeleteAsync(id, cancellationToken);
        _logger.LogInformation("Brand {Brand} deleted by {User}", id, user);
    }
}
