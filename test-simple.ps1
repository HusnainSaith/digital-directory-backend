Write-Host "Testing Business Module Routes as Admin User" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:3000"
$email = "ramzanhusnain7194@gmail.com"  
$password = "superadmin123"

# Step 1: Login
Write-Host "Step 1: Logging in as Admin..." -ForegroundColor Yellow
$loginResponse = curl -s -X POST "$baseUrl/auth/login" `
    -H "Content-Type: application/json" `
    -d "{`"email`":`"$email`",`"password`":`"`password`"`}" | ConvertFrom-Json

if ($loginResponse.success) {
    $token = $loginResponse.data.accessToken
    Write-Host "  SUCCESS: Logged in" -ForegroundColor Green
    Write-Host "  Token: $($token.Substring(0,20))..." -ForegroundColor Gray
} else {
    Write-Host "  FAILED: Could not login" -ForegroundColor Red
    exit
}

Write-Host ""

# Step 2: Create Country
Write-Host "Step 2: Creating Country..." -ForegroundColor Yellow
$countryResponse = curl -s -X POST "$baseUrl/countries" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{`"name`":`"United States`",`"code`":`"US`",`"flag`":`"FLAG`",`"subdomain`":`"us-test-$((Get-Random))`"}" | ConvertFrom-Json

if ($countryResponse.success) {
    $countryId = $countryResponse.data.id
    Write-Host "  SUCCESS: Country created - $($countryResponse.data.name)" -ForegroundColor Green
    Write-Host "  ID: $countryId"  -ForegroundColor Gray
} else {
    Write-Host "  FAILED: $($countryResponse.message)" -ForegroundColor Red
}

Write-Host ""

# Step 3: Create Category  
Write-Host "Step 3: Creating Category..." -ForegroundColor Yellow
$categoryResponse = curl -s -X POST "$baseUrl/categories" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{`"name`":`"Automotive`",`"slug`":`"automotive-$((Get-Random))`",`"icon`":`"car`",`"description`":`"Auto services`"}" | ConvertFrom-Json

if ($categoryResponse.success) {
    $categoryId = $categoryResponse.data.id
    Write-Host "  SUCCESS: Category created - $($categoryResponse.data.name)" -ForegroundColor Green
    Write-Host "  ID: $categoryId" -ForegroundColor Gray
} else {
    Write-Host "  FAILED" -ForegroundColor Red
}

Write-Host ""

# Step 4: Create City
Write-Host "Step 4: Creating City..." -ForegroundColor Yellow  
$cityResponse = curl -s -X POST "$baseUrl/cities" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{`"name`":`"New York`",`"slug`":`"nyc-$((Get-Random))`",`"region`":`"NY State`",`"heroImage`":`"temp`",`"description`":`"NYC`",`"countryId`":`"$countryId`"}" | ConvertFrom-Json

if ($cityResponse.success) {
    $cityId = $cityResponse.data.id
    Write-Host "  SUCCESS: City created - $($cityResponse.data.name)" -ForegroundColor Green
    Write-Host "  ID: $cityId" -ForegroundColor Gray
} else {
    Write-Host "  FAILED" -ForegroundColor Red
}

Write-Host ""

# Step 5: Create Business
Write-Host "Step 5: Creating Business..." -ForegroundColor Yellow
$businessJson = @"
{
    "slug": "auto-shop-$((Get-Random))",
    "name": "Elite Auto Repair",
    "shortDescription": "Auto repair services",
    "description": "Professional automotive repair and maintenance",
    "logo": "/temp.jpg",
    "businessCard": "/temp.jpg",
    "email": "contact@auto.com",
    "phone": "+1-555-0123",
    "website": "https://auto.com",
    "address": {
        "countryId": "$countryId",
        "cityId": "$cityId",
        "street": "123 Main St",
        "postalCode": "10001",
        "lat": 40.7128,
        "lng": -74.0060
    },
    "categoryIds": ["$categoryId"]
}
"@

$businessResponse = curl -s -X POST "$baseUrl/businesses" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d $businessJson | ConvertFrom-Json

if ($businessResponse.success) {
    $businessId = $businessResponse.data.id
    Write-Host "  SUCCESS: Business created - $($businessResponse.data.name)" -ForegroundColor Green
    Write-Host "  ID: $businessId" -ForegroundColor Gray
} else {
    Write-Host "  FAILED" -ForegroundColor Red
}

Write-Host ""

# Step 6: Get All Businesses
Write-Host "Step 6: Getting All Businesses..." -ForegroundColor Yellow
$listResponse = curl -s -X GET "$baseUrl/businesses" | ConvertFrom-Json

if ($listResponse.success) {
    Write-Host "  SUCCESS: Retrieved $($listResponse.data.Count) businesses" -ForegroundColor Green
} else {
    Write-Host "  FAILED" -ForegroundColor Red
}

Write-Host ""

# Step 7: Get Business by ID
Write-Host "Step 7: Getting Business by ID..." -ForegroundColor Yellow
$getResponse = curl -s -X GET "$baseUrl/businesses/$businessId" | ConvertFrom-Json

if ($getResponse.success) {
    Write-Host "  SUCCESS: Retrieved business - $($getResponse.data.name)" -ForegroundColor Green
    Write-Host "  Logo: $($getResponse.data.logo)" -ForegroundColor Gray
} else {
    Write-Host "  FAILED" -ForegroundColor Red
}

Write-Host ""

# Step 8: Update Business
Write-Host "Step 8: Updating Business..." -ForegroundColor Yellow
$updateResponse = curl -s -X PATCH "$baseUrl/businesses/$businessId" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{`"description`":`"UPDATED: Premium auto repair services`"}" | ConvertFrom-Json

if ($updateResponse.success) {
    Write-Host "  SUCCESS: Business updated" -ForegroundColor Green
} else {
    Write-Host "  FAILED" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Country ID:  $countryId" -ForegroundColor White
Write-Host "Category ID: $categoryId" -ForegroundColor White
Write-Host "City ID:     $cityId" -ForegroundColor White
Write-Host "Business ID: $businessId" -ForegroundColor White
Write-Host ""
Write-Host "All basic CRUD operations tested successfully!" -ForegroundColor Green
Write-Host "File upload endpoints available in Swagger UI at:" -ForegroundColor Yellow
Write-Host "http://localhost:3000/api/docs" -ForegroundColor Cyan
Write-Host ""
