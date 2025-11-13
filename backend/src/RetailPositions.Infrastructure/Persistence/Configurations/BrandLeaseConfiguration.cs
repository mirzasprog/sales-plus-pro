using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RetailPositions.Domain.Entities;

namespace RetailPositions.Infrastructure.Persistence.Configurations;

public class BrandLeaseConfiguration : IEntityTypeConfiguration<BrandLease>
{
    public void Configure(EntityTypeBuilder<BrandLease> builder)
    {
        builder.ToTable("BrandLeases");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Price).HasPrecision(14, 2);
        builder.Property(x => x.Notes).HasMaxLength(1024);

        builder.HasIndex(x => new { x.AdditionalPositionId, x.StartDate, x.EndDate });
    }
}
