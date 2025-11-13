namespace RetailPositions.Domain.Entities;

/// <summary>
/// Represents a media attachment uploaded by store level users.
/// </summary>
public class PositionAttachment : BaseEntity
{
    public Guid AdditionalPositionId { get; set; }
    public AdditionalPosition? AdditionalPosition { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string StoragePath { get; set; } = string.Empty;
    public string UploadedBy { get; set; } = string.Empty;
    public DateTime UploadedAtUtc { get; set; }
}
