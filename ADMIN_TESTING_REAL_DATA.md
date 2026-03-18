# Admin Testing Guide - Real Data via Swagger UI

## 🎯 Quick Start

**Swagger UI:** http://localhost:3000/api/docs

**Admin Credentials:**
- Email: `ramzanhusnain7194@gmail.com`
- Password: `SuperAdmin@2026`

---

## 📋 Step-by-Step Testing Workflow

### STEP 1: Login & Authorize

1. **Login** (POST `/auth/login`)
   - Click "Try it out"
   - Enter credentials:
     ```json
     {
       "email": "ramzanhusnain7194@gmail.com",
       "password": "SuperAdmin@2026"
     }
     ```
   - Click "Execute"
   - **Copy the `accessToken`** from response

2. **Authorize in Swagger**
   - Click the **"Authorize"** button (green lock icon at top)
   - Paste: `Bearer YOUR_ACCESS_TOKEN`
   - Click "Authorize" then "Close"

---

### STEP 2: Create Core Entities

#### A. Create Country (POST `/countries`)
```json
{
  "name": "South Korea",
  "slug": "south-korea",
  "code": "KR",
  "subdomain": "south-korea",
  "currency": "KRW",
  "timezone": "Asia/Seoul"
}
```
**📝 Save the `id` from response** → Use as `countryId`

---

#### B. Create Category (POST `/categories`)
```json
{
  "name": "Automotive Services",
  "slug": "automotive-services",
  "icon": "car",
  "description": "Professional automotive repair, maintenance, and trading services"
}
```
**📝 Save the `id` from response** → Use as `categoryId`

---

#### C. Upload Category Icon (POST `/categories/{id}/icon`)
1. Click "Try it out"
2. Enter the category ID from step B
3. Click "Choose File" and select an image (PNG, JPG, WebP, or SVG, max 2MB)
4. Click "Execute"
5. **✅ Verify:** Response should contain R2 URL like:
   ```
   https://pub-6dc36a6ecc6f401ca82ba7018f219494.r2.dev/categories/...
   ```

---

#### D. Create City (POST `/cities`)
```json
{
  "name": "Seoul",
  "slug": "seoul",
  "region": "Seoul Capital Area",
  "heroImage": "/temp.jpg",
  "description": "The vibrant capital city of South Korea"
}
```
**📝 Save the `id` from response** → Use as `cityId`

---

#### E. Upload City Hero Image (POST `/cities/{id}/hero-image`)
1. Click "Try it out"
2. Enter the city ID from step D
3. Click "Choose File" and select an image (JPEG, PNG, WebP, max 10MB)
4. Click "Execute"
5. **✅ Verify:** Response should contain R2 URL

---

### STEP 3: Create & Test Business

#### A. Create Business (POST `/businesses`)
```json
{
  "name": "Elite Auto Repair",
  "slug": "elite-auto-repair",
  "shortDescription": "Professional automotive repair and maintenance services",
  "description": "We provide comprehensive automotive repair, maintenance, and diagnostics with certified technicians and state-of-the-art equipment.",
  "logo": "/temp.jpg",
  "businessCard": "/temp.jpg",
  "countryId": "PASTE_COUNTRY_ID_HERE",
  "cityId": "PASTE_CITY_ID_HERE",
  "categoryIds": ["PASTE_CATEGORY_ID_HERE"],
  "contact": {
    "phone": "+82-10-1234-5678",
    "email": "contact@eliteauto.kr",
    "website": "https://eliteauto.kr"
  },
  "address": {
    "country": "South Korea",
    "city": "Seoul",
    "district": "Gangnam-gu",
    "street": "123 Teheran-ro",
    "postalCode": "06234",
    "lat": 37.5665,
    "lng": 126.9780
  },
  "owner": {
    "name": "John Kim",
    "title": "CEO & Founder",
    "bio": "20+ years experience in automotive industry",
    "email": "john@eliteauto.kr"
  },
  "tags": ["Auto Repair", "Maintenance", "Diagnostics"],
  "foundedYear": 2010,
  "employeeRange": "11-50",
  "certifications": ["ISO 9001", "Certified Mechanics"]
}
```
**📝 Save the `id` from response** → Use as `businessId`

---

#### B. Upload Business Logo (POST `/businesses/{id}/logo`)
1. Enter business ID
2. Choose logo file (PNG, JPG, WebP, SVG, max 5MB)
3. Execute
4. **✅ Verify:** R2 URL in response

---

#### C. Upload Business Media (POST `/businesses/{businessId}/media`)
1. Enter business ID
2. Choose image/video (max 50MB)
3. Execute
4. **✅ Verify:** R2 URL in response
5. **Repeat 3-5 times** to create gallery

---

#### D. Upload Business Card (POST `/businesses/{businessId}/card`)
1. Enter business ID
2. Choose business card image/PDF (max 10MB)
3. Execute
4. **✅ Verify:** R2 URL in `cardUrl`

---

### STEP 4: Verify All Data

#### A. Get All Businesses (GET `/businesses`)
- Click "Try it out" → "Execute"
- **✅ Verify:** Your business appears in list
- **✅ Check:** Logo shows R2 URL

#### B. Get Business by ID (GET `/businesses/{id}`)
- Enter your business ID
- Execute
- **✅ Verify all fields:**
  - `logo` → R2 URL
  - `businessCard` → R2 URL (if uploaded)
  - `categories` → Contains your category
  - `city` → Contains your city
  - `contact` → Shows contact info
  - `address` → Shows location
  - `owner` → Shows owner info

#### C. Get Business Media (GET `/businesses/{businessId}/media`)
- Enter business ID
- Execute
- **✅ Verify:** All uploaded media items show R2 URLs

#### D. Get Business Card (GET `/businesses/{businessId}/card`)
- Enter business ID
- Execute
- **✅ Verify:** Card URL and metadata

---

### STEP 5: Update Operations

#### A. Update Business (PATCH `/businesses/{id}`)
```json
{
  "description": "UPDATED: Premium automotive repair and maintenance services with certified technicians and 24/7 support",
  "tags": ["Auto Repair", "Maintenance", "Diagnostics", "24/7 Support"]
}
```
- **✅ Verify:** Updated fields in response

#### B. Replace Business Logo (POST `/businesses/{id}/logo`)
- Upload different logo
- **✅ Verify:** 
  - New R2 URL in response
  - Old logo should be deleted from R2

#### C. Replace Business Card (PUT `/businesses/{businessId}/card`)
- Upload different business card
- **✅ Verify:**
  - New R2 URL
  - Old card deleted from R2

---

### STEP 6: User Profile Testing

#### A. Upload User Avatar (POST `/users/me/avatar`)
1. Click "Try it out"
2. Choose profile image (JPEG, PNG, WebP, GIF, max 5MB)
3. Execute
4. **✅ Verify:** R2 URL in `avatarUrl`

#### B. Get My Profile (GET `/users/me`)
- Execute
- **✅ Verify:** Avatar shows R2 URL

---

### STEP 7: Advanced Features

#### A. Create Subscription Plan (POST `/subscription-plans`)
```json
{
  "name": "Premium Business Plan",
  "slug": "premium-business",
  "description": "Full-featured plan for professional businesses",
  "price": 99.99,
  "currency": "USD",
  "interval": "month",
  "intervalCount": 1,
  "features": [
    "Unlimited photos",
    "Priority listing",
    "Analytics dashboard",
    "Custom branding"
  ],
  "maxBusinesses": 5,
  "maxPhotos": 100,
  "maxVideos": 10,
  "priorityListing": true,
  "featuredListing": true,
  "analyticsAccess": true,
  "customBranding": true
}
```

#### B. Create Business Review (POST `/businesses/{id}/reviews`)
```json
{
  "rating": 5,
  "comment": "Excellent service! Professional team and great communication. Highly recommended for any automotive needs.",
  "title": "Outstanding Service"
}
```

#### C. Search Businesses (GET `/businesses/search`)
- Parameters:
  - `q`: "auto repair"
  - `categoryId`: Your category ID
  - `cityId`: Your city ID
- **✅ Verify:** Search results match

---

## 🎨 File Upload Tips

### Supported Formats

| Endpoint | Formats | Max Size |
|----------|---------|----------|
| User Avatar | JPEG, PNG, WebP, GIF | 5 MB |
| Category Icon | JPEG, PNG, WebP, SVG | 2 MB |
| City Hero Image | JPEG, PNG, WebP | 10 MB |
| Business Logo | JPEG, PNG, WebP, SVG | 5 MB |
| Business Media | Images, Videos, PDFs | 50 MB |
| Business Card | JPEG, PNG, WebP, PDF | 10 MB |

### Test Images
Create simple test images or use:
- Icons: 512x512 PNG
- Logos: 1024x1024 PNG with transparency
- Hero Images: 1920x1080 JPG
- Photos: Any web-optimized image

---

## ✅ Verification Checklist

- [ ] Login successful and token works
- [ ] Country created
- [ ] Category created
- [ ] Category icon uploaded to R2
- [ ] City created
- [ ] City hero image uploaded to R2
- [ ] Business created with all nested data
- [ ] Business logo uploaded to R2
- [ ] Multiple business media uploaded to R2
- [ ] Business card uploaded to R2
- [ ] Get all businesses returns data
- [ ] Get business by ID shows all details
- [ ] Update business works
- [ ] Replace logo deletes old file from R2
- [ ] Replace card deletes old file from R2
- [ ] User avatar uploaded to R2
- [ ] All R2 URLs are publicly accessible

---

## 🔍 Troubleshooting

**401 Unauthorized:**
- Re-login and get fresh token
- Re-authorize in Swagger with new token

**400 Validation Error:**
- Check required fields
- Verify data types (strings, numbers, UUIDs)
- Ensure nested objects are properly formatted

**404 Not Found:**
- Verify you're using correct IDs from previous responses
- Check entity exists (wasn't deleted)

**File Upload Fails:**
- Check file size limits
- Verify file format is supported
- Ensure you selected file before clicking Execute

**R2 URL Returns 404:**
- Wait a few seconds for R2 propagation
- Check URL doesn't have extra characters
- Verify upload actually succeeded

---

## 🎯 Expected R2 URL Pattern

All uploaded files should return URLs like:
```
https://pub-6dc36a6ecc6f401ca82ba7018f219494.r2.dev/{resource}/{id}/{type}/{filename}
```

Examples:
- Category: `.../categories/uuid/icon/filename.png`
- City: `.../cities/uuid/hero/filename.jpg`
- Business Logo: `.../businesses/uuid/logo/filename.png`
- Business Media: `.../businesses/uuid/images/filename.jpg`
- User Avatar: `.../users/uuid/avatar/filename.jpg`

---

## 📊 Test Data Created by Automated Script

If you want to use the data from the automated test:

- **Country ID:** `0c2280aa-99f9-4640-b93e-1754917be7ad`
- **Category ID:** `2e21d7d0-91cf-4fbd-af9c-9e6e5d6b12cf`
- **City ID:** `a61db570-b7d9-4d07-bcf4-5263e47ff26d`
- **Business ID:** `9dfa6552-6a0c-405b-80cf-2f42a08c899a`

You can use these IDs to test GET, PATCH, DELETE operations immediately!

---

**Happy Testing! 🚀**

All file uploads are integrated with Cloudflare R2 and will be automatically cleaned up when you delete entities.
