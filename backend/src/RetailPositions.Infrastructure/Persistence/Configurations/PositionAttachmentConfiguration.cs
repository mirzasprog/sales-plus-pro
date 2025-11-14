using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RetailPositions.Domain.Entities;

namespace RetailPositions.Infrastructure.Persistence.Configurations;

public class PositionAttachmentConfiguration : IEntityTypeConfiguration<PositionAttachment>
{
    public void Configure(EntityTypeBuilder<PositionAttachment> builder)
    {
        builder.ToTable("PositionAttachments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.FileName).HasMaxLength(256);
        builder.Property(x => x.ContentType).HasMaxLength(128);
        builder.Property(x => x.StoragePath).HasMaxLength(512);
    }
}
