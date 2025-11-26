using System.Linq;

namespace RetailPositions.Domain.Repositories;

/// <summary>
/// Generic repository abstraction for domain entities.
/// </summary>
/// <typeparam name="TEntity">Entity type.</typeparam>
public interface IRepository<TEntity> where TEntity : class
{
    /// <summary>
    /// Returns a queryable source for the entity.
    /// </summary>
    IQueryable<TEntity> Query();

    /// <summary>
    /// Finds an entity by identifier.
    /// </summary>
    Task<TEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new entity to the context.
    /// </summary>
    Task AddAsync(TEntity entity, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds multiple entities to the context.
    /// </summary>
    Task AddRangeAsync(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default);

    /// <summary>
    /// Marks an entity for update.
    /// </summary>
    void Update(TEntity entity);

    /// <summary>
    /// Removes an entity from the context.
    /// </summary>
    void Remove(TEntity entity);

    /// <summary>
    /// Persists pending changes to the data store.
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
