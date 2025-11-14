using RetailPositions.Application.DTOs;
using RetailPositions.Domain.Entities;

namespace RetailPositions.Application.Mapping;

/// <summary>
/// Manual mapping extensions between entities and DTOs.
/// </summary>
public static class MappingExtensions
{
    public static RetailObjectDto ToDto(this RetailObject entity)
        => new(
            entity.Id,
            entity.Code,
            entity.Name,
            entity.Address.Street,
            entity.Address.City,
            entity.Address.PostalCode,
            entity.Address.Country,
            entity.Layouts.Count,
            entity.AdditionalPositions.Count);

    public static AdditionalPositionDto ToDto(this AdditionalPosition entity)
    {
        var activeLease = entity.Leases
            .OrderByDescending(l => l.StartDate)
            .FirstOrDefault(l => l.EndDate >= DateTime.UtcNow);

        return new AdditionalPositionDto(
            entity.Id,
            entity.RetailObjectId,
            entity.RetailObject?.Name ?? string.Empty,
            entity.Name,
            entity.PositionType,
            entity.Width,
            entity.Height,
            entity.Status,
            entity.Leases.Count(l => l.EndDate >= DateTime.UtcNow),
            activeLease?.StartDate,
            activeLease?.EndDate);
    }

    public static BrandDto ToDto(this Brand entity)
        => new(entity.Id, entity.Name, entity.Category, entity.Leases.Count(l => l.EndDate >= DateTime.UtcNow));

    public static BrandLeaseDto ToDto(this BrandLease entity)
        => new(
            entity.Id,
            entity.AdditionalPositionId,
            entity.BrandId,
            entity.Brand?.Name ?? string.Empty,
            entity.StartDate,
            entity.EndDate,
            entity.Price,
            entity.Status,
            entity.Notes);
}
