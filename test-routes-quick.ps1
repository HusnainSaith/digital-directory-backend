# Quick test for previously-failing admin routes
$baseUrl = "http://localhost:3000"

# Login as admin
Write-Host "Logging in..." -ForegroundColor Yellow
try {
    $loginBody = @{ email = "ramzanhusnain7194@gmail.com"; password = "SuperAdmin@2026" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $response.data.accessToken
    Write-Host "  OK - got token" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$headers = @{ "Authorization" = "Bearer $token" }

$routes = @(
    @{ Name = "Dashboard";       Uri = "/admin/dashboard" },
    @{ Name = "Users";           Uri = "/admin/users?page=1&limit=20" },
    @{ Name = "Businesses";      Uri = "/admin/businesses?page=1&limit=20&search=" },
    @{ Name = "Reviews";         Uri = "/admin/reviews?page=1&limit=20" },
    @{ Name = "Countries";       Uri = "/countries?limit=100" },
    @{ Name = "Cities";          Uri = "/cities?limit=100" },
    @{ Name = "Categories";      Uri = "/categories?limit=100" },
    @{ Name = "Plans";           Uri = "/admin/plans?limit=100" },
    @{ Name = "Subscriptions";   Uri = "/admin/subscriptions?page=1&limit=20" },
    @{ Name = "Payments";        Uri = "/admin/payments?page=1&limit=20" },
    @{ Name = "Notifications";   Uri = "/admin/notifications/logs?page=1&limit=20" },
    @{ Name = "Audit Logs";      Uri = "/admin/audit-logs?page=1&limit=20" },
    @{ Name = "Analytics (Dashboard)"; Uri = "/admin/dashboard?countryId=" },
    @{ Name = "Analytics Revenue";  Uri = "/admin/analytics/revenue" }
)

$pass = 0; $fail = 0
foreach ($route in $routes) {
    try {
        $r = Invoke-RestMethod -Uri "$baseUrl$($route.Uri)" -Method Get -Headers $headers
        Write-Host "  OK  $($route.Name)" -ForegroundColor Green
        $pass++
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-Host "  FAIL $($route.Name) - $status $($_.Exception.Message)" -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host "Results: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
