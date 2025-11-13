using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RetailPositions.Domain.Entities;

namespace RetailPositions.Infrastructure.Persistence.Configurations;

public class AdditionalPositionConfiguration : IEntityTypeConfiguration<AdditionalPosition>
{
    public void Configure(EntityTypeBuilder<AdditionalPosition> builder)
    {
        builder.ToTable("AdditionalPositions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(128).IsRequired();
        builder.Property(x => x.PositionType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Width).HasPrecision(10, 2);
        builder.Property(x => x.Height).HasPrecision(10, 2);

        builder.HasMany(x => x.Leases)
            .WithOne(l => l.AdditionalPosition!)
            .HasForeignKey(l => l.AdditionalPositionId);

        builder.HasMany(x => x.Attachments)
            .WithOne(a => a.AdditionalPosition!)
            .HasForeignKey(a => a.AdditionalPositionId);

        builder.HasMany(x => x.StatusHistory)
            .WithOne(h => h.AdditionalPosition!)
            .HasForeignKey(h => h.AdditionalPositionId);
    }
}
