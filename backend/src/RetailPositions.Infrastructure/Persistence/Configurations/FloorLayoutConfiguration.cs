using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RetailPositions.Domain.Entities;

namespace RetailPositions.Infrastructure.Persistence.Configurations;

public class FloorLayoutConfiguration : IEntityTypeConfiguration<FloorLayout>
{
    public void Configure(EntityTypeBuilder<FloorLayout> builder)
    {
        builder.ToTable("FloorLayouts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Level).IsRequired();
        builder.Property(x => x.Width).HasPrecision(10, 2);
        builder.Property(x => x.Height).HasPrecision(10, 2);

        builder.HasMany(x => x.Elements)
            .WithOne(e => e.FloorLayout!)
            .HasForeignKey(e => e.FloorLayoutId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
