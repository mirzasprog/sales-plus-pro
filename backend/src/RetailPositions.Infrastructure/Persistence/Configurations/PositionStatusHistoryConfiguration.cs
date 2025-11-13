using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RetailPositions.Domain.Entities;

namespace RetailPositions.Infrastructure.Persistence.Configurations;

public class PositionStatusHistoryConfiguration : IEntityTypeConfiguration<PositionStatusHistory>
{
    public void Configure(EntityTypeBuilder<PositionStatusHistory> builder)
    {
        builder.ToTable("PositionStatusHistory");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Comment).HasMaxLength(512);
        builder.HasIndex(x => new { x.AdditionalPositionId, x.EffectiveFromUtc });
    }
}
