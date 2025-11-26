using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RetailPositions.Api.Filters;
using RetailPositions.Application.Services;
using RetailPositions.Domain.Repositories;
using RetailPositions.Infrastructure.Persistence;
using RetailPositions.Infrastructure.Persistence.Repositories;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console();
});

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?.Where(origin => !string.IsNullOrWhiteSpace(origin))
    .ToArray();

if (allowedOrigins is null || allowedOrigins.Length == 0)
{
    allowedOrigins = new[]
    {
        "http://localhost:4200",
        "http://localhost:5173"
    };
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendClient", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers(options =>
{
    options.Filters.Add<ApiExceptionFilter>();
}).AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Retail Positions API",
        Version = "v1",
        Description = "API for managing additional sales positions in supermarkets"
    });

    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Enter JWT Bearer token",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id = JwtBearerDefaults.AuthenticationScheme
        }
    };

    options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, securityScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            securityScheme,
            new List<string>()
        }
    });
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Server=(localdb)\\mssqllocaldb;Database=RetailPositions;Trusted_Connection=True;";

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));

builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

builder.Services.AddScoped<RetailObjectService>();
builder.Services.AddScoped<AdditionalPositionService>();
builder.Services.AddScoped<BrandService>();
builder.Services.AddScoped<BrandLeaseService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<DashboardService>();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? string.Empty))
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", policy => policy.RequireRole("Admin"));
    options.AddPolicy("StoreManager", policy => policy.RequireRole("Admin", "StoreManager"));
});

var app = builder.Build();

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors("FrontendClient");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
