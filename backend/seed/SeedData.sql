INSERT INTO [dbo].[Users] ([Id], [Email], [PasswordHash], [Role], [DisplayName], [IsActive], [CreatedAtUtc], [CreatedBy], [IsDeleted]) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@retail.com', '$2b$10$PzP7ZkKxqkVyuk3F7S3w2uX5Gucs5cjox96D65gis6pZeRAEIJ5X.', 'Admin', 'Platform Admin', 1, GETUTCDATE(), 'seed', 0),
  ('22222222-2222-2222-2222-222222222222', 'store.manager@retail.com', '$2b$10$0XI7xL7sRKqzZo4PMBVXqeYzUKGwEuITdSb9VInA36TObgGJE0E7a', 'StoreManager', 'Store Manager', 1, GETUTCDATE(), 'seed', 0);

INSERT INTO [dbo].[RetailObjects] ([Id], [Code], [Name], [CreatedAtUtc], [CreatedBy], [IsDeleted], [Street], [City], [PostalCode], [Country]) VALUES
  ('33333333-3333-3333-3333-333333333333', 'ST-001', 'SuperMart Downtown', GETUTCDATE(), 'seed', 0, 'Main Street 1', 'Zagreb', '10000', 'Croatia'),
  ('44444444-4444-4444-4444-444444444444', 'ST-002', 'SuperMart Airport', GETUTCDATE(), 'seed', 0, 'Airport Road 2', 'Zagreb', '10020', 'Croatia');

INSERT INTO [dbo].[Brands] ([Id], [Name], [Category], [CreatedAtUtc], [CreatedBy], [IsDeleted]) VALUES
  ('55555555-5555-5555-5555-555555555555', 'FreshJuice', 'Beverages', GETUTCDATE(), 'seed', 0),
  ('66666666-6666-6666-6666-666666666666', 'SnackKing', 'Snacks', GETUTCDATE(), 'seed', 0);

INSERT INTO [dbo].[AdditionalPositions] ([Id], [RetailObjectId], [Name], [PositionType], [Width], [Height], [Status], [CreatedAtUtc], [CreatedBy], [IsDeleted]) VALUES
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'Entrance Promo Stand', 'PromoStand', 1.20, 2.40, 2, GETUTCDATE(), 'seed', 0),
  ('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', 'Checkout Endcap', 'Endcap', 1.00, 2.00, 3, GETUTCDATE(), 'seed', 0),
  ('99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'Frozen Aisle Extension', 'Extension', 1.50, 2.10, 0, GETUTCDATE(), 'seed', 0);

INSERT INTO [dbo].[BrandLeases] ([Id], [AdditionalPositionId], [BrandId], [StartDate], [EndDate], [Price], [Status], [Notes], [CreatedAtUtc], [CreatedBy], [IsDeleted]) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', DATEADD(DAY, -30, GETUTCDATE()), DATEADD(DAY, 60, GETUTCDATE()), 2500.00, 2, 'Prime location for new juice line', GETUTCDATE(), 'seed', 0);
