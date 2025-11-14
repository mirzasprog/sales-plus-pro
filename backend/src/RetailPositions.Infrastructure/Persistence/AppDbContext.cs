using Microsoft.EntityFrameworkCore;
using RetailPositions.Domain.Entities;
using RetailPositions.Infrastructure.Identity;

namespace RetailPositions.Infrastructure.Persistence;

/// <summary>
/// Entity Framework database context for the retail positions platform.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<RetailObject> RetailObjects => Set<RetailObject>();
    public DbSet<FloorLayout> FloorLayouts => Set<FloorLayout>();
    public DbSet<LayoutElement> LayoutElements => Set<LayoutElement>();
    public DbSet<AdditionalPosition> AdditionalPositions => Set<AdditionalPosition>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<BrandLease> BrandLeases => Set<BrandLease>();
    public DbSet<PositionAttachment> PositionAttachments => Set<PositionAttachment>();
    public DbSet<PositionStatusHistory> PositionStatusHistory => Set<PositionStatusHistory>();
    public DbSet<ApplicationUser> Users => Set<ApplicationUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
