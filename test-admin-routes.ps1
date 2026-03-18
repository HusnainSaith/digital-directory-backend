# Admin Routes Testing Script
# This script tests all business module routes with real data

$baseUrl = "http://localhost:3000"
$token = ""
$testData = @{
    countryId = ""
    categoryId = ""
    cityId = ""
    businessId = ""
    mediaId = ""
}

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ADMIN USER - Business Module Routes Testing           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Helper function to create test image
function Create-TestImage {
    param([string]$fileName)
    
    # Create a minimal 1x1 pixel JPEG
    $base64Image = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AA=="
    $bytes = [Convert]::FromBase64String($base64Image)
    $tempFile = Join-Path $env:TEMP $fileName
    [System.IO.File]::WriteAllBytes($tempFile, $bytes)
    return $tempFile
}

# Step 1: Login as Admin
Write-Host "🔐 Step 1: Logging in as Admin..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "ramzanhusnain7194@gmail.com"
        password = "superadmin123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $response.data.accessToken
    Write-Host "   ✅ Login successful" -ForegroundColor Green
    Write-Host "   📝 Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host ""

# Step 2: Create Country
Write-Host "🌍 Step 2: Creating Country..." -ForegroundColor Yellow
try {
    $countryBody = @{
        name = "United States"
        code = "US"
        flag = "🇺🇸"
        subdomain = "us-test-$(Get-Random)"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/countries" -Method Post -Body $countryBody -Headers $headers
    $testData.countryId = $response.data.id
    Write-Host "   ✅ Country created: $($response.data.name)" -ForegroundColor Green
    Write-Host "   📝 Country ID: $($testData.countryId)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 3: Create Category
Write-Host "📁 Step 3: Creating Category..." -ForegroundColor Yellow
try {
    $categoryBody = @{
        name = "Automotive and Vehicles"
        slug = "automotive-$(Get-Random)"
        icon = "car"
        description = "Automotive repair, sales, and vehicle-related businesses"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/categories" -Method Post -Body $categoryBody -Headers $headers
    $testData.categoryId = $response.data.id
    Write-Host "   ✅ Category created: $($response.data.name)" -ForegroundColor Green
    Write-Host "   📝 Category ID: $($testData.categoryId)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 4: Upload Category Icon to R2
Write-Host "🖼️  Step 4: Uploading Category Icon to R2..." -ForegroundColor Yellow
try {
    $iconFile = Create-TestImage "category-icon.jpg"
    
    $uri = "$baseUrl/categories/$($testData.categoryId)/icon"
    
    # Use multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $fileContent = [System.IO.File]::ReadAllBytes($iconFile)
    $fileEncoded = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileContent)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"category-icon.jpg`"",
        "Content-Type: image/jpeg$LF",
        $fileEncoded,
        "--$boundary--$LF"
    ) -join $LF

    $uploadHeaders = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }

    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $bodyLines -Headers $uploadHeaders
    Write-Host "   ✅ Category icon uploaded to R2" -ForegroundColor Green
    Write-Host "   🔗 R2 URL: $($response.data.icon)" -ForegroundColor Cyan
    
    Remove-Item $iconFile -ErrorAction SilentlyContinue
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 5: Create City
Write-Host "🏙️  Step 5: Creating City..." -ForegroundColor Yellow
try {
    $cityBody = @{
        name = "New York City"
        slug = "new-york-$(Get-Random)"
        region = "New York State"
        heroImage = "/images/default.jpg"
        description = "The Big Apple - America's largest city and global business hub"
        countryId = $testData.countryId
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/cities" -Method Post -Body $cityBody -Headers $headers
    $testData.cityId = $response.data.id
    Write-Host "   ✅ City created: $($response.data.name)" -ForegroundColor Green
    Write-Host "   📝 City ID: $($testData.cityId)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 6: Upload City Hero Image to R2
Write-Host "🌆 Step 6: Uploading City Hero Image to R2..." -ForegroundColor Yellow
try {
    $heroFile = Create-TestImage "city-hero.jpg"
    
    $uri = "$baseUrl/cities/$($testData.cityId)/hero-image"
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $fileContent = [System.IO.File]::ReadAllBytes($heroFile)
    $fileEncoded = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileContent)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"city-hero.jpg`"",
        "Content-Type: image/jpeg$LF",
        $fileEncoded,
        "--$boundary--$LF"
    ) -join $LF

    $uploadHeaders = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }

    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $bodyLines -Headers $uploadHeaders
    Write-Host "   ✅ City hero image uploaded to R2" -ForegroundColor Green
    Write-Host "   🔗 R2 URL: $($response.data.heroImage)" -ForegroundColor Cyan
    
    Remove-Item $heroFile -ErrorAction SilentlyContinue
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 7: Create Business
Write-Host "🏢 Step 7: Creating Business..." -ForegroundColor Yellow
try {
    $businessBody = @{
        slug = "elite-auto-repair-$(Get-Random)"
        name = "Elite Auto Repair & Service"
        shortDescription = "Premium automotive repair and maintenance services"
        description = "Elite Auto Repair provides comprehensive automotive services including diagnostics, repairs, maintenance, and performance upgrades. Our ASE-certified technicians use state-of-the-art equipment to ensure your vehicle runs at peak performance."
        logo = "/images/default-logo.png"
        businessCard = "/images/default-card.png"
        email = "contact@eliteauto.com"
        phone = "+1-555-AUTO-123"
        website = "https://eliteautorepair.com"
        address = @{
            countryId = $testData.countryId
            cityId = $testData.cityId
            street = "456 Broadway Avenue"
            postalCode = "10013"
            lat = 40.7589
            lng = -73.9851
        }
        categoryIds = @($testData.categoryId)
        tags = @("auto repair", "oil change", "brakes", "diagnostics")
    } | ConvertTo-Json -Depth 10

    $response = Invoke-RestMethod -Uri "$baseUrl/businesses" -Method Post -Body $businessBody -Headers $headers
    $testData.businessId = $response.data.id
    Write-Host "   ✅ Business created: $($response.data.name)" -ForegroundColor Green
    Write-Host "   📝 Business ID: $($testData.businessId)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 8: Upload Business Logo to R2
Write-Host "🎨 Step 8: Uploading Business Logo to R2..." -ForegroundColor Yellow
try {
    $logoFile = Create-TestImage "business-logo.jpg"
    
    $uri = "$baseUrl/businesses/$($testData.businessId)/logo"
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $fileContent = [System.IO.File]::ReadAllBytes($logoFile)
    $fileEncoded = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileContent)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"business-logo.jpg`"",
        "Content-Type: image/jpeg$LF",
        $fileEncoded,
        "--$boundary--$LF"
    ) -join $LF

    $uploadHeaders = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }

    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $bodyLines -Headers $uploadHeaders
    Write-Host "   ✅ Business logo uploaded to R2" -ForegroundColor Green
    Write-Host "   🔗 R2 URL: $($response.data.logo)" -ForegroundColor Cyan
    
    Remove-Item $logoFile -ErrorAction SilentlyContinue
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 9: Upload Business Media to R2
Write-Host "📸 Step 9: Uploading Business Media to R2..." -ForegroundColor Yellow
try {
    $mediaFile = Create-TestImage "business-media.jpg"
    
    $uri = "$baseUrl/businesses/$($testData.businessId)/media"
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $fileContent = [System.IO.File]::ReadAllBytes($mediaFile)
    $fileEncoded = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileContent)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"media.jpg`"",
        "Content-Type: image/jpeg$LF",
        $fileEncoded,
        "--$boundary",
        "Content-Disposition: form-data; name=`"alt`"$LF",
        "Service area photo",
        "--$boundary",
        "Content-Disposition: form-data; name=`"title`"$LF",
        "Main repair bay",
        "--$boundary",
        "Content-Disposition: form-data; name=`"mediaType`"$LF",
        "image",
        "--$boundary--$LF"
    ) -join $LF

    $uploadHeaders = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }

    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $bodyLines -Headers $uploadHeaders
    $testData.mediaId = $response.data.id
    Write-Host "   ✅ Business media uploaded to R2" -ForegroundColor Green
    Write-Host "   🔗 R2 URL: $($response.data.url)" -ForegroundColor Cyan
    Write-Host "   📝 Media ID: $($testData.mediaId)" -ForegroundColor Gray
    
    Remove-Item $mediaFile -ErrorAction SilentlyContinue
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 10: Upload Business Card to R2
Write-Host "💳 Step 10: Uploading Business Card to R2..." -ForegroundColor Yellow
try {
    $cardFile = Create-TestImage "business-card.jpg"
    
    $uri = "$baseUrl/businesses/$($testData.businessId)/card"
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $fileContent = [System.IO.File]::ReadAllBytes($cardFile)
    $fileEncoded = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileContent)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"card.jpg`"",
        "Content-Type: image/jpeg$LF",
        $fileEncoded,
        "--$boundary--$LF"
    ) -join $LF

    $uploadHeaders = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }

    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $bodyLines -Headers $uploadHeaders
    Write-Host "   ✅ Business card uploaded to R2" -ForegroundColor Green
    Write-Host "   🔗 R2 URL: $($response.data.cardImageUrl)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 11: Get All Businesses
Write-Host "📋 Step 11: Getting All Businesses..." -ForegroundColor Yellow
try {
    $uri = $baseUrl + '/businesses?page=1&limit=10'
    $response = Invoke-RestMethod -Uri $uri -Method Get
    Write-Host "   ✅ Retrieved $($response.data.Count) businesses" -ForegroundColor Green
    if ($response.data.Count -gt 0) {
        Write-Host "   📝 First business: $($response.data[0].name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 12: Get Business by ID
Write-Host "🔍 Step 12: Getting Business by ID..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/businesses/$($testData.businessId)" -Method Get
    Write-Host "   ✅ Retrieved business: $($response.data.name)" -ForegroundColor Green
    Write-Host "   🏙️  City: $($response.data.addressCity)" -ForegroundColor Gray
    Write-Host "   🎨 Logo: $($response.data.logo)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 13: Update Business
Write-Host "✏️  Step 13: Updating Business..." -ForegroundColor Yellow
try {
    $updateBody = @{
        description = "Elite Auto Repair provides comprehensive automotive services including diagnostics, repairs, maintenance, and performance upgrades. Our ASE-certified technicians use state-of-the-art equipment to ensure your vehicle runs at peak performance. NOW WITH 24/7 EMERGENCY SERVICE!"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/businesses/$($testData.businessId)" -Method Patch -Body $updateBody -Headers $headers
    Write-Host "   ✅ Business updated successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 14: Get All Categories
Write-Host "📂 Step 14: Getting All Categories..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/categories" -Method Get
    Write-Host "   ✅ Retrieved $($response.data.Count) categories" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 15: Get All Cities
Write-Host "🌃 Step 15: Getting All Cities..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/cities?countryId=$($testData.countryId)" -Method Get
    Write-Host "   ✅ Retrieved $($response.data.Count) cities" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 16: Get Business Media
Write-Host "🖼️  Step 16: Getting Business Media..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/businesses/$($testData.businessId)/media" -Method Get -Headers $headers
    Write-Host "   ✅ Retrieved $($response.data.Count) media items" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    TEST SUMMARY                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Created Test Data:" -ForegroundColor Green
Write-Host "   🌍 Country ID: $($testData.countryId)" -ForegroundColor White
Write-Host "   📁 Category ID: $($testData.categoryId)" -ForegroundColor White
Write-Host "   🏙️  City ID: $($testData.cityId)" -ForegroundColor White
Write-Host "   🏢 Business ID: $($testData.businessId)" -ForegroundColor White
Write-Host "   📸 Media ID: $($testData.mediaId)" -ForegroundColor White
Write-Host ""
Write-Host "🔗 All files uploaded to Cloudflare R2 successfully!" -ForegroundColor Green
Write-Host "📊 You can verify the data in Swagger UI: http://localhost:3000/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Note: Test data remains in database. Delete manually if needed." -ForegroundColor Yellow
Write-Host ""
