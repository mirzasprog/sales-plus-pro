using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RetailPositions.Domain.Entities;

namespace RetailPositions.Infrastructure.Persistence.Configurations;

public class LayoutElementConfiguration : IEntityTypeConfiguration<LayoutElement>
{
    public void Configure(EntityTypeBuilder<LayoutElement> builder)
    {
        builder.ToTable("LayoutElements");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Label).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Type).HasMaxLength(64).IsRequired();
        builder.Property(x => x.X).HasPrecision(10, 2);
        builder.Property(x => x.Y).HasPrecision(10, 2);
        builder.Property(x => x.Width).HasPrecision(10, 2);
        builder.Property(x => x.Height).HasPrecision(10, 2);

        builder.HasOne(x => x.AdditionalPosition)
            .WithOne(p => p.LayoutElement)
            .HasForeignKey<LayoutElement>(x => x.AdditionalPositionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
