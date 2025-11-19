using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace RetailPositions.Api.Filters;

/// <summary>
/// Converts thrown exceptions into ProblemDetails responses.
/// </summary>
public class ApiExceptionFilter : IExceptionFilter
{
    private readonly ILogger<ApiExceptionFilter> _logger;

    public ApiExceptionFilter(ILogger<ApiExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        _logger.LogError(context.Exception, "Unhandled exception");
        var problem = new ProblemDetails
        {
            Title = "Unexpected error",
            Detail = context.Exception.Message,
            Status = StatusCodes.Status500InternalServerError
        };

        if (context.Exception is UnauthorizedAccessException)
        {
            problem.Status = StatusCodes.Status401Unauthorized;
            problem.Title = "Unauthorized";
        }
        else if (context.Exception is KeyNotFoundException)
        {
            problem.Status = StatusCodes.Status404NotFound;
            problem.Title = "Not Found";
        }
        else if (context.Exception is ArgumentException)
        {
            problem.Status = StatusCodes.Status400BadRequest;
            problem.Title = "Invalid Request";
        }

        context.Result = new ObjectResult(problem)
        {
            StatusCode = problem.Status
        };
        context.ExceptionHandled = true;
    }
}
