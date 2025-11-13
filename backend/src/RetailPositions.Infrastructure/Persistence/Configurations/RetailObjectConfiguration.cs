using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RetailPositions.Domain.Entities;

namespace RetailPositions.Infrastructure.Persistence.Configurations;

public class RetailObjectConfiguration : IEntityTypeConfiguration<RetailObject>
{
    public void Configure(EntityTypeBuilder<RetailObject> builder)
    {
        builder.ToTable("RetailObjects");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Code).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(256).IsRequired();

        builder.OwnsOne(x => x.Address, address =>
        {
            address.Property(a => a.Street).HasColumnName("Street").HasMaxLength(256);
            address.Property(a => a.City).HasColumnName("City").HasMaxLength(128);
            address.Property(a => a.PostalCode).HasColumnName("PostalCode").HasMaxLength(32);
            address.Property(a => a.Country).HasColumnName("Country").HasMaxLength(128);
        });

        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasMany(x => x.Layouts)
            .WithOne(l => l.RetailObject!)
            .HasForeignKey(l => l.RetailObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.AdditionalPositions)
            .WithOne(p => p.RetailObject!)
            .HasForeignKey(p => p.RetailObjectId);
    }
}
