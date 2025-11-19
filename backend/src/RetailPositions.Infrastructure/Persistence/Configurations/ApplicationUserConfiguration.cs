using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RetailPositions.Infrastructure.Identity;

namespace RetailPositions.Infrastructure.Persistence.Configurations;

public class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Email).HasMaxLength(256).IsRequired();
        builder.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
        builder.Property(x => x.Role).HasMaxLength(64).IsRequired();
        builder.Property(x => x.DisplayName).HasMaxLength(128);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.CreatedAtUtc).HasDefaultValueSql("GETUTCDATE()");
        builder.Property(x => x.CreatedBy).HasMaxLength(128).HasDefaultValue("system");
        builder.Property(x => x.ModifiedBy).HasMaxLength(128);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.HasIndex(x => x.Email).IsUnique();
    }
}
